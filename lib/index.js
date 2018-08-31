'use strict'

const { minify } = require('terser')
const { parse } = require('path')
const glob = require('tiny-glob')
const zlib = require('zlib')
const { promisify } = require('util')
let { readFile } = require('fs')

readFile = promisify(readFile)

async function findFiles (files) {
  const results = []
  for (let file of files) {
    try {
      const { root: fileRoot } = parse(file)
      const paths = await glob(file, { cwd: fileRoot || '.' })
      if (paths.length) {
        for (let path of paths) {
          const { root: pathRoot } = parse(path)
          if (!pathRoot && fileRoot) {
            path = fileRoot + path
          }
          results.push({ file: path })
        }
      } else {
        const error = { message: 'File not found.' }
        results.push({ file, error })
      }
    } catch (error) {
      results.push({ file, error })
    }
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

function collectSources (sources) {
  return sources.map((source, index) => {
    const file = 'source' + (index + 1)
    const buffer = Buffer.from(source, 'utf-8')
    const size = buffer.length
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

async function minifiedSize ({ files, sources, gzip }) {
  let results
  if (files) {
    files = await findFiles(files)
    results = await readFiles(files)
  } else if (sources) {
    results = collectSources(sources)
  } else {
    throw new Error('Files or sources missing.')
  }
  return processResults(results, gzip)
}

module.exports = minifiedSize
