import typescript from '@rollup/plugin-typescript';
import sourceMaps from 'rollup-plugin-sourcemaps';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.ts',
  plugins: [
    commonjs(),
    resolve({
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: 'tsconfig.esm.json',
    }),
    sourceMaps(),
    terser(),
  ],
  output: [
    {
      format: 'umd',
      file: 'dist/casbin-core.js',
      name: 'casbin',
      sourcemap: true,
    },
    {
      format: 'es',
      file: 'dist/casbin-core.mjs',
      sourcemap: true,
    },
    {
      format: 'es',
      file: 'dist/casbin-core.esm.js',
      sourcemap: true,
    },
  ],
};
