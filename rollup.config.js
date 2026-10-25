import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'

export default {
  input: 'lib/index.js',
  output: { file: 'lib/index.cjs', format: 'cjs', sourcemap: true },
  plugins: [commonjs(), nodeResolve({ preferBuiltins: true })],
  external: [
    'babel-minify',
    'esbuild',
    'oxc-minify',
    '@swc/core',
    'terser',
    '@prantlf/crass',
    'html-minifier',
    'node:path',
    'fast-glob',
    'node:zlib',
    'node:fs/promises'
  ]
}
