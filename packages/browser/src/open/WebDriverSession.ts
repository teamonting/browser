#!/usr/bin/env node

/// <reference types="node" />

import type { Stub, StubImplementation } from '@onting/rpc';
import { listen } from '@onting/rpc/server.js';
import { viaBiDi } from '@onting/selenium-webdriver-message-port/host.js';
import { program } from 'commander';
import { BrowsingContext, error as SeleniumWebDriverError, WebElement, type WebDriver } from 'selenium-webdriver';
import getLogInspectorInstance, { type LogInspector } from 'selenium-webdriver/bidi/logInspector.js';
import getScriptManagerInstance, { type RealmInfo, type ScriptManager } from 'selenium-webdriver/bidi/scriptManager.js';
import { workthru } from 'workthru/async';
import { MARSHALLED_ELEMENT_SIGNATURE } from '../common/constant.ts';
import { unmarshalToWebElement } from '../common/marshalledElement.host.ts';
import { isMarshalledElement } from '../common/marshalledElement.ts';
import attachElementTranslator from './private/attachElementTranslator.ts';
import createSequencer from './private/createSequencer.ts';
import delta from './private/delta.ts';
import isWebElementLike from './private/isWebElementLike.ts';
import shortenRealmId from './private/shortenRealmId.ts';

type ActiveRealmContextReadWrite = {
  logInspectorPromise: Promise<LogInspector>;
  messagePortPromise: Promise<MessagePort>;
  realmInfo: RealmInfo;
  scriptManagerPromise: Promise<ScriptManager>;

  abort(): void;
};

type ActiveRealmContext = Readonly<ActiveRealmContextReadWrite>;

class WebDriverSession<T extends Stub> extends EventTarget {
  constructor(webDriver: WebDriver, stubImplementation: StubImplementation<T>) {
    super();

    this.#stubImplementation = stubImplementation;
    this.#webDriver = webDriver;

    void this.#asyncConstructor();
  }

  async #asyncConstructor() {
    // Patch WebSocket so to handle large amount of ScriptManager.
    const { socket } = await this.#webDriver.getBidi();

    'setMaxListeners' in socket && typeof socket.setMaxListeners === 'function' && socket.setMaxListeners(100);

    this.dispatchEvent(new CustomEvent('load'));

    // @types/selenium-webdriver@4.35.0 does not match selenium-webdriver@4.44.0
    const rootScriptManager = await getScriptManagerInstance(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.#webDriver as any
    );

    const sequenceReconcileRealmsCall = createSequencer();

