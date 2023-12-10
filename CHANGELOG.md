# [3.1.0](https://github.com/prantlf/minified-size/compare/v3.0.0...v3.1.0) (2023-12-10)


### Bug Fixes

* Prefer esbuild to swc ([adffc55](https://github.com/prantlf/minified-size/commit/adffc551881e511f774388820439e5b0a9e4ede2))
* Upgrade dependencies ([0248e5f](https://github.com/prantlf/minified-size/commit/0248e5f270c48d93aeea6b16bd8f3d8486d0f8a6))


### Features

* Allow setting the source type for swc ([7ef2608](https://github.com/prantlf/minified-size/commit/7ef2608e52022e1a33fc749480fc88d09c7ee666))

# [3.0.0](https://github.com/prantlf/minified-size/compare/v2.3.1...v3.0.0) (2022-08-01)


### Bug Fixes

* Upgrade deps, pin pretty-bytes, replace chalk with colorette ([4fba183](https://github.com/prantlf/minified-size/commit/4fba18369271e6288417b3dfa73d2eea22ab0296))


### Features

* Minify with swc by default ([b3a2336](https://github.com/prantlf/minified-size/commit/b3a2336cea11098f53f090578a9298e4c78178ab))


### BREAKING CHANGES

* Although the output of this tool did not change,
swc may have different behaviour than esbuild. The effect should
be better compression, but if this tool starts failing, you can
file a bugu about it and force esbuild or other minifier
as a temporary workaround.

# Changes

## 2.3.1

* Upgrade package dependencies

## 2.3.0

* Estimate the size of the brotli-compressed minified code
* Estimate the gzipped size using gzip and not deflate
* Upgrade package dependencies

## 2.2.1

* Estimate the gzipped size using gzip and not deflate
* Upgrade dependencies

## 2.2.0

Print total sizes

## 2.1.0

Use esbuild for better speed, terser and babel-minify are optional

## 2.0.0

Print results for each file early; do not wait, until all are processed

## 1.2.0

Support stylesheets (CSS) and web pages (HTML)

## 1.0.0

Support full Unicode and prints better error messages

## 0.2.2

Support Windows paths

## 0.2.0

Support source code read from standard input

## 0.1.0

Support wildcards in the input file paths

## 0.0.1

Initial release
