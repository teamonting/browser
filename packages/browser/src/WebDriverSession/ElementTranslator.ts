import { type WebDriver } from 'selenium-webdriver';
import { ChannelValue, LocalValue } from 'selenium-webdriver/bidi/protocolValue.js';
import type { RealmInfo } from 'selenium-webdriver/bidi/scriptManager.js';
import getScriptManagerInstance from 'selenium-webdriver/bidi/scriptManager.js';
import { array, instance, object, parse, safeParse, string, tuple, undefined_, union } from 'valibot';
import {
  TRANSLATOR_CHANNEL_NAME_PREFIX,
  TRANSLATOR_HOST_RETURN_SYMBOL,
  TRANSLATOR_NOTIFY_HOST_SYMBOL,
  TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL,
  type GlobalThisWithTranslator
} from '../common/constant.ts';
import deserialize, { RemoteNode } from './private/deserialize.ts';

const eventWithSourceSchema = object({
  source: object({
    realmId: string()
  })
});

const entrySchema = tuple([
  string(),
  union([
    object({
      element: instance(RemoteNode),
      remoteElement: undefined_()
    }),
    object({
      element: undefined_(),
      remoteElement: object({
        sharedId: string()
      })
    })
  ])
]);

// Monkey-patching selenium-webdriver, they could almost support sending RemoteValue over callFunctionInRealm() in arguments.
function createRemoteNodeValue(sharedId: string) {
  const value = {
    asMap() {
      return value;
    },
    sharedId,
    type: 'node',
    value: {
      // Some of the following properties are required.
      // We only have ID, we need to fake the properties.
      // TBD: Not sure if shadow root is needed or not.
      attributes: {},
      childNodeCount: 0,
      localName: '',
      namespaceURI: '',
      nodeType: 0,
      shadowRoot: null
    }
  };

  return value;
}

class ElementTranslator {
  constructor(webDriver: WebDriver, realmInfo: RealmInfo) {
    this.#realmInfo = realmInfo;
    this.#webDriver = webDriver;

    this.#channelName = `${TRANSLATOR_CHANNEL_NAME_PREFIX}:${realmInfo.realmId}`;

    (async () => {
      try {
        void this.#asyncConstructor();
      } catch (error) {
        this.#abortController.abort();

        throw error;
      }
    })();
  }

  async #asyncConstructor(): Promise<void> {
    const scriptManager = await getScriptManagerInstance(this.#realmInfo.browsingContext, this.#webDriver);

    const messageHandler = await scriptManager.onMessage(event => {
      // For unknown reasons, scriptManager.onMessage could be called with RealmInfo, WindowRealmInfo, etc.
      if (!event || !('channel' in event) || event.channel !== this.#channelName) {
        return;
      }

      const eventSourceResult = safeParse(eventWithSourceSchema, event);

      if (!eventSourceResult.success) {
        console.error('Internal error: ScriptManager.onMessage should have `event.source.realmId` of string.');

        return;
      }

      const {
        output: {
          source: { realmId }
        }
      } = eventSourceResult;

      (async () => {
        for (const element of parse(array(entrySchema), deserialize(event.data.value))) {
          let nodeRemoteValue: RemoteNode | undefined = element[1].element;
          const remoteElementLocalValue = element[1].remoteElement;
          let sharedIdLocalValue = remoteElementLocalValue?.sharedId;

          if (typeof nodeRemoteValue !== 'undefined') {
            // With WebElement (RemoteValue of type "node"), translate WebElement -> ID.
            sharedIdLocalValue = nodeRemoteValue.sharedId;
          } else if (typeof sharedIdLocalValue !== 'undefined') {
            // With shared ID, fake a RemoteValue to send to the browser, arriving in browser as DOM element.
            // So we can translate ID -> DOM element.
            nodeRemoteValue = new RemoteNode(sharedIdLocalValue);
          }

          await scriptManager.callFunctionInRealm(
            realmId,
            '' +
              ((returnSymbol: string, key: string, element: Element, sharedId: string): void => {
                (globalThis as GlobalThisWithTranslator)[
                  Symbol.for(returnSymbol) as typeof TRANSLATOR_HOST_RETURN_SYMBOL
                ](key, element, { sharedId });
              }),
            true,
            [
              LocalValue.createStringValue(TRANSLATOR_HOST_RETURN_SYMBOL.description!),
              LocalValue.createStringValue(element[0]),
              createRemoteNodeValue(sharedIdLocalValue!),
              LocalValue.createStringValue(sharedIdLocalValue!)
            ]
          );
        }
      })();
    });

    this.#abortController.signal.addEventListener('abort', () => scriptManager.removeCallback(messageHandler), {
      once: true
    });

    if (this.#abortController.signal.aborted) {
      return;
    }

    // `onMessage()` must be running before attaching.
    await scriptManager.callFunctionInRealm(
      this.#realmInfo.realmId,
      '' +
        ((hostPollSymbol: string, fn: (...args: readonly unknown[]) => void) => {
          (globalThis as GlobalThisWithTranslator)[
            Symbol.for(hostPollSymbol) as typeof TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL
          ] = fn;
        }),
      true,
      [
        LocalValue.createStringValue(TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL.description!),
        LocalValue.createChannelValue(new ChannelValue(this.#channelName))
      ]
    );

    if (this.#abortController.signal.aborted) {
      return;
    }

    await scriptManager.callFunctionInRealm(
      this.#realmInfo.realmId,
      '' +
        ((hostToPollSymbol: string) =>
          (globalThis as GlobalThisWithTranslator)[
            Symbol.for(hostToPollSymbol) as typeof TRANSLATOR_NOTIFY_HOST_SYMBOL
          ]?.()),
      true,
      [LocalValue.createStringValue(TRANSLATOR_NOTIFY_HOST_SYMBOL.description!)]
    );
  }

  #abortController: AbortController = new AbortController();
  #channelName: string;
  #realmInfo: RealmInfo;
  #webDriver: WebDriver;

  close() {
    this.#abortController.abort();
  }
}

export default ElementTranslator;
