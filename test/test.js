'use strict'

const minifiedSize = require('..')
const getMinifiedSizes = minifiedSize.getMinifiedSizes
const generateMinifiedSizes = minifiedSize.generateMinifiedSizes
const computeTotalSizes = minifiedSize.computeTotalSizes
const { constants: zlib } = require('zlib')
const { Readable } = require('stream')
const { join, normalize } = require('path')
const test = require('tap')

function checkSuccess (test, script, results, gzip, brotli, end) {
  test.ok(Array.isArray(results))
  test.equal(results.length, 1)
  const result = results[0]
  test.ok(typeof result === 'object')
  let { file, originalSize, minifiedSize, gzippedSize, brotliedSize } = result
  file = normalize(file)
  script = normalize(script)
  test.equal(file, script)
  test.ok(typeof originalSize === 'number')
  test.ok(typeof minifiedSize === 'number')
  // eslint-disable-next-line valid-typeof
  test.ok(typeof gzippedSize === (gzip ? 'number' : 'undefined'))
  // eslint-disable-next-line valid-typeof
  test.ok(typeof brotliedSize === (brotli ? 'number' : 'undefined'))
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
    test.ok(reason.length <= message.length)
    if (line) {
      test.equal(line, 1)
    } else {
      test.equal(line, undefined)
    }
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

test.test('exports normal functions and a generator', test => {
  test.ok(typeof minifiedSize === 'function')
  test.ok(typeof getMinifiedSizes === 'function')
  test.ok(typeof generateMinifiedSizes === 'function')
  test.end()
})

test.test('checks input parameters', async test => {
  try {
    await minifiedSize()
    test.ok(false)
  } catch {
    try {
      await minifiedSize({})
      test.ok(false)
    } catch {
      test.ok(true)
    }
  }
  test.end()
})

test.test('supports file input', async test => {
  const script = 'lib/index.js'
  const results = await minifiedSize({ files: [script] })
  checkSuccess(test, script, results, true, true)
})

test.test('supports file input with a relative path and wildcards', async test => {
  const scripts = 'lib/*.js'
  const script = 'lib/index.js'
  const results = await minifiedSize({ files: [scripts] })
  checkSuccess(test, script, results, true, true)
})

test.test('supports file input with an absolute path and wildcards', async test => {
  const scripts = join(__dirname, '../lib/*.js')
  const script = join(__dirname, '../lib/index.js')
  const results = await minifiedSize({ files: [scripts] })
  checkSuccess(test, script, results, true, true)
})

test.test('reports directory listing error', async test => {
  const script = 'missing/*.js'
  const results = await minifiedSize({ files: [script] })
  checkError(test, script, results, false)
})

test.test('reports file reading error', async test => {
  const script = 'lib/missing.js'
  const results = await minifiedSize({ files: [script] })
  checkError(test, script, results, false)
})

test.test('supports string input', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script] })
  checkSuccess(test, 'source1', results, true, true)
})

test.test('reports source parsing error with swc', async test => {
  const script = 'function () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'swc' })
  checkError(test, 'source1', results, true, true)
})

test.test('reports source parsing error with esbuild', async test => {
  const script = 'function () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'esbuild' })
  checkError(test, 'source1', results, true, true)
})

test.test('reports source parsing error with terser', async test => {
  const script = 'function () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'terser' })
  checkError(test, 'source1', results, true, true)
})

test.test('reports source parsing error with babel', async test => {
  const script = 'function () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'babel' })
  checkError(test, 'source1', results, true, true)
})

test.test('allows to disable gzipped size estimation', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], gzip: false })
  checkSuccess(test, 'source1', results, false, true)
})

test.test('allows to disable brotlied size estimation', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], brotli: false })
  checkSuccess(test, 'source1', results, true, false)
})

test.test('reports invalid gzip options', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], gzip: { level: Infinity }, brotli: false })
  checkError(test, 'source1', results, false, false)
})

test.test('reports invalid brotli options', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], gzip: false, brotli: { [zlib.BROTLI_PARAM_QUALITY]: 'dummy' } })
  checkError(test, 'source1', results, false, false)
})

test.test('supports swc as minifier for scripts', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'swc', gzip: false, brotli: false })
  checkSuccess(test, 'source1', results, false, false)
})

test.test('supports swc as minifier for modules', async test => {
  const script = 'export default { answer: 42 }'
  const results = await minifiedSize({ sources: [script], minifier: 'swc', gzip: false, brotli: false, sourceType: 'module' })
  checkSuccess(test, 'source1', results, false, false)
})

test.test('supports esbuild as minifier', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'esbuild', gzip: false, brotli: false })
  checkSuccess(test, 'source1', results, false, false)
})

test.test('supports terser as minifier', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'terser', gzip: false, brotli: false })
  checkSuccess(test, 'source1', results, false, false)
})

test.test('supports babel as minifier', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'babel', gzip: false, brotli: false })
  checkSuccess(test, 'source1', results, false, false)
})

