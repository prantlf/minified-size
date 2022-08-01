'use strict'

const minifyScriptWithBabel = require('babel-minify')
const { transform: transformWithESBuild } = require('esbuild')
const { minify: minifySwc } = require('@swc/core')
const { minify: minifyScriptWithTerser } = require('terser')
const { parse: parseStylesheet } = require('@prantlf/crass')
const { minify: minifyHtml } = require('html-minifier')
const { normalize } = require('path')
const glob = require('fast-glob')
const { gzip: gzipCompress, brotliCompress, constants: zlib } = require('zlib')
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

function getSourceInput (sources, index) {
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

function convertError ({ message, line, col }) {
  const error = { message }
  if (line) {
    error.message = message
    error.reason = message
    error.line = line
    error.column = col + 1
    return error
  }
  let match = /^.*:(\d+):(\d+): /m.exec(message)
  if (match) {
    const start = match.index
    const skip = match[0].length
    error.message = message.substr(start + skip)
    error.reason = error.message
    error.line = +match[1]
    error.column = +match[2] + 1
  } else {
    match = /\s*\((\d+):(\d+)\)/.exec(message)
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
      } else if (/Caused by:/.test(message)) {
        const [first, second] = message.split(/\r?\n/)
        error.reason = (first.trim() || second.trim()).replace(/\[[^ ]+/, '').trim()
        error.message = message
      }
    }
  }
  return error
}

function compressWithGzip (buffer, options) {
  return new Promise((resolve, reject) => {
    gzipCompress(buffer, options, (error, buffer) => {
      // istanbul ignore if
      if (error) {
        reject(error)
      } else {
        resolve(buffer)
      }
    })
  })
}

function compressWithBrotli (buffer, options) {
  return new Promise((resolve, reject) => {
    brotliCompress(buffer, options, (error, buffer) => {
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
  return source.replace(/\\u([\w]{4})/gi, (_match, code) =>
    String.fromCharCode(parseInt(code, 16)))
}

async function minifyJavaScript (source, minifier) {
  if (!minifier || minifier === 'swc') {
    const { code: minifiedSource } = await minifySwc(source,
      { compress: true, mangle: true })
    return minifiedSource
  }
  if (minifier === 'esbuild') {
    const { code: minifiedSource } = await transformWithESBuild(source,
      { minify: true, charset: 'utf8' })
    return minifiedSource
  }
  if (minifier === 'terser') {
    const { code: minifiedSource } = await minifyScriptWithTerser(source)
    return minifiedSource
  }
  if (minifier === 'babel') {
    const { code: minifiedSource } = minifyScriptWithBabel(source, {
    }, {
      sourceType: 'unambiguous',
      sourceMaps: false
    })
    return replaceEscapedUnicodeCharacters(minifiedSource)
  }
  throw new Error(`Unsupported minifier: "${minifier}"'`)
}

function minifyStylesheet (source) {
  const minifiedSource = parseStylesheet(source)
    .optimize({ o1: true, css4: true })
    .toString()
  return minifiedSource
}

function minifyPage (source) {
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

async function minifyByType (file, language, source, minifier) {
  const normalizedFile = file.toLowerCase()
  let minifiedSource
  if (normalizedFile.endsWith('.css') || language === 'css') {
    minifiedSource = minifyStylesheet(source)
  } else if (normalizedFile.endsWith('.html') || normalizedFile.endsWith('.htm') || language === 'html') {
    minifiedSource = minifyPage(source)
  } else {
    minifiedSource = await minifyJavaScript(source, minifier)
  }
  const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
  return minifiedBuffer
}

async function estimateGzippedSize (minifiedBuffer, gzip) {
  const params = typeof gzip === 'object' ? gzip : undefined
  const gzipOptions = Object.assign({ level: -1 }, params)
  const gzippedBuffer = await compressWithGzip(minifiedBuffer, gzipOptions)
  return gzippedBuffer.length
}

async function estimateBrotliedSize (minifiedBuffer, brotli) {
  const params = typeof brotli === 'object' ? brotli : undefined
  const brotliOptions = {
    params: Object.assign({
      [zlib.BROTLI_PARAM_MODE]: zlib.BROTLI_MODE_TEXT,
      [zlib.BROTLI_PARAM_QUALITY]: zlib.BROTLI_DEFAULT_QUALITY
    }, params)
  }
  const brotliedBuffer = await compressWithBrotli(minifiedBuffer, brotliOptions)
  return brotliedBuffer.length
}

async function estimateSizes (language, { file, source, size: originalSize, error }, gzip, brotli, minifier) {
  if (error) {
    return { file, error: convertError(error) }
  }
  try {
    const minifiedBuffer = await minifyByType(file, language, source, minifier)
    const minifiedSize = minifiedBuffer.length
    if (minifiedSize === 0) {
      throw new Error('Unknown minification error')
    }
    const [gzippedSize, brotliedSize] = await Promise.all([
      gzip !== false && estimateGzippedSize(minifiedBuffer, gzip),
      brotli !== false && estimateBrotliedSize(minifiedBuffer, brotli)
    ])
    const estimatedSizes = { file, originalSize, minifiedSize }
    if (typeof gzippedSize === 'number') {
      estimatedSizes.gzippedSize = gzippedSize
    }
    if (typeof brotliedSize === 'number') {
      estimatedSizes.brotliedSize = brotliedSize
    }
    return estimatedSizes
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

async function collectResults (language, generator, gzip, brotli, minifier) {
  const results = []
  for (;;) {
    const input = await generator.next()
    if (input.done) break
    results.push(await estimateSizes(language, input.value, gzip, brotli, minifier))
  }
  return results
}

async function getMinifiedSizes ({ language, files, streams, sources, gzip, brotli, minifier }) {
  ({ files, streams, sources } = await prepareInput(files, streams, sources))
  const inputGenerator = generateInput(files, streams, sources)
  return collectResults(language, inputGenerator, gzip, brotli, minifier)
}

async function * generateMinifiedSizes ({ language, files, streams, sources, gzip, brotli, minifier }) {
  ({ files, streams, sources } = await prepareInput(files, streams, sources))
  const generator = generateInput(files, streams, sources)
  for (;;) {
    const input = await generator.next()
    if (input.done) break
    yield estimateSizes(language, input.value, gzip, brotli, minifier)
  }
}

function computeTotalSizes (results) {
  const accumulator = { total: true, originalSize: 0, minifiedSize: 0, gzippedSize: 0, brotliedSize: 0 }
  for (const { error, originalSize, minifiedSize, gzippedSize, brotliedSize } of results) {
    if (!error) {
      accumulator.originalSize += originalSize
      accumulator.minifiedSize += minifiedSize
      if (gzippedSize) {
        accumulator.gzippedSize += gzippedSize
      }
      if (brotliedSize) {
        accumulator.brotliedSize += brotliedSize
      }
    }
  }
  if (!accumulator.gzippedSize) {
    delete accumulator.gzippedSize
  }
  if (!accumulator.brotliedSize) {
    delete accumulator.brotliedSize
  }
  return accumulator
}

getMinifiedSizes.getMinifiedSizes = getMinifiedSizes
getMinifiedSizes.generateMinifiedSizes = generateMinifiedSizes
getMinifiedSizes.computeTotalSizes = computeTotalSizes

module.exports = getMinifiedSizes
