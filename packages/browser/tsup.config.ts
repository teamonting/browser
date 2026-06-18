import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'bin-open': './src/bin-open/index.ts',
      index: './src/index.ts'
    },
    format: 'esm',
    target: ['node24']
  },
  {
    dts: true,
    entry: {
      browser: './src/browser/index.ts'
    },
    format: 'esm',
    // Intentionally left out @onting/stub. It should be inside import map and NOT bundled inside @onting/browser.
    // Reason: when we release new version of @onting/stub, we don't need to bump @onting/browser.
    noExternal: ['@onting/rpc', '@onting/selenium-webdriver-message-port', 'message-port-rpc'],
    outDir: 'static',
    sourcemap: true,
    target: ['chrome148']
  }
]);