test.test('reports an invalid minifier', async test => {
  const script = 'function test () { console.log("OK") }'
  const results = await minifiedSize({ sources: [script], minifier: 'invalid' })
  checkError(test, 'source1', results, false, false)
})

test.test('supports stream input', async test => {
  const stream = createStream('function test () { console.log("OK") }')
  const results = await minifiedSize({ streams: [stream] })
  checkSuccess(test, 'stream1', results, true, true)
})

test.test('reports stream reading error', async test => {
  const stream = createStream()
  const results = await minifiedSize({ streams: [stream] })
  checkError(test, 'stream1', results, false, false)
})

test.test('minifier recognizes Unicode line breaks as whitespace', async test => {
  const script = 'test/module.txt'
  const results = await minifiedSize({ files: [script] })
  checkSuccess(test, script, results, true, true)
})

test.test('swc does not escape Unicode characters', async test => {
  const script = 'message = "䅬朤堾..."'
  const results = await minifiedSize({ sources: [script], minifier: 'swc' })
  checkSuccess(test, 'source1', results, true, true, false)
  const { originalSize, minifiedSize: smallerSize } = results[0]
  test.ok(originalSize >= smallerSize)
})

test.test('esbuild does not escape Unicode characters', async test => {
  const script = 'message = "䅬朤堾..."'
  const results = await minifiedSize({ sources: [script], minifier: 'esbuild' })
  checkSuccess(test, 'source1', results, true, true, false)
  const { originalSize, minifiedSize: smallerSize } = results[0]
  test.ok(originalSize >= smallerSize)
})

test.test('terser does not escape Unicode characters', async test => {
  const script = 'message = "䅬朤堾..."'
  const results = await minifiedSize({ sources: [script], minifier: 'terser' })
  checkSuccess(test, 'source1', results, true, true, false)
  const { originalSize, minifiedSize: smallerSize } = results[0]
  test.ok(originalSize >= smallerSize)
})

test.test('babel does not escape Unicode characters', async test => {
  const script = 'message = "䅬朤堾..."'
  const results = await minifiedSize({ sources: [script], minifier: 'babel' })
  checkSuccess(test, 'source1', results, true, true, false)
  const { originalSize, minifiedSize: smallerSize } = results[0]
  test.ok(originalSize >= smallerSize)
})

test.test('recognizes a stylesheet by its file extension', async test => {
  const stylesheet = 'test/stylesheet.css'
  const results = await minifiedSize({ files: [stylesheet] })
  checkSuccess(test, stylesheet, results, true, true)
})

test.test('forces the stylesheet-mode by a parameter', async test => {
  const stylesheet = '.button { padding: 1em }'
  const results = await minifiedSize({ language: 'css', sources: [stylesheet] })
  checkSuccess(test, 'source1', results, true, true)
})

test.test('reports stylesheet parsing error', async test => {
  const script = '.button padding: 1em'
  const results = await minifiedSize({ language: 'css', sources: [script] })
  checkError(test, 'source1', results, true, true)
})

test.test('reports minification error if an empty output is returned', async test => {
  const script = '.button { padding: }'
  const results = await minifiedSize({ language: 'css', sources: [script] })
  checkError(test, 'source1', results, false, false)
})

test.test('recognizes a web page by its file extension', async test => {
  const page = 'test/page.html'
  const results = await minifiedSize({ files: [page] })
  checkSuccess(test, page, results, true, true)
})

test.test('forces the web-page-mode by a parameter', async test => {
  const page = '<html lang="en"></html>'
  const results = await minifiedSize({ language: 'html', sources: [page] })
  checkSuccess(test, 'source1', results, true, true)
})

test.test('reports web page parsing error', async test => {
  const page = '<html lang="en"'
  const results = await minifiedSize({ language: 'html', sources: [page] })
  checkError(test, 'source1', results, false, false)
})

test.test('works as a generator too', async test => {
  const generator = generateMinifiedSizes({ files: ['test/*'] })
  for (;;) {
    const result = await generator.next()
    if (result.done) {
      break
    }
    checkSuccess(test, result.value.file, [result.value], true, true, false)
  }
  test.end()
})

test.test('computes total sizes from successful results', test => {
  const total = computeTotalSizes([
    { originalSize: 3, minifiedSize: 2, gzippedSize: 1, brotliedSize: 4 },
    { error: {} },
    { originalSize: 30, minifiedSize: 20, gzippedSize: 10, brotliedSize: 40 }
  ])
  test.ok(total)
  test.ok(total.total === true)
  test.ok(total.originalSize === 33)
  test.ok(total.minifiedSize === 22)
  test.ok(total.gzippedSize === 11)
  test.ok(total.brotliedSize === 44)
  test.end()
})

test.test('computes total sizes without gzipped and brotlied sizes', test => {
  const total = computeTotalSizes([
    { originalSize: 3, minifiedSize: 2 },
    { originalSize: 30, minifiedSize: 20 }
  ])
  test.ok(total)
  test.ok(total.total === true)
  test.ok(total.originalSize === 33)
  test.ok(total.minifiedSize === 22)
  test.end()
})
