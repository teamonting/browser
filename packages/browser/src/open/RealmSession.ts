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
import { CustomEventTarget, RealmConsoleEvent, RealmErrorEvent, RealmEvent } from './event';
import deserialize from './private/deserialize';
import isWebElementLike from './private/isWebElementLike';

type RealmSessionEventMap = {
  close: RealmEvent;
  console: RealmConsoleEvent;
  error: RealmErrorEvent;
  load: RealmEvent;
};

class RealmSession<T extends Stub> extends CustomEventTarget<RealmSessionEventMap> {
  constructor(webDriver: WebDriver, realmInfo: RealmInfo, stubImplementation: StubImplementation<T>) {
    super();

    this.#abortController.signal.addEventListener(
      'abort',
      () => this.dispatchEvent(new RealmEvent('close', realmInfo)),
      { once: true }
    );

    (async () => {
      try {
        await this.#asyncConstructor(webDriver, realmInfo, stubImplementation);
      } catch (error) {
        this.dispatchEvent(new RealmErrorEvent('error', { ...realmInfo, error }));

        this.close();
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

            this.dispatchEvent(new RealmConsoleEvent('console', { ...realmInfo, args }));
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
              const elementTranslator = new ElementTranslator(webDriver, realmInfo);

              try {
                this.dispatchEvent(new RealmEvent('load', realmInfo));

                await new Promise(resolve => this.#abortController.signal.addEventListener('abort', resolve));

                this.dispatchEvent(new RealmEvent('close', realmInfo));
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

  close() {
    this.#abortController.abort();
  }
}

export default RealmSession;
