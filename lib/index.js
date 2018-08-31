'use strict'

const { minify } = require('terser')
const { parse, normalize, sep } = require('path')
const glob = require('tiny-glob')
const zlib = require('zlib')
const { promisify } = require('util')
let { readFile } = require('fs')

readFile = promisify(readFile)
const push = Array.prototype.push

function measureSource (source) {
  const buffer = Buffer.from(source, 'utf-8')
  return buffer.length
}

function denormalize (file) {
  // istanbul ignore if
  if (sep === '\\') {
    file = file.replace(/\\/g, '/')
  }
  return file
}

async function globFiles (file) {
  const fullPath = denormalize(file)
  const { root: fileRoot } = parse(fullPath)
  const relativePath = fileRoot ? fullPath.substr(fileRoot.length) : fullPath
  const paths = await glob(relativePath, { cwd: fileRoot || '.' })
  if (!paths.length) {
    const error = { message: 'File not found.' }
    return [ { file, error } ]
  }
  return paths.map(path => {
    const { root: pathRoot } = parse(path)
    if (!pathRoot && fileRoot) {
      path = fileRoot + path
    }
    path = normalize(path)
    return { file: path }
  })
}

async function findFiles (files) {
  const results = []
  for (let file of files) {
    let result
    try {
      result = await globFiles(file)
    } catch (error) {
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

function convertError ({ message, line, col }) {
  return { message, line, column: col + 1 }
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

async function estimateSizes ({ file, source, size: originalSize, error }, gzip) {
  if (error) {
    return { file, error: convertError(error) }
  }
  const { error: minifyError, code: minifiedSource } = minify(source)
  if (minifyError) {
    return { file, error: convertError(minifyError) }
  }
  const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
  const minifiedSize = minifiedBuffer.length
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

async function processResults (results, gzip) {
  for (let i = 0, length = results.length; i < length; ++i) {
    results[i] = await estimateSizes(results[i], gzip)
  }
  return results
}

async function minifiedSize ({ files, streams, sources, gzip }) {
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
  return processResults(results, gzip)
}

module.exports = minifiedSize
