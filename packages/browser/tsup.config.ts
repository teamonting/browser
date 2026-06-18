import { defineConfig } from 'tsup';

export default defineConfig([
  {
    dts: true,
    entry: {
      browser: './src/browser/index.ts',
      index: './src/index.ts'
    },
    format: 'esm',
    noExternal: ['@onting/selenium-webdriver-message-port', 'message-port-rpc'],
    sourcemap: true,
    target: ['chrome148']
  }
]);
