#!/usr/bin/env node

/// <reference types="node" />

import { defineImplementation, type StubImplementation } from '@onting/rpc';
import { program } from 'commander';
import { WebDriverSession } from '../WebDriverSession/index.ts';
import { buildDriverService, buildWebDriver } from '../builder/index.ts';
import InMemorySnapshotStore from './private/InMemorySnapshotStore.ts';
import InMemorySnapshotStoreView from './private/InMemorySnapshotStoreView.ts';
import mapGetOrInsertComputed from './private/mapGetOrInsertComputed.ts';
import shortenRealmId from './private/shortenRealmId.ts';

program.name('@onting/browser').description('Run browser with RPC stub');

program.arguments('[url]');

program.option('--chrome', 'run Chrome/Chromium');
program.option('--edge', 'run Edge');
program.option('--firefox', 'run Firefox');
program.option('--safari', 'run Safari');
program.option('--stub <stub-package-or-path>', 'load stub from the package or path (default: "@onting/stub")');
program.option('--pipe', 'pipe WebDriver output to stdio');
program.option('--wsl', 'run browser on Windows (if under WSL2)');

program.parse(process.argv);

let shouldUpdateSnapshot = false;

console.log('\nHotkeys:\n  U/u - Toggle snapshot to be re-recorded\n');

process.stdin.setRawMode(true);

process.stdin.on('data', buffer => {
  const stringBuffer = buffer.toString('utf-8');

  if (stringBuffer === '\x03') {
    console.log('^C');

    process.exit(-1);
  } else if (stringBuffer === 'u' || stringBuffer === 'U') {
    shouldUpdateSnapshot = !shouldUpdateSnapshot;

    if (shouldUpdateSnapshot) {
      console.log('Snapshot will be re-recorded.');
    } else {
      console.log('Snapshot will NOT be re-recorded.');
    }
  }
});

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

// TODO: If `--chrome` is not set, we will default to "chrome" but we should warn user that default behavior could change anytime.
const browser = opts.edge ? 'edge' : opts.firefox ? 'firefox' : opts.safari ? 'safari' : 'chrome';

await using driverService = await buildDriverService(browser, { pipeStdio: !!opts.pipe, useWindowsBinary });

await using webDriver = await buildWebDriver(browser, await driverService.start());

const snapshotStoreMap = new Map<string, InMemorySnapshotStore>();

let implementation: StubImplementation<any>;

if (opts.stub) {
  // Security risk: intentionally load code from user-supplied path.
  implementation = defineImplementation(
    (await import(`${opts.stub}`)).default,
    (await import(`${opts.stub}/host.js`)).default
  );
} else {
  const { default: createStubImplementation } = await import('@onting/stub/host.js');

  implementation = await createStubImplementation(
    (url: URL): InMemorySnapshotStoreView =>
      new InMemorySnapshotStoreView(
        mapGetOrInsertComputed(
          snapshotStoreMap,
          url.href,
          () => new InMemorySnapshotStore({ getShouldUpdateSnapshot: () => shouldUpdateSnapshot })
        )
      )
  );
}

using session = new WebDriverSession(webDriver, implementation);

session.addEventListener(
  'load',
  () => {
    const [url] = program.args;

    url && webDriver.navigate().to(url);
  },
  { once: true }
);

session.addEventListener('closing', () => console.log('Shutting down'), { once: true });

session.addEventListener('console', ({ data, method, realmId }) => {
  process.stdout.write(`[${shortenRealmId(realmId)}] [${method}] `);
  console.log(...data);
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

await new Promise<void>(resolve => session.addEventListener('close', () => resolve()));
