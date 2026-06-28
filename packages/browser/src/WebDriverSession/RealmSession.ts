import type { Stub, StubImplementation } from '@onting/rpc';
import { listen } from '@onting/rpc/server.js';
import { viaBiDi } from '@onting/selenium-webdriver-message-port/host.js';
import { BrowsingContext, type WebDriver, type WebElement } from 'selenium-webdriver';
import getLogInspectorInstance from 'selenium-webdriver/bidi/logInspector.js';
import type { RealmInfo } from 'selenium-webdriver/bidi/scriptManager.js';
import getScriptManagerInstance from 'selenium-webdriver/bidi/scriptManager.js';
import { fallback, parse } from 'valibot';
import { workthru } from 'workthru';
import { MARSHALLED_ELEMENT_SIGNATURE } from '../common/constant';
import { isMarshalledElement } from '../common/marshalledElement';
import { unmarshalToWebElement } from '../common/marshalledElement.host';
import ElementTranslator from './ElementTranslator';
import {
  CustomEventTarget,
  RealmConsoleEvent,
  realmConsoleEventMethodSchema,
  RealmErrorEvent,
  RealmEvent
} from './event';
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
    using disposer = new DisposableStack();

    // TODO: It seems `selenium-webdriver@4.44.0` is bugged.
    //       If we use a shared `ScriptManager`, we will receive channel messages more than once.
    //       It seems if `onMessage()` is called twice, `selenium-webdriver` will call every `onMessage()` twice as well (4 times in total).
    const scriptManager = disposer.adopt(
      await getScriptManagerInstance(realmInfo.browsingContext, webDriver),
      scriptManager => scriptManager.close().catch(() => {})
    );

    const messagePort = disposer.adopt(
      (await viaBiDi(scriptManager, { realmId: realmInfo.realmId })).messagePort,
      messagePort => messagePort.close()
    );

    const logInspector = disposer.adopt(
      await getLogInspectorInstance(webDriver, [realmInfo.browsingContext]),
      logInspector => logInspector.close().catch(() => {})
    );

    disposer.adopt(
      await logInspector.onConsoleEntry(event => {
        if (
          event.source.browsingContextId === realmInfo.browsingContext &&
          event.source.realmId === realmInfo.realmId &&
          event.type === 'console'
        ) {
          const args: readonly unknown[] = Object.freeze(event.args.map(localValue => deserialize(localValue)));

          this.dispatchEvent(
            new RealmConsoleEvent('console', {
              ...realmInfo,
              data: args,
              method: parse(fallback(realmConsoleEventMethodSchema, 'log'), event.method),
              timestamp: event.timeStamp
            })
          );
        }
      }),
      handler => logInspector.removeCallback(handler)
    );

    disposer.adopt(
      listen<StubImplementation<T>, T>(
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
      ),
      teardown => teardown()
    );

    disposer.use(new ElementTranslator(webDriver, realmInfo));

    this.dispatchEvent(new RealmEvent('load', realmInfo));

    await new Promise(resolve => this.#abortController.signal.addEventListener('abort', resolve));

    this.dispatchEvent(new RealmEvent('close', realmInfo));
  }

  #abortController = new AbortController();

  [Symbol.dispose]() {
    this.#abortController.abort();
  }

  close() {
    this[Symbol.dispose]();
  }
}

export default RealmSession;
