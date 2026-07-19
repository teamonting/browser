#!/usr/bin/env node

/// <reference types="node" />

import { defineImplementation, type AnyStub, type StubContract, type StubImplementation } from '@onting/rpc';
import { program } from 'commander';
import getScriptManagerInstance from 'selenium-webdriver/bidi/scriptManager.js';
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
const shouldQuitResolver = Promise.withResolvers<void>();

console.log('Hotkeys:\n  Q/q - Quit\n  U/u - Toggle snapshot to be re-recorded\n');

process.stdin.setRawMode(true);

const handleStdinData = (buffer: string | NonSharedBuffer): void => {
  const stringBuffer = buffer.toString('utf-8');

  if (stringBuffer === '\x03') {
    console.log('^C');

    process.exit(-1);
  } else if (stringBuffer === 'q' || stringBuffer === 'Q') {
    console.log('Quit signaled');

    shouldQuitResolver.resolve();
  } else if (stringBuffer === 'u' || stringBuffer === 'U') {
    shouldUpdateSnapshot = !shouldUpdateSnapshot;

    if (shouldUpdateSnapshot) {
      console.log('Snapshot will be re-recorded.');
    } else {
      console.log('Snapshot will NOT be re-recorded.');
    }
  }
};

process.stdin.on('data', handleStdinData);

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

const useWindowsBinary = !!opts.wsl;

// TODO: If `--chrome` is not set, we will default to "chrome" but we should warn user that default behavior could change anytime.
const browser = opts.edge ? 'edge' : opts.firefox ? 'firefox' : opts.safari ? 'safari' : 'chrome';

await using driverService = await buildDriverService(browser, { pipeStdio: !!opts.pipe, useWindowsBinary });

await using webDriver = await buildWebDriver(browser, await driverService.start());

const snapshotStoreMap = new Map<string, InMemorySnapshotStore>();

let implementation: StubImplementation<AnyStub>;

if (opts.stub) {
  // Security risk: intentionally load code from user-supplied path.
  implementation = defineImplementation<StubContract<AnyStub>>(
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

async function injectBadge(browsingContextId: string, textContent: string): Promise<void> {
  if (!browsingContextId) {
    throw new Error('Failed to inject badge because unknown browsing context');
  }

  const scriptManager = await getScriptManagerInstance(browsingContextId, webDriver);

  try {
    await scriptManager.evaluateFunctionInBrowsingContext(
      browsingContextId,
      `(${(textContent: string) => {
        const badgeElement = document.createElement('div');

        badgeElement.popover = 'auto';
        badgeElement.style.alignItems = 'center';
        badgeElement.style.aspectRatio = '1/1';
        badgeElement.style.background = 'transparent';
        badgeElement.style.border = 'none';
        badgeElement.style.display = 'flex';
        badgeElement.style.fontSize = '128px';
        badgeElement.style.justifyContent = 'center';
        // Not sure why we have to add bottom margin to make emoji looks centered.
        badgeElement.style.margin = 'auto 0 4px auto';
        badgeElement.style.overflow = 'hidden';
        badgeElement.style.padding = '0';
        badgeElement.style.userSelect = 'none';
        badgeElement.style.width = '160px';
        badgeElement.textContent = textContent;

        badgeElement.addEventListener('click', () => badgeElement.remove(), { once: true });

        document.body.append(badgeElement);

        badgeElement.showPopover();
      }})(${JSON.stringify(textContent)})`,
      false
    );
  } catch {}
}

session.addEventListener('console', ({ browsingContext, data, method, realmId }) => {
  process.stdout.write(`[${shortenRealmId(realmId)}] [${method}] `);
  console.log(...data);

  switch (data[0]) {
    case '🆗':
      injectBadge(browsingContext, '✅');
      break;

    case '🆖':
      injectBadge(browsingContext, '❌');
      break;

    default:
      break;
  }
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

await Promise.race([
  new Promise<void>(resolve => session.addEventListener('close', () => resolve())),
  shouldQuitResolver.promise
]);

session.close();
process.stdin.destroy();
