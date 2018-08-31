# minified-size
[![NPM version](https://badge.fury.io/js/minified-size.png)](http://badge.fury.io/js/minified-size)
[![Build Status](https://travis-ci.org/prantlf/minified-size.png)](https://travis-ci.org/prantlf/minified-size)
[![Coverage Status](https://coveralls.io/repos/github/prantlf/minified-size/badge.svg?branch=master)](https://coveralls.io/github/prantlf/minified-size?branch=master)
[![Dependency Status](https://david-dm.org/prantlf/minified-size.svg)](https://david-dm.org/prantlf/minified-size)
[![devDependency Status](https://david-dm.org/prantlf/minified-size/dev-status.svg)](https://david-dm.org/prantlf/minified-size#info=devDependencies)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[![NPM Downloads](https://nodei.co/npm/minified-size.png?downloads=true&stars=true)](https://www.npmjs.com/package/minified-size)

Estimates the size of minified JavaScript files. Check, how much space will a particular script take in the minified output.

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
lib/index.js: 1.06 kB
```

Running `minified-size` without any parameters will print usage instructions:

```text
  Usage: minify-size [options] <file>, ...

  Estimates the size of minified JavaScript files.

  Options:

    -V, --version           output the version number
    -j, --json              write results in the JSON format
    -r, --raw-size          write sizes in bytes as integers
    -o, --original-size     write the size of the original code
    -m, --no-minified-size  prevents writing the size of the minified code
    -h, --help              output usage information
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
// [ { file: 'lib/index.js', size: 1699, minifiedSize: 1046 } ]
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## Release History

* 2018-08-31   v0.0.1   Initial release

## License

Copyright (c) 2018 Ferdinand Prantl

Licensed under the MIT license.

[NodeJS]: http://nodejs.org/