    const reconcileRealms = (): Promise<void> => {
      return sequenceReconcileRealmsCall(async () => {
        try {
          const realms = (await rootScriptManager.getAllRealms()) as readonly RealmInfo[];

          const realmMap = new Map<string, RealmInfo>(realms.map(realm => [realm.realmId, realm]));

          const [added, _, deleted] = delta<string>(new Set(realmMap.keys()), new Set(this.#activeRealms.keys()));

          for (const realmId of deleted.values()) {
            await this.#detachRealm(this.#activeRealms.get(realmId)!.realmInfo);
          }

          for (const realmId of added.values()) {
            await this.#attachRealm(realmMap.get(realmId)!);
          }
        } catch (error) {
          // Keep host running despite realm issues.
          console.error(error);
        }
      });
    };

    await reconcileRealms();

    await rootScriptManager.onRealmCreated(() => void reconcileRealms());
    await rootScriptManager.onRealmDestroyed(() => void reconcileRealms());

    const [url] = program.args;

    url && (await this.#webDriver.navigate().to(url));

    for (;;) {
      try {
        // Detects when user closed the browser manually.
        await this.#webDriver.getAllWindowHandles();
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

    this.dispatchEvent(new CustomEvent('closing'));

    try {
      await rootScriptManager.close();
    } catch {}

    for (const realmContext of this.#activeRealms.values()) {
      realmContext.abort();
    }

    this.dispatchEvent(new CustomEvent('close'));
  }

  close() {
    this.#abortController.abort();
  }

  #abortController: AbortController = new AbortController();
  #activeRealms: Map<string, ActiveRealmContext> = new Map();
  #stubImplementation: StubImplementation<T>;
  #webDriver: WebDriver;

  async #attachRealm(realmInfo: RealmInfo): Promise<void> {
    const webDriver = this.#webDriver;
    const { realmId } = realmInfo;

    if (this.#activeRealms.has(realmId)) {
      throw new Error(`Realm "${realmId}" has already attached`);
    }

    console.log(
      `[${shortenRealmId(realmId)}] Attach "${realmInfo.realmType}" realm of browsing context "${realmInfo.browsingContext}" at ${realmInfo.origin}`
    );

    const abortController = new AbortController();

    const scriptManagerPromise = getScriptManagerInstance(
      realmInfo.browsingContext,
      webDriver
    ) as unknown as Promise<ScriptManager>;

    const messagePortPromise = scriptManagerPromise
      .then(scriptManager => {
        if (abortController.signal.aborted) {
          throw new Error('Aborted');
        }

        return viaBiDi(scriptManager, { realmId });
      })
      .then(({ messagePort }) => messagePort);

    const logInspectorPromise = getLogInspectorInstance(webDriver, [realmInfo.browsingContext]).then(logInspector => {
      logInspector.onConsoleEntry(event => {
        console.log(
          `[${shortenRealmId(realmInfo.realmId)}]`,
          ...event.args
            .map(localValue => {
              if (localValue && typeof localValue === 'object' && 'type' in localValue) {
                // TODO: We should use `workthru` to deserialize.
                if (localValue.type === 'string' && 'value' in localValue) {
                  return localValue.value;
                }
              }

              return;
            })
            .filter(Boolean)
        );
      });

      return logInspector;
    });

    const entry: ActiveRealmContextReadWrite = {
      abort: abortController.abort.bind(abortController),
      logInspectorPromise,
      messagePortPromise,
      realmInfo,
      // TODO: It seems `selenium-webdriver@4.44.0` is bugged.
      //       If we use a shared `ScriptManager`, we will receive channel messages more than once.
      //       It seems if `onMessage()` is called twice, `selenium-webdriver` will call every `onMessage()` twice as well (4 times in total).
      scriptManagerPromise
    };

    this.#activeRealms.set(realmId, entry);

    const teardown = listen<StubImplementation<T>, T>(
      this.#stubImplementation,
      {
        browsingContext: await BrowsingContext(webDriver, { browsingContextId: realmInfo.browsingContext }),
        webDriver
      },
      await entry.messagePortPromise,
      {
        async marshal(value: unknown) {
          return await workthru(value, async value =>
            isWebElementLike(value)
              ? [MARSHALLED_ELEMENT_SIGNATURE, { sharedId: await (value as unknown as WebElement).getId() }]
              : value
          );
        },
        async unmarshal(value: unknown) {
          return await workthru(value, async value =>
            isMarshalledElement(value) ? await unmarshalToWebElement(value, webDriver) : value
          );
        }
      }
    );

    abortController.signal.addEventListener('abort', () => {
      (async () => {
        try {
          (await entry.logInspectorPromise).close();
        } catch {}
      })();

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

    try {
      await attachElementTranslator(webDriver, realmInfo);
    } catch {
      // TODO: We blanket all errors about attaching the translator which may not be a good idea.
      // In Firefox, the realm could be detached so fast we did not finish attach translator.
      console.warn(`[${shortenRealmId(realmInfo.realmId)}] Realm detached immediately after attached`);

      abortController.abort();

      return;
    }
  }

  async #detachRealm(realmInfo: RealmInfo): Promise<void> {
    const { realmId } = realmInfo;

    const realmContext = this.#activeRealms.get(realmId);

    if (!realmContext) {
      throw new Error(`Realm "${realmId}" has already detached`);
    }

    console.log(
      `[${shortenRealmId(realmId)}] Detach "${realmInfo.realmType}" realm of browsing context "${realmInfo.browsingContext}" at ${realmInfo.origin}`
    );

    realmContext.abort();

    this.#activeRealms.delete(realmId);
  }
}

export default WebDriverSession;
