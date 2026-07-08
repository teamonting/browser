import { defineConfig } from 'tsup';

export default defineConfig([
  {
    dts: true,
    entry: {
      'repack/pngjs/browser': './src/repack/pngjs/browser.ts'
    },
    format: 'esm',
    noExternal: ['pngjs'],
    outDir: 'dist',
    sourcemap: true,
    target: ['chrome148']
  }
]);
