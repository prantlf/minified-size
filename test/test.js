'use strict'

const minifiedSize = require('..')
const { Readable } = require('stream')
const { join, normalize } = require('path')
const test = require('tap')

function checkSuccess (test, script, results, gzip, end) {
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  let { file, originalSize, minifiedSize, gzippedSize } = result
  file = normalize(file)
  script = normalize(script)
  test.equal(file, script)
  test.ok(typeof originalSize === 'number')
  test.ok(typeof minifiedSize === 'number')
  // eslint-disable-next-line valid-typeof
  test.ok(typeof gzippedSize === (gzip ? 'number' : 'undefined'))
  if (end !== false) {
    test.end()
  }
}

function checkError (test, script, results, parsing, end) {
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  let { file, error } = result
  file = normalize(file)
  script = normalize(script)
  test.equal(file, script)
  test.ok(typeof error === 'object')
  const { message, reason, line, column } = error
  test.ok(typeof message === 'string')
  if (parsing) {
    test.ok(typeof reason === 'string')
    test.ok(reason.length < message.length)
    test.equal(line, 1)
    if (column) {
      test.equal(column, 10)
    } else {
      test.equal(column, undefined)
    }
  }
  if (end !== false) {
    test.end()
  }
}

function createStream (content) {
  return new Readable({
    read () {
      if (!content) {
        this.emit('error', new Error('Nothing to read.'))
      } else {
        this.push(content)
        this.push(null)
      }
    }
  })
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

test.test('supports stream input', async test => {
  const stream = createStream('function test () { console.log("OK") }')
  const results = await minifiedSize({ streams: [ stream ] })
  checkSuccess(test, 'stream1', results, true)
})

test.test('reports stream reading error', async test => {
  const stream = createStream()
  const results = await minifiedSize({ streams: [ stream ] })
  checkError(test, 'stream1', results, false)
})

test.test('minifier recognizes Unicode line breaks as whitespace', async test => {
  const script = 'test/module.txt'
  const results = await minifiedSize({ files: [ script ] })
  checkSuccess(test, script, results, true)
})

test.test('minifier does not escape Unicode characters', async test => {
  const script = 'message = "䅬朤堾..."'
  const results = await minifiedSize({ sources: [ script ] })
  checkSuccess(test, 'source1', results, true, false)
  const { originalSize, minifiedSize: smallerSize } = results[0]
  test.ok(originalSize > smallerSize)
})

test.test('recognizes a stylesheet by its file extension', async test => {
  const stylesheet = 'test/stylesheet.css'
  const results = await minifiedSize({ files: [ stylesheet ] })
  checkSuccess(test, stylesheet, results, true)
})

test.test('forces the stylesheet-mode by a parameter', async test => {
  const stylesheet = '.button { padding: 1em }'
  const results = await minifiedSize({ language: 'css', sources: [ stylesheet ] })
  checkSuccess(test, 'source1', results, true)
})

test.test('reports stylesheet parsing error', async test => {
  const script = '.button padding: 1em'
  const results = await minifiedSize({ language: 'css', sources: [ script ] })
  checkError(test, 'source1', results, true)
})
