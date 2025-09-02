import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/bin/dorval.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  external: ['@dorval/core'],
  esbuildOptions(options) {
    options.platform = 'node';
    options.target = 'node18';
  }
});