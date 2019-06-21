# minified-size
[![NPM version](https://badge.fury.io/js/minified-size.png)](http://badge.fury.io/js/minified-size)
[![Build Status](https://travis-ci.org/prantlf/minified-size.png)](https://travis-ci.org/prantlf/minified-size)
[![Coverage Status](https://coveralls.io/repos/github/prantlf/minified-size/badge.svg?branch=master)](https://coveralls.io/github/prantlf/minified-size?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/8c076180afca4376bfd23726b000eb53)](https://www.codacy.com/app/prantlf/minified-size?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=prantlf/minified-size&amp;utm_campaign=Badge_Grade)
[![Dependency Status](https://david-dm.org/prantlf/minified-size.svg)](https://david-dm.org/prantlf/minified-size)
[![devDependency Status](https://david-dm.org/prantlf/minified-size/dev-status.svg)](https://david-dm.org/prantlf/minified-size#info=devDependencies)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/minified-size.png?downloads=true&stars=true)](https://www.npmjs.com/package/minified-size)

Estimates the size of minified and gzipped JavaScript or Stylesheet files. Check, how much space will a particular script take in the minified output.

- [Command-line Usage](#command-line-usage)
- [Programmatic Usage](#programmatic-usage)
- [Contributing](#contributing)
- [Release History](#release-history)
- [License](#license)

## Command-line Usage

Make sure that you have [Node.js] >= 8 installed. Install the `minified-size` package globally:

```text
$ npm install -g minified-size
```

Print the original, expected minified and gzipped sizes of a sample file:

```text
$ minified-size lib/index.js
lib/index.js: 2.54 kB, 1.48 kB, 643 B
```

Running `minified-size` without any parameters will print usage instructions:

```text
  Usage: minified-size [options] <file>, ... | --

  Options:

    -V, --version           output the version number
    -l, --language [name]   specifies the input language (default: "js")
    -j, --json              print results in the JSON format
    -r, --raw-sizes         print sizes in bytes as integers
    -o, --no-original-size  prevents printing the size of the original code
    -m, --no-minified-size  prevents printing the size of the minified code
    -g, --no-gzipped-size   prevents printing the size of the gzipped code
    -h, --help              output usage information

  All three sizes are estimated by default. File paths may contain wildcards.
  If "--" is entered instead of files, the standard input will be read.
  Stylesheets are recognized by the extension ".css", or they can be forced
  by the language "css" in the command line.
```

### Errors

If parsing of the input or its minification fails, a colourful error message with additional information will be printed instead of the computed sizes. For example, a typo "exort" instead of "ex**p**ort":

```text
$ minified-size test/invalid.js
test/module.txt(1,7): unknown: Unexpected token, expected ";"

> 1 | exort default {
    |       ^
  2 |   "compressed": "
  3 | "
  4 | }` } ]
```

## Programmatic Usage

Make sure that you use [Node.js] >= 8. Install the `minified-size` package locally:

```bash
npm install --save minified-size
```

Get the original, expected minified and gzipped sizes (in bytes) of a sample file:

```javascript
const minifiedSize = require('minified-size')
const files = [ 'lib/index.js' ]
const results = await minifiedSize({ files })
// [ { file: 'lib/index.js',
//     originalSize: 2544,
//     minifiedSize: 1482,
//     gzippedSize: 643 } ]
```

### Options

* `files` - an array of strings with file paths to load and process
* `streams` - an array of readable streams with source code to process
* `sources` - an array of strings with source code to process
* `gzip` - a boolean to disable estimating the gzipped output size, or an object with [options for gzip].

### Errors

If parsing of the input or its minification fails, the returned object will contain an `error` key instead of the computed sizes:

```javascript
const minifiedSize = require('minified-size')
const files = [ 'test/invalid.js' ]
const results = await minifiedSize({ files })
// [ { file: 'test/invalid.js',
//     error: {
//       reason: 'unknown: Unexpected token, expected ";"',
//       line: 1,
//       column: 7,
//       message: `test/module.txt(1,7): unknown: Unexpected token, expected ";"
//
// > 1 | exort default {
//     |       ^
//   2 |   "compressed": "
//   3 | "
//   4 | }` } ]
```

## Unicode

Let us say, that you minify scripts using UTF-8 literals a lot:

```js
message = "䅬朤堾..."
```

If you run such input through 'babel-minify`, for example, you may become a lot bigger output instead of a smaller one, because it escapes non-latin characters:

```js
message="\u416C\u6724\u583E\u605B\u0825\u6120\u4C20..."
```

Look for an option, that will make your minifier retain the Unicode literals unchanged, or converts all escaped Unicode code points to literals. You could also post-process the minified output yourself by the following method:

```js
function replaceEscapedUnicodeCharacters (source) {
  return source.replace(/\\u([\w]{4})/gi, (match, code) =>
    String.fromCharCode(parseInt(code, 16)))
}
```

The size computation done by `minified-size` uses the function above to ensure correct results until the issue [babel-minify/619] is resolved.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## Release History

* 2019-06-21   v1.2.0   Support stylesheets
* 2019-06-20   v1.0.0   Support full Unicode and print better error messages
* 2018-08-31   v0.2.2   Support Windows paths
* 2018-08-31   v0.2.0   Support source code read from standard input
* 2018-08-31   v0.1.0   Support wildcards in the input file paths
* 2018-08-31   v0.0.1   Initial release

## License

Copyright (c) 2018-2019 Ferdinand Prantl

Licensed under the MIT license.

[Node.js]: http://nodejs.org/
[options for gzip]: https://nodejs.org/docs/latest-v8.x/api/zlib.html#zlib_class_options
[babel-minify/619]: https://github.com/babel/minify/issues/619
