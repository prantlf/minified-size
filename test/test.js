'use strict'

const minifiedSize = require('..')
const { join } = require('path')
const test = require('tap')

function checkResults (test, script, results) {
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  const { file, size, minifiedSize } = result
  test.equal(file, script)
  test.ok(typeof size === 'number')
  test.ok(typeof minifiedSize === 'number')
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
  const script = join(__dirname, '../lib/index.js')
  const results = await minifiedSize({ files: [ script ] })
  checkResults(test, script, results)
})

test.test('reports file reading error', async test => {
  const script = join(__dirname, '../lib/missing.js')
  const results = await minifiedSize({ files: [ script ] })
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  const { file, error } = result
  test.equal(file, script)
  test.ok(typeof error === 'object')
  const { message } = error
  test.ok(typeof message === 'string')
  test.end()
})

test.test('supports string input', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [ script ] })
  checkResults(test, 'source1', results)
})

test.test('reports source parsing error', async test => {
  const script = 'function () { console.log("OK") }'
  const results = await minifiedSize({ sources: [ script ] })
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  const { file, error } = result
  test.equal(file, 'source1')
  test.ok(typeof error === 'object')
  const { message, line, column } = error
  test.ok(typeof message === 'string')
  test.equal(line, 1)
  test.equal(column, 10)
  test.end()
})
