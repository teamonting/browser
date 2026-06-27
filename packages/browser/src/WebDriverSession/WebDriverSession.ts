#!/usr/bin/env node

/// <reference types="node" />

import type { Stub, StubImplementation } from '@onting/rpc';
import { error as SeleniumWebDriverError, WebDriver } from 'selenium-webdriver';
import getScriptManagerInstance, { type RealmInfo } from 'selenium-webdriver/bidi/scriptManager.js';
import {
  CustomEventTarget,
  RealmConsoleEvent,
  RealmErrorEvent,
  RealmEvent,
  WebDriverErrorEvent,
  WebDriverEvent
} from './event.ts';
import createSequencer from './private/createSequencer.ts';
import delta from './private/delta.ts';
import doInterval from './private/doInterval.ts';
import RealmSession from './RealmSession.ts';

type WebDriverSessionEventMap = {
  close: Event;
  closing: Event;
  console: RealmConsoleEvent;
  error: RealmErrorEvent;
  load: Event;
  realmclose: RealmEvent;
  realmerror: RealmErrorEvent;
  realmload: RealmEvent;
};

class WebDriverSession<T extends Stub> extends CustomEventTarget<WebDriverSessionEventMap> {
  constructor(webDriver: WebDriver, stubImplementation: StubImplementation<T>) {
    super();

    this.#stubImplementation = stubImplementation;
    this.#webDriver = webDriver;

    void this.#asyncConstructor();
  }

  async #asyncConstructor() {
    await using disposer = new AsyncDisposableStack();

    disposer.defer(() => {
      this.dispatchEvent(new WebDriverEvent('close'));
    });

    try {
      // Patch WebSocket so to handle large amount of ScriptManager.
      const { socket } = await this.#webDriver.getBidi();

      'setMaxListeners' in socket && typeof socket.setMaxListeners === 'function' && socket.setMaxListeners(100);

      // @types/selenium-webdriver@4.35.0 does not match selenium-webdriver@4.44.0
      const rootScriptManager = disposer.adopt(
        await getScriptManagerInstance(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          null as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.#webDriver as any
        ),
        rootScriptManager => rootScriptManager.close().catch(() => {})
      );

      this.dispatchEvent(new WebDriverEvent('load'));

      const sequenceReconcileRealmsCall = createSequencer();

      const reconcileRealms = (): Promise<void> => {
        return sequenceReconcileRealmsCall(async () => {
          let realms: readonly RealmInfo[];

          try {
            realms = (await rootScriptManager.getAllRealms()) as readonly RealmInfo[];
          } catch (error) {
            // Keep host running despite realm issues.
            this.#aborted || console.error(error);

            return;
          }

          const realmMap = new Map<string, RealmInfo>(realms.map(realm => [realm.realmId, realm]));

          const [added, _, deleted] = delta<string>(new Set(realmMap.keys()), new Set(this.#activeRealms.keys()));

          for (const realmId of deleted.values()) {
            try {
              await this.#detachRealm(realmId);
            } catch (error) {
              this.#aborted || console.error(error);
            }
          }

          for (const realmId of added.values()) {
            try {
              await this.#attachRealm(realmMap.get(realmId)!);
            } catch (error) {
              this.#aborted || console.error(error);
            }
          }
        });
      };

      await rootScriptManager.onRealmCreated(() => void reconcileRealms());
      await rootScriptManager.onRealmDestroyed(() => void reconcileRealms());

      await reconcileRealms();

      disposer.defer(() => {
        for (const realm of this.#activeRealms.values()) {
          realm.close();
        }
      });

      await doInterval(
        async () => {
          try {
            // Detects when user closed the browser manually.
            await this.#webDriver.getAllWindowHandles();
          } catch (error) {
            error instanceof SeleniumWebDriverError.NoSuchSessionError || console.error(error);

            // CTRL+W on Firefox will cause Marionette error than SeleniumWebDriverError.NoSuchSessionError.
            // Thus, any error could be related to both shutdown or other issues.
            return false;
          }

          return;
        },
        // WebDriver.getAllWindowHandles() is not event-driven, we need to call it once every second or so.
        1_000,
        { signal: this.#abortController.signal }
      );

      // We cannot use SIGINT to shutdown browsers automatically.
      // When WSL2 is running chromedriver.exe (on Windows):
      //
      // 1. SIGINT will terminate chromedriver.exe (on Windows) immediately, seems behavior from WSL2
      //    - Node.js seems intercepted SIGINT but chromedriver.exe is still being terminated
      // 2. Browser still open because chromedriver don't close child browser processes (probably detached)
      // 3. We lost chromedriver.exe and has no way to delete the session
      //
      // However, for Linux binary of chromedriver, it works. Maybe it is about how WSL2 terminate Windows-side child processes.

      this.dispatchEvent(new WebDriverEvent('closing'));
      this.close();
    } catch (error) {
      this.dispatchEvent(new WebDriverErrorEvent('error', { error }));
    }
  }

  #abortController: AbortController = new AbortController();
  #activeRealms: Map<string, RealmSession<T>> = new Map();
  #stubImplementation: StubImplementation<T>;
  #webDriver: WebDriver;

  get #aborted(): boolean {
    return this.#abortController.signal.aborted;
  }

  async #attachRealm(realmInfo: RealmInfo): Promise<void> {
    const { realmId } = realmInfo;

    if (this.#activeRealms.has(realmId)) {
      throw new Error(`Realm "${realmId}" has already attached`);
    }

    const realm = new RealmSession(this.#webDriver, realmInfo, this.#stubImplementation);

    this.#activeRealms.set(realmId, realm);

    realm.addEventListener('close', event => this.dispatchEvent(new RealmEvent('realmclose', event)));
    realm.addEventListener('console', event => this.dispatchEvent(new RealmConsoleEvent('console', event)));
    realm.addEventListener('error', event => this.dispatchEvent(new RealmErrorEvent('realmerror', event)));
    realm.addEventListener('load', event => this.dispatchEvent(new RealmEvent('realmload', event)));
  }

  async #detachRealm(realmId: string): Promise<void> {
    const realmSession = this.#activeRealms.get(realmId);

    if (!realmSession) {
      throw new Error(`Realm "${realmId}" has already detached`);
    }

    realmSession.close();

    this.#activeRealms.delete(realmId);
  }

  [Symbol.dispose]() {
    this.#abortController.abort();
  }

  close() {
    this[Symbol.dispose]();
  }
}

export default WebDriverSession;
