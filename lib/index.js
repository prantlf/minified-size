'use strict'

const minifyScript = require('babel-minify')
const { parse: parseStylesheet } = require('@prantlf/crass')
const { minify: minifyHtml } = require('html-minifier')
const { normalize } = require('path')
const glob = require('fast-glob')
const zlib = require('zlib')
const { promisify } = require('util')
let { readFile } = require('fs')

readFile = promisify(readFile)
const push = Array.prototype.push

async function globFiles (file) {
  const paths = await glob(file)
  if (!paths.length) {
    const error = { message: 'File not found.' }
    return [{ file, error }]
  }
  return paths.map(path => {
    return { file: normalize(path) }
  })
}

async function findFiles (files) {
  const results = []
  for (const file of files) {
    let result
    try {
      result = await globFiles(file)
    } catch (error) {
      // istanbul ignore next
      result = [{ file, error }]
    }
    push.apply(results, result)
  }
  return results
}

function measureSource (source) {
  const buffer = Buffer.from(source, 'utf-8')
  return buffer.length
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

async function readFileInput (file) {
  let result
  try {
    let source = await readFile(file)
    const size = source.length
    source = source.toString('utf-8')
    result = { file, source, size }
  } catch (error) {
    // istanbul ignore next
    result = { file, error }
  }
  return result
}

async function loadStreamInput (streams, index) {
  const file = 'stream' + (index + 1)
  let result
  try {
    const source = await readContent(streams[index])
    const size = measureSource(source)
    result = { file, source, size }
  } catch (error) {
    // istanbul ignore next
    result = { file, error }
  }
  return result
}

async function getSourceInput (sources, index) {
  const source = sources[index]
  const file = 'source' + (index + 1)
  const size = measureSource(source)
  return { file, source, size }
}

async function * generateInput (files, streams, sources) {
  for (const { file, error } of files) {
    if (error) {
      yield { file, error }
    } else {
      yield readFileInput(file)
    }
  }
  for (let i = 0, length = streams.length; i < length; ++i) {
    yield loadStreamInput(streams, i)
  }
  for (let i = 0, length = sources.length; i < length; ++i) {
    yield getSourceInput(sources, i)
  }
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

function minifyJavaScript ({ source }) {
  const { code: minifiedSource } = minifyScript(source, {
  }, {
    sourceType: 'unambiguous',
    sourceMaps: false
  })
  return replaceEscapedUnicodeCharacters(minifiedSource)
}

function minifyStylesheet ({ source }) {
  const minifiedSource = parseStylesheet(source)
    .optimize({ o1: true, css4: true })
    .toString()
  return minifiedSource
}

function minifyPage ({ source }) {
  const minifiedSource = minifyHtml(source, {
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
  return minifiedSource
}

function minifyByType ({ file, language, source }) {
  const normalizedFile = file.toLowerCase()
  let minifiedSource
  if (normalizedFile.endsWith('.css') || language === 'css') {
    minifiedSource = minifyStylesheet({ source })
  } else if (normalizedFile.endsWith('.html') || normalizedFile.endsWith('.htm') || language === 'html') {
    minifiedSource = minifyPage({ source })
  } else {
    minifiedSource = minifyJavaScript({ source })
  }
  const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
  return minifiedBuffer
}

async function estimateCompressedSize ({ minifiedBuffer, gzip }) {
  const gzipOptions = typeof gzip === 'object' ? gzip : { level: 9 }
  const gzippedBuffer = await deflate(minifiedBuffer, gzipOptions)
  return gzippedBuffer.length
}

async function estimateSizes (language, { file, source, size: originalSize, error }, gzip) {
  if (error) {
    return { file, error: convertError(error) }
  }
  try {
    const minifiedBuffer = minifyByType({ file, language, source })
    const minifiedSize = minifiedBuffer.length
    if (minifiedSize === 0) {
      throw new Error('Unknown minification error')
    }
    const estimatedSizes = { file, originalSize, minifiedSize }
    if (gzip === false) {
      return estimatedSizes
    }
    const gzippedSize = await estimateCompressedSize({ gzip, minifiedBuffer })
    return { gzippedSize, ...estimatedSizes }
  } catch (error) {
    return { file, error: convertError(error) }
  }
}

async function prepareInput (files, streams, sources) {
  files = files ? await findFiles(files) : []
  streams || (streams = [])
  sources || (sources = [])
  if (!(files.length || streams.length || sources.length)) {
    throw new Error('Input files, streams or sources missing.')
  }
  return { files, streams, sources }
}

async function collectResults (language, generator, gzip) {
  const results = []
  for (;;) {
    const input = await generator.next()
    if (input.done) {
      break
    }
    results.push(await estimateSizes(language, input.value, gzip))
  }
  return results
}

async function getMinifiedSizes ({ language, files, streams, sources, gzip }) {
  ({ files, streams, sources } = await prepareInput(files, streams, sources))
  const inputGenerator = generateInput(files, streams, sources)
  return collectResults(language, inputGenerator, gzip)
}

async function * generateMinifiedSizes ({ language, files, streams, sources, gzip }) {
  ({ files, streams, sources } = await prepareInput(files, streams, sources))
  const generator = generateInput(files, streams, sources)
  for (;;) {
    const input = await generator.next()
    if (input.done) {
      break
    }
    yield estimateSizes(language, input.value, gzip)
  }
}

getMinifiedSizes.getMinifiedSizes = getMinifiedSizes
getMinifiedSizes.generateMinifiedSizes = generateMinifiedSizes

module.exports = getMinifiedSizes
