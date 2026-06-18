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
    noExternal: ['@onting/rpc', '@onting/selenium-webdriver-message-port', '@onting/stub', 'message-port-rpc'],
    outDir: 'static',
    sourcemap: true,
    target: ['chrome148']
  }
]);
