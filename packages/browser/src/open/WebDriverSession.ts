#!/usr/bin/env node

/// <reference types="node" />

import type { Stub, StubImplementation } from '@onting/rpc';
import { program } from 'commander';
import { error as SeleniumWebDriverError, type WebDriver } from 'selenium-webdriver';
import getScriptManagerInstance, { type RealmInfo } from 'selenium-webdriver/bidi/scriptManager.js';
import createSequencer from './private/createSequencer.ts';
import delta from './private/delta.ts';
import RealmSession from './RealmSession.ts';

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
            await this.#detachRealm(realmId);
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
      realmContext.close();
    }

    this.dispatchEvent(new CustomEvent('close'));
  }

  #abortController: AbortController = new AbortController();
  #activeRealms: Map<string, RealmSession<T>> = new Map();
  #stubImplementation: StubImplementation<T>;
  #webDriver: WebDriver;

  async #attachRealm(realmInfo: RealmInfo): Promise<void> {
    const { realmId } = realmInfo;

    if (this.#activeRealms.has(realmId)) {
      throw new Error(`Realm "${realmId}" has already attached`);
    }

    const realm = new RealmSession(this.#webDriver, realmInfo, this.#stubImplementation);

    this.#activeRealms.set(realmId, realm);

    realm.addEventListener('close', () =>
      this.dispatchEvent(
        new CustomEvent<{ readonly browsingContext: string; readonly realmId: string }>('realmclose', {
          detail: Object.freeze({ browsingContext: realmInfo.browsingContext, realmId })
        })
      )
    );

    realm.addEventListener('console', event => {
      const {
        detail: { args }
      } = event satisfies Event as CustomEvent<{ readonly args: readonly unknown[] }>;

      this.dispatchEvent(
        new CustomEvent<{
          readonly args: readonly unknown[];
          readonly browsingContext: string;
          readonly realmId: string;
        }>('console', {
          detail: Object.freeze({ args, browsingContext: realmInfo.browsingContext, realmId })
        })
      );
    });

    realm.addEventListener('error', event => {
      const {
        detail: { reason }
      } = event satisfies Event as CustomEvent<{ readonly reason: unknown }>;

      this.dispatchEvent(
        new CustomEvent<{ readonly realmId: string; readonly reason: unknown }>('realmload', {
          detail: Object.freeze({ browsingContext: realmInfo.browsingContext, realmId, reason })
        })
      );
    });

    realm.addEventListener('load', () =>
      this.dispatchEvent(
        new CustomEvent<{ readonly realmId: string }>('realmload', {
          detail: Object.freeze({ browsingContext: realmInfo.browsingContext, realmId })
        })
      )
    );
  }

  async #detachRealm(realmId: string): Promise<void> {
    const realmSession = this.#activeRealms.get(realmId);

    if (!realmSession) {
      throw new Error(`Realm "${realmId}" has already detached`);
    }

    realmSession.close();

    this.#activeRealms.delete(realmId);
  }

  close() {
    this.#abortController.abort();
  }
}

export default WebDriverSession;
