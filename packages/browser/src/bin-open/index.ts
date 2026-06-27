#!/usr/bin/env node

/// <reference types="node" />

import { program } from 'commander';
import { platform } from 'node:os';
import { WebDriverSession } from '../WebDriverSession/index.ts';
import buildWebDriver from './private/buildWebDriver.ts';
import isWSL2 from './private/isWSL2.ts';
import shortenRealmId from './private/shortenRealmId.ts';

program.name('@onting/browser').description('Run browser with RPC stub');

program.arguments('[url]');

program.option('--chrome', 'run Chrome/Chromium');
program.option('--edge', 'run Edge');
program.option('--firefox', 'run Firefox');
program.option('--safari', 'run Safari');
program.option('--stub <stub-package-or-path>', 'load stub from the package or path', '@onting/stub');
program.option('--pipe', 'pipe WebDriver output to stdio');
program.option('--wsl', 'run browser on Windows (if under WSL2)');

program.parse(process.argv);

const opts =
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  program.opts() satisfies {} as {
    chrome: boolean | undefined;
    edge: boolean | undefined;
    firefox: boolean | undefined;
    pipe: boolean | undefined;
    safari: boolean | undefined;
    stub: string;
    wsl: boolean | undefined;
  };

let useWindowsBinary = !!opts.wsl;

if (opts.wsl && !(await isWSL2())) {
  console.warn('Not running under WSL2, ignoring --wsl.');

  useWindowsBinary = false;
} else if (platform() === 'win32') {
  useWindowsBinary = true;
}

// TODO: If `--chrome` is not set, we will default to "chrome" but we should warn user that default behavior could change anytime.
const webDriver = await buildWebDriver(
  opts.edge ? 'edge' : opts.firefox ? 'firefox' : opts.safari ? 'safari' : 'chrome',
  { pipeStdio: !!opts.pipe, useWindowsBinary }
);

const session = new WebDriverSession(
  webDriver,
  // Security risk: intentionally load code from user-supplied path.
  {
    ...(await import(`${opts.stub}`)).default,
    ...(await import(`${opts.stub}/implementation`)).default
  }
);

session.addEventListener(
  'load',
  () => {
    const [url] = program.args;

    url && webDriver.navigate().to(url);
  },
  { once: true }
);

session.addEventListener('closing', () => console.log('Shutting down'), { once: true });

session.addEventListener('console', ({ args, realmId }) => {
  console.log(`[${shortenRealmId(realmId)}]`, ...args);
});

session.addEventListener('error', ({ error }) => console.error(error), { once: true });

session.addEventListener('realmclose', ({ browsingContext, origin, realmId, realmType }) => {
  console.log(
    `[${shortenRealmId(realmId)}] Detach "${realmType}" realm of browsing context "${browsingContext}" at ${origin}`
  );
});

session.addEventListener('realmload', ({ browsingContext, origin, realmId, realmType }) => {
  console.log(
    `[${shortenRealmId(realmId)}] Attach "${realmType}" realm of browsing context "${browsingContext}" at ${origin}`
  );
});

session.addEventListener('realmerror', ({ realmId, error: reason }) => {
  console.error(`[${shortenRealmId(realmId)}] Exception caught while attaching to realm.`, reason);
});
