'use strict'

const minifiedSize = require('..')
const { join } = require('path')
const test = require('tap')

function checkSuccess (test, script, results, gzip) {
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  const { file, originalSize, minifiedSize, gzippedSize } = result
  test.equal(file, script)
  test.ok(typeof originalSize === 'number')
  test.ok(typeof minifiedSize === 'number')
  // eslint-disable-next-line valid-typeof
  test.ok(typeof gzippedSize === (gzip ? 'number' : 'undefined'))
  test.end()
}

function checkError (test, script, results, parsing) {
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  const { file, error } = result
  test.equal(file, script)
  test.ok(typeof error === 'object')
  const { message, line, column } = error
  test.ok(typeof message === 'string')
  if (parsing) {
    test.equal(line, 1)
    test.equal(column, 10)
  }
  test.end()
}

test.test('checks input parameters', async test => {
  try {
    await minifiedSize()
    test.ok(false)
  } catch (error) {
    try {
      await minifiedSize({})
      test.ok(false)
    } catch (error) {
      test.ok(true)
    }
  }
  test.end()
})

test.test('supports file input', async test => {
  const script = 'lib/index.js'
  const results = await minifiedSize({ files: [ script ] })
  checkSuccess(test, script, results, true)
})

test.test('supports file input with a relative path and wildcards', async test => {
  const scripts = 'lib/*.js'
  const script = 'lib/index.js'
  const results = await minifiedSize({ files: [ scripts ] })
  checkSuccess(test, script, results, true)
})

test.test('supports file input with an absolute path and wildcards', async test => {
  const scripts = join(__dirname, '../lib/*.js')
  const script = join(__dirname, '../lib/index.js')
  const results = await minifiedSize({ files: [ scripts ] })
  checkSuccess(test, script, results, true)
})

test.test('reports directory listing error', async test => {
  const script = 'missing/*.js'
  const results = await minifiedSize({ files: [ script ] })
  checkError(test, script, results, false)
})

test.test('reports file reading error', async test => {
  const script = 'lib/missing.js'
  const results = await minifiedSize({ files: [ script ] })
  checkError(test, script, results, false)
})

test.test('supports string input', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [ script ] })
  checkSuccess(test, 'source1', results, true)
})

test.test('reports source parsing error', async test => {
  const script = 'function () { console.log("OK") }'
  const results = await minifiedSize({ sources: [ script ] })
  checkError(test, 'source1', results, true)
})

test.test('allows to disable gzipped size estimation', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [ script ], gzip: false })
  checkSuccess(test, 'source1', results, false)
})

test.test('reports invalid gzip options', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [ script ], gzip: { level: Infinity } })
  checkError(test, 'source1', results, false)
})
