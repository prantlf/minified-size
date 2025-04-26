#!/usr/bin/env node

const { program } = require('commander')
const { getMinifiedSizes, generateMinifiedSizes, computeTotalSizes } = require('..')
const prettyBytes = require('pretty-bytes')
const { magenta, red } = require('colorette')
const pkg = require('../package.json')

program
  .version(pkg.version)
  .description(pkg.description)
  .usage('[options] <file>, ... | --')
  .option('-l, --language <name>', 'specifies the input language', 'js')
  .option('-j, --json', 'print results in the JSON format')
  .option('-r, --raw-sizes', 'print sizes in bytes as integers')
  .option('-o, --no-original-size', 'prevents printing the size of the original code')
  .option('-m, --no-minified-size', 'prevents printing the size of the minified code')
  .option('-g, --no-gzipped-size', 'prevents printing the size of the gzipped code')
  .option('-b, --no-brotlied-size', 'prevents printing the size of the brotlied code')
  .option('-s, --source-type <type>', 'sets JavaScript source type (module or script)')
  .option('-t, --no-total', 'prevents printing the total sizes')
  .option('-i, --minifier <minifier>', 'chooses the JavaScript minifier', 'swc')
  .argument('<file...>')
  .on('--help', () => {
    console.log()
    console.log('  All four sizes are estimated by default. File paths may contain wildcards.')
    console.log('  If "--" is entered instead of files, the standard input will be read.')
    console.log('  Stylesheets are recognized by the extension ".css", or they can be forced')
    console.log('  by the language "css" on the command line. Web pages are recognized by the')
    console.log('  extension ".htm[l]", or they can be forced by the language "html".')
    console.log('  The JavaScript minifier can be "swc", "esbuild", "terser" or "babel".')
    console.log()
    console.log('  Examples:')
    console.log()
    console.log('    $ minified-size lib/index.js')
    console.log('    $ minified-size --json assets/*.css')
    console.log('    $ cat public/index.html | minified-size --language=html --')
  })

const args = process.argv
program.parse(args)
const files = program.args
let streams
if (!files.length) {
  if (args[args.length - 1] === '--') {
    streams = [process.stdin]
  } else {
    program.help()
  }
}

const {
  language, json, total: printTotal, rawSizes, originalSize: printOriginalSize,
  minifiedSize: printMinifiedSize, gzippedSize: printGzippedSize,
  brotliedSize: printBrotliedSize, minifier, sourceType
} = program.opts()

function printError (file, { message, line, column }) {
  let prefix = file
  // Use the error location returned by babel-minify and crass (only line).
  if (line) {
    prefix += `(${line}`
    if (column) {
      prefix += `,${column}`
    }
    prefix += ')'
  }
  // Colourise Jison-formatted error message from crass.
  if (line && !column) {
    message = message
      .split('\n')
      .map((line, index) => index > 1 ? red(line) : line)
      .join('\n')
  }
  prefix = magenta(`${prefix}:`)
  console.log(`${prefix} ${message}`)
}

function printResult ({ error, file, originalSize, minifiedSize, gzippedSize, brotliedSize }) {
  if (error) {
    printError(file, error)
  } else {
    let sizes = []
    if (printOriginalSize) {
      sizes.push(originalSize)
    }
    if (printMinifiedSize) {
      sizes.push(minifiedSize)
    }
    if (printGzippedSize) {
      sizes.push(gzippedSize)
    }
    if (printBrotliedSize) {
      sizes.push(brotliedSize)
    }
    if (!rawSizes) {
      sizes = sizes.map(prettyBytes)
    }
    sizes = sizes.join(', ')
    console.log(`${file}: ${sizes}`)
  }
}

(async () => {
  const options = {
    language,
    files,
    streams,
    gzip: printGzippedSize,
    brotli: printBrotliedSize,
    minifier,
    sourceType
  }
  if (json) {
    const results = await getMinifiedSizes(options)
    if (printTotal && results.length > 1) {
      results.push(computeTotalSizes(results))
    }
    console.log(JSON.stringify(results, undefined, 2))
  } else {
    const generator = generateMinifiedSizes(options)
    for (const results = []; ;) {
      const result = await generator.next()
      if (result.done) {
        if (printTotal && results.length > 1) {
          printResult({ file: 'total', ...computeTotalSizes(results) })
        }
        break
      }
      results.push(result.value)
      printResult(result.value)
    }
  }
})()
