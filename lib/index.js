'use strict'

const minifyScript = require('babel-minify')
const { parse: parseStylesheet } = require('crass')
const { minify: minifyPage } = require('html-minifier')
const { normalize } = require('path')
const glob = require('fast-glob')
const zlib = require('zlib')
const { promisify } = require('util')
let { readFile } = require('fs')

readFile = promisify(readFile)
const push = Array.prototype.push

function measureSource (source) {
  const buffer = Buffer.from(source, 'utf-8')
  return buffer.length
}

async function globFiles (file) {
  const paths = await glob(file)
  if (!paths.length) {
    const error = { message: 'File not found.' }
    return [ { file, error } ]
  }
  return paths.map(path => {
    return { file: normalize(path) }
  })
}

async function findFiles (files) {
  const results = []
  for (let file of files) {
    let result
    try {
      result = await globFiles(file)
    } catch (error) {
      // istanbul ignore next
      result = [ { file, error } ]
    }
    push.apply(results, result)
  }
  return results
}

async function readFiles (files) {
  const results = []
  for (let { file, error } of files) {
    let result
    if (error) {
      result = { file, error }
    } else {
      try {
        let source = await readFile(file)
        const size = source.length
        source = source.toString('utf-8')
        result = { file, source, size }
      } catch (error) {
        // istanbul ignore next
        result = { file, error }
      }
    }
    results.push(result)
  }
  return results
}

function readContent (stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream
      .setEncoding('utf8')
      .on('data', chunk => chunks.push(chunk))
      .on('end', () => resolve(chunks.join('')))
      .on('error', error => reject(error))
  })
}

async function loadStreams (streams) {
  const results = []
  for (let i = 0, length = streams.length; i < length; ++i) {
    const file = 'stream' + (i + 1)
    let result
    try {
      const source = await readContent(streams[i])
      const size = measureSource(source)
      result = { file, source, size }
    } catch (error) {
      // istanbul ignore next
      result = { file, error }
    }
    results.push(result)
  }
  return results
}

function collectSources (sources) {
  return sources.map((source, index) => {
    const file = 'source' + (index + 1)
    const size = measureSource(source)
    return { file, source, size }
  })
}

function convertError ({ message }) {
  const error = { message }
  let match = /\s*\((\d+):(\d+)\)/.exec(message)
  if (match) {
    const start = match.index
    const skip = match[0].length
    error.message = message.substr(0, start) + message.substr(start + skip)
    error.reason = error.message.replace(/\n.*/g, '')
    error.line = +match[1]
    error.column = +match[2] + 1
  } else {
    match = /Parse error on line (\d+)/.exec(message)
    if (match) {
      const start = match.index
      const skip = match[0].length
      error.reason = 'Stylesheet parsing error'
      error.message = message.substr(0, start) + error.reason + message.substr(start + skip)
      error.line = +match[1]
    }
  }
  return error
}

function deflate (buffer, options) {
  return new Promise((resolve, reject) => {
    zlib.deflate(buffer, options, (error, buffer) => {
      // istanbul ignore if
      if (error) {
        reject(error)
      } else {
        resolve(buffer)
      }
    })
  })
}

function replaceEscapedUnicodeCharacters (source) {
  return source.replace(/\\u([\w]{4})/gi, (match, code) =>
    String.fromCharCode(parseInt(code, 16)))
}

function estimateJavaScript ({ source }) {
  let minifiedSource
  try {
    ({ code: minifiedSource } = minifyScript(source, {
    }, {
      sourceType: 'unambiguous',
      sourceMaps: false
    }))
  } catch (error) {
    return { minifyError: convertError(error) }
  }
  minifiedSource = replaceEscapedUnicodeCharacters(minifiedSource)
  const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
  return { minifiedBuffer }
}

function estimateStylesheet ({ source }) {
  let minifiedSource
  try {
    minifiedSource = parseStylesheet(source)
      .optimize({ o1: true, css4: true })
      .toString()
  } catch (error) {
    return { minifyError: convertError(error) }
  }
  const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
  return { minifiedBuffer }
}

function estimatePage ({ source }) {
  let minifiedSource
  try {
    minifiedSource = minifyPage(source, {
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      conservativeCollapse: true,
      decodeEntities: true,
      html5: true,
      quoteCharacter: '"',
      removeAttributeQuotes: true,
      removeComments: true,
      removeRedundantAttributes: true
    })
  } catch (error) {
    return { minifyError: convertError(error) }
  }
  const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
  return { minifiedBuffer }
}

async function estimateSizes (language, { file, source, size: originalSize, error }, gzip) {
  if (error) {
    return { file, error: convertError(error) }
  }
  let minifiedBuffer, minifyError
  const normalizedFile = file.toLowerCase()
  if (normalizedFile.endsWith('.css') || language === 'css') {
    ({ minifiedBuffer, minifyError } = estimateStylesheet({ source }))
  } else if (normalizedFile.endsWith('.html') || normalizedFile.endsWith('.htm') || language === 'html') {
    ({ minifiedBuffer, minifyError } = estimatePage({ source }))
  } else {
    ({ minifiedBuffer, minifyError } = estimateJavaScript({ source }))
  }
  if (minifyError) {
    return { file, error: minifyError }
  }
  const minifiedSize = minifiedBuffer.length
  if (minifiedSize === 0) {
    return { file, error: new Error('Unknown minification error') }
  }
  if (gzip === false) {
    return { file, originalSize, minifiedSize }
  }
  try {
    const gzipOptions = typeof gzip === 'object' ? gzip : { level: 9 }
    const gzippedBuffer = await deflate(minifiedBuffer, gzipOptions)
    const gzippedSize = gzippedBuffer.length
    return { file, originalSize, minifiedSize, gzippedSize }
  } catch (gzipError) {
    return { file, error: convertError(gzipError) }
  }
}

async function processResults (language, results, gzip) {
  for (let i = 0, length = results.length; i < length; ++i) {
    results[i] = await estimateSizes(language, results[i], gzip)
  }
  return results
}

async function minifiedSize ({ language, files, streams, sources, gzip }) {
  const results = []
  if (files) {
    files = await findFiles(files)
    files = await readFiles(files)
    push.apply(results, files)
  }
  if (streams) {
    streams = await loadStreams(streams)
    push.apply(results, streams)
  }
  if (sources) {
    sources = collectSources(sources)
    push.apply(results, sources)
  }
  if (!results.length) {
    throw new Error('Files or sources missing.')
  }
  return processResults(language, results, gzip)
}

module.exports = minifiedSize
