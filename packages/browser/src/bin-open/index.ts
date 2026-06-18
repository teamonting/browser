#!/usr/bin/env node

/// <reference types="node" />

import { listen } from '@onting/rpc/server.js';
import { viaBiDi } from '@onting/selenium-webdriver-message-port/host.js';
import { program } from 'commander';
import { platform } from 'node:os';
import { BrowsingContext, error as SeleniumWebDriverError } from 'selenium-webdriver';
import getScriptManagerInstance from 'selenium-webdriver/bidi/scriptManager.js';
import buildWebDriver from './private/buildWebDriver.ts';
import createSequencer from './private/createSequencer.ts';
import delta from './private/delta.ts';
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

// Patch WebSocket so to handle large amount of ScriptManager.
const { socket } = await webDriver.getBidi();

'setMaxListeners' in socket && typeof socket.setMaxListeners === 'function' && socket.setMaxListeners(100);

type RealmInfo = {
  readonly browsingContext: string;
  readonly origin: string;
  readonly realmId: string;
  readonly realmType: string;
};

type ScriptManager = {
  close(): Promise<void>;
  getAllRealms(): Promise<readonly RealmInfo[]>;
  onRealmCreated(callback: () => void): Promise<string>;
  onRealmDestroyed(callback: () => void): Promise<string>;
};

type ActiveRealmContextReadWrite = {
  messagePortPromise: Promise<MessagePort>;
  realmInfo: RealmInfo;
  scriptManagerPromise: Promise<ScriptManager>;

  abort(): void;
};

type ActiveRealmContext = Readonly<ActiveRealmContextReadWrite>;

async function attachRealm(realmInfo: RealmInfo): Promise<void> {
  const { realmId } = realmInfo;

  if (activeRealms.has(realmId)) {
    throw new Error(`Realm "${realmId}" has already attached`);
  }

  console.log(
    `[${shortenRealmId(realmId)}] Attach "${realmInfo.realmType}" realm of browsing context "${realmInfo.browsingContext}" at ${realmInfo.origin}`
  );

  const abortController = new AbortController();

  const scriptManagerPromise = getScriptManagerInstance(
    realmInfo.browsingContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webDriver as any
  ) as unknown as Promise<ScriptManager>;

  const messagePortPromise = scriptManagerPromise
    .then(scriptManager => {
      if (abortController.signal.aborted) {
        throw new Error('Aborted');
      }

      return viaBiDi(scriptManager, { realmId });
    })
    .then(({ messagePort }) => messagePort);

  const entry: ActiveRealmContextReadWrite = {
    abort: abortController.abort.bind(abortController),
    messagePortPromise,
    realmInfo,
    // TODO: It seems `selenium-webdriver@4.44.0` is bugged.
    //       If we use a shared `ScriptManager`, we will receive channel messages more than once.
    //       It seems if `onMessage()` is called twice, `selenium-webdriver` will call every `onMessage()` twice as well (4 times in total).
    scriptManagerPromise
  };

  activeRealms.set(realmId, entry);

  const teardown = listen(
    // Security risk: intentionally load code from user-supplied path.
    (await import(opts.stub)).default,
    {
      browsingContext: await BrowsingContext(webDriver, { browsingContextId: realmInfo.browsingContext }),
      webDriver
    },
    await entry.messagePortPromise
  );

  abortController.signal.addEventListener('abort', () => {
    (async () => {
      try {
        (await entry.messagePortPromise).close();
      } catch {}
    })();

    (async () => {
      try {
        (await entry.scriptManagerPromise).close();
      } catch {}
    })();

    try {
      teardown();
    } catch {}
  });
}

async function detachRealm(realmInfo: RealmInfo): Promise<void> {
  const { realmId } = realmInfo;

  const realmContext = activeRealms.get(realmId);

  if (!realmContext) {
    throw new Error(`Realm "${realmId}" has already detached`);
  }

  console.log(
    `[${shortenRealmId(realmId)}] Detach "${realmInfo.realmType}" realm of browsing context "${realmInfo.browsingContext}" at ${realmInfo.origin}`
  );

  realmContext.abort();

  activeRealms.delete(realmId);
}

async function reconcileRealms(): Promise<void> {
  const realms = (await scriptManager.getAllRealms()) as readonly RealmInfo[];

  const realmMap = new Map<string, RealmInfo>(realms.map(realm => [realm.realmId, realm]));

  const [added, _, deleted] = delta<string>(new Set(realmMap.keys()), new Set(activeRealms.keys()));

  for (const realmId of deleted.values()) {
    await detachRealm(activeRealms.get(realmId)!.realmInfo);
  }

  for (const realmId of added.values()) {
    await attachRealm(realmMap.get(realmId)!);
  }
}

const activeRealms: Map<string, ActiveRealmContext> = new Map();

// @types/selenium-webdriver@4.35.0 does not match selenium-webdriver@4.44.0
const scriptManager = (await getScriptManagerInstance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  null as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webDriver as any
)) as unknown as ScriptManager;

const sequenceReconcileRealmsCall = createSequencer();

const reconcileRealmsInSequence: typeof reconcileRealms = (...args) => {
  return sequenceReconcileRealmsCall(async () => {
    try {
      return await reconcileRealms(...args);
    } catch {}
  });
};

await reconcileRealmsInSequence();

await scriptManager.onRealmCreated(() => void reconcileRealmsInSequence());
await scriptManager.onRealmDestroyed(() => void reconcileRealmsInSequence());

const [url] = program.args;

url && (await webDriver.navigate().to(url));

for (;;) {
  try {
    // Detects when user closed the browser manually.
    await webDriver.getAllWindowHandles();
  } catch (error) {
    if (error instanceof SeleniumWebDriverError.NoSuchSessionError) {
      break;
    }

    throw error;
  }

  // WebDriver.getAllWindowHandles() is not event-driven, we need to call it once every second or so.
  await new Promise(resolve => setTimeout(resolve, 1_000));
}

// We cannot use SIGINT to shutdown browsers automatically.
// When WSL2 is running chromedriver.exe (on Windows):
//
// 1. SIGINT will terminate chromedriver.exe (on Windows) immediately, seems behavior from WSL2
//    - Node.js seems intercepted SIGINT but chromedriver.exe is still being terminated
// 2. Browser still open because chromedriver don't close child browser processes (probably detached)
// 3. We lost chromedriver.exe and has no way to delete the session
//
// However, for Linux binary of chromedriver, it works. Maybe it is about how WSL2 terminate Windows-side child processes.

console.log('Shutting down');

try {
  await scriptManager.close();
} catch {}

for (const realmContext of activeRealms.values()) {
  realmContext.abort();
}
