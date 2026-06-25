import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'bin-open': './src/bin-open/index.ts',
      WebDriverSession: './src/open/index.ts'
    },
    format: 'esm',
    target: ['node24']
  },
  {
    dts: true,
    entry: {
      index: './src/browser/index.ts'
    },
    format: 'esm',
    // Intentionally left out @onting/stub. It should be inside import map and NOT bundled inside @onting/browser.
    // Reason: when we release new version of @onting/stub, we don't need to bump @onting/browser.
    noExternal: [/^(?!@onting\/stub$).+/],
    outDir: 'static',
    sourcemap: true,
    target: ['chrome148']
  }
]);
