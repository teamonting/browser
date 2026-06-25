import type { Stub, StubImplementation } from '@onting/rpc';
import { listen } from '@onting/rpc/server.js';
import { viaBiDi } from '@onting/selenium-webdriver-message-port/host.js';
import { BrowsingContext, type WebDriver, type WebElement } from 'selenium-webdriver';
import getLogInspectorInstance from 'selenium-webdriver/bidi/logInspector.js';
import type { RealmInfo } from 'selenium-webdriver/bidi/scriptManager.js';
import getScriptManagerInstance from 'selenium-webdriver/bidi/scriptManager.js';
import { workthru } from 'workthru';
import { MARSHALLED_ELEMENT_SIGNATURE } from '../common/constant';
import { isMarshalledElement } from '../common/marshalledElement';
import { unmarshalToWebElement } from '../common/marshalledElement.host';
import ElementTranslator from './ElementTranslator';
import deserialize from './private/deserialize';
import isWebElementLike from './private/isWebElementLike';
import shortenRealmId from './private/shortenRealmId';

class RealmSession<T extends Stub> extends EventTarget {
  constructor(webDriver: WebDriver, realmInfo: RealmInfo, stubImplementation: StubImplementation<T>) {
    super();

    this.#abortController.signal.addEventListener('abort', () => this.dispatchEvent(new CustomEvent('close')), {
      once: true
    });

    this.#realmInfo = realmInfo;

    const { browsingContext, realmId } = realmInfo;

    console.log(
      `[${shortenRealmId(realmId)}] Attach "${realmInfo.realmType}" realm of browsing context "${browsingContext}" at ${realmInfo.origin}`
    );

    (async () => {
      try {
        await this.#asyncConstructor(webDriver, realmInfo, stubImplementation);
      } catch (reason) {
        this.dispatchEvent(
          new CustomEvent<{ readonly reason: unknown }>('realmerror', { detail: Object.freeze({ reason }) })
        );

        this.close();

        console.error(`[${shortenRealmId(realmId)}] Exception caught while attaching to realm.`, reason);
      }
    })();
  }

  async #asyncConstructor(webDriver: WebDriver, realmInfo: RealmInfo, stubImplementation: StubImplementation<T>) {
    // TODO: It seems `selenium-webdriver@4.44.0` is bugged.
    //       If we use a shared `ScriptManager`, we will receive channel messages more than once.
    //       It seems if `onMessage()` is called twice, `selenium-webdriver` will call every `onMessage()` twice as well (4 times in total).
    const scriptManager = await getScriptManagerInstance(realmInfo.browsingContext, webDriver);

    try {
      const { messagePort } = await viaBiDi(scriptManager, { realmId: realmInfo.realmId });

      try {
        const logInspector = await getLogInspectorInstance(webDriver, [realmInfo.browsingContext]);

        try {
          const consoleEntryHandler = await logInspector.onConsoleEntry(event => {
            const args: readonly unknown[] = Object.freeze(event.args.map(localValue => deserialize(localValue)));

            console.log(`[${shortenRealmId(realmInfo.realmId)}]`, args);

            this.dispatchEvent(
              new CustomEvent<{ args: readonly unknown[] }>('console', { detail: Object.freeze({ args }) })
            );
          });

          try {
            const teardown = listen<StubImplementation<T>, T>(
              stubImplementation,
              {
                browsingContext: await BrowsingContext(webDriver, { browsingContextId: realmInfo.browsingContext }),
                webDriver
              },
              messagePort,
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

            try {
              let elementTranslator: ElementTranslator | undefined;

              try {
                elementTranslator = new ElementTranslator(webDriver, realmInfo);
              } catch (error) {
                // TODO: We blanket all errors about attaching the translator which may not be a good idea.
                // In Firefox, the realm could be detached so fast we did not finish attach translator.
                console.warn(`[${shortenRealmId(realmInfo.realmId)}] Realm detached immediately after attached`);

                throw error;
              }

              try {
                this.dispatchEvent(new CustomEvent('load'));

                await new Promise(resolve => this.#abortController.signal.addEventListener('abort', resolve));

                console.log(
                  `[${shortenRealmId(this.#realmInfo.realmId)}] Detach "${this.#realmInfo.realmType}" realm of browsing context "${this.#realmInfo.browsingContext}" at ${this.#realmInfo.origin}`
                );

                this.dispatchEvent(new CustomEvent('close'));
              } finally {
                elementTranslator.close();
              }
            } finally {
              teardown();
            }
          } finally {
            logInspector?.removeCallback(consoleEntryHandler);
          }
        } finally {
          logInspector?.close().catch(error => console.error(error));
        }
      } finally {
        messagePort?.close();
      }
    } finally {
      scriptManager?.close().catch(error => console.error(error));
    }
  }

  #abortController = new AbortController();
  #realmInfo: RealmInfo;

  close() {
    this.#abortController.abort();
  }
}

export default RealmSession;
