'use strict'

const { minify } = require('terser')
const { promisify } = require('util')
let { readFile } = require('fs')

readFile = promisify(readFile)

async function readFiles (files) {
  const results = []
  for (let i = 0, length = files.length; i < length; ++i) {
    const file = files[i]
    let result
    try {
      let source = await readFile(file)
      const size = source.length
      source = source.toString('utf-8')
      result = { file, source, size }
    } catch (error) {
      result = { file, error }
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

function processResults (results) {
  return results.map(({ file, source, size, error }) => {
    if (error) {
      return { file, error: convertError(error) }
    }
    const { error: minifyError, code: minifiedSource } = minify(source)
    if (minifyError) {
      return { file, error: convertError(minifyError) }
    }
    const minifiedBuffer = Buffer.from(minifiedSource, 'utf-8')
    const minifiedSize = minifiedBuffer.length
    return { file, size, minifiedSize }
  })
}

async function minifiedSize ({ files, sources }) {
  let results
  if (files) {
    results = await readFiles(files)
  } else if (sources) {
    results = collectSources(sources)
  } else {
    throw new Error('Files or sources missing.')
  }
  return processResults(results)
}

module.exports = minifiedSize
