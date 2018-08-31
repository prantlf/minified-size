# minified-size
[![NPM version](https://badge.fury.io/js/minified-size.png)](http://badge.fury.io/js/minified-size)
[![Build Status](https://travis-ci.org/prantlf/minified-size.png)](https://travis-ci.org/prantlf/minified-size)
[![Coverage Status](https://coveralls.io/repos/github/prantlf/minified-size/badge.svg?branch=master)](https://coveralls.io/github/prantlf/minified-size?branch=master)
[![Dependency Status](https://david-dm.org/prantlf/minified-size.svg)](https://david-dm.org/prantlf/minified-size)
[![devDependency Status](https://david-dm.org/prantlf/minified-size/dev-status.svg)](https://david-dm.org/prantlf/minified-size#info=devDependencies)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/minified-size.png?downloads=true&stars=true)](https://www.npmjs.com/package/minified-size)

Estimates the size of minified and gzipped JavaScript files. Check, how much space will a particular script take in the minified output.

- [Command-line usage](#command-line-usage)
- [Programmatic usage](#programmatic-usage)
- [Contributing](#programmatic-usage)
- [Release History](#release-history)
- [License](#license)

## Command-line usage

Make sure that you have [NodeJS] >= 8 installed. Install the `minified-size` package globally:

```bash
$ npm install -g minified-size
```

Print the expected minified size of a sample file:

```bash
$ minified-size lib/index.js
lib/index.js: 2.54 kB, 1.48 kB, 643 B
```

Running `minified-size` without any parameters will print usage instructions:

```text
  Usage: minify-size [options] <file>, ...

  Estimates the size of minified and gzipped JavaScript files.

  Options:

    -V, --version           output the version number
    -j, --json              print results in the JSON format
    -r, --raw-sizes         print sizes in bytes as integers
    -o, --no-original-size  prevents printing the size of the original code
    -m, --no-minified-size  prevents printing the size of the minified code
    -g, --no-gzipped-size   prevents printing the size of the gzipped code
    -h, --help              output usage information

  All three sizes are estimated by default. File paths may contain wildcards.
```

## Programmatic usage

Make sure that you use [NodeJS] >= 8. Install the `minified-size` package locally:

```bash
npm install --save minified-size
```

Get the expected minified size of a sample file:

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
* `sources` - an array of strings with source code to process
* `gzip` - a boolean to disable estimating the gzipped output size, or an object with [options for gzip].

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## Release History

* 2018-08-31   v0.0.1   Initial release

## License

Copyright (c) 2018 Ferdinand Prantl

Licensed under the MIT license.

[NodeJS]: http://nodejs.org/
[options for gzip]: https://nodejs.org/docs/latest-v8.x/api/zlib.html#zlib_class_options
