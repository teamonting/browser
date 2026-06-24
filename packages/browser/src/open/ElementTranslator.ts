import type { WebDriver } from 'selenium-webdriver';
import { ChannelValue, LocalValue } from 'selenium-webdriver/bidi/protocolValue.js';
import type { RealmInfo } from 'selenium-webdriver/bidi/scriptManager.js';
import getScriptManagerInstance from 'selenium-webdriver/bidi/scriptManager.js';
import { array, literal, number, object, parse, record, safeParse, string, tuple, union, unknown } from 'valibot';
import {
  TRANSLATOR_CHANNEL_NAME_PREFIX,
  TRANSLATOR_HOST_RETURN_SYMBOL,
  TRANSLATOR_NOTIFY_HOST_SYMBOL,
  TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL,
  type GlobalThisWithTranslator
} from '../common/constant.ts';

// Monkey-patching selenium-webdriver, they could almost support sending RemoteValue over callFunctionInRealm() in arguments.
type WithAsMap<T extends Record<string, unknown>> = T & { asMap: () => T };

const eventWithSourceSchema = object({
  source: object({
    realmId: string()
  })
});

const nodeRemoteValueSchema = object({
  sharedId: string(),
  type: literal('node'),
  value: object({
    attributes: record(string(), string()),
    childNodeCount: number(),
    localName: string(),
    namespaceURI: string(),
    nodeType: number(),
    shadowRoot: unknown()
  })
});

const stringLocalValueSchema = object({
  type: literal('string'),
  value: string()
});

const undefinedLocalValueSchema = object({
  type: literal('undefined')
});

const entrySchema = object({
  type: literal('array'),
  value: tuple([
    stringLocalValueSchema,
    union([
      object({
        type: literal('object'),
        value: tuple([
          tuple([literal('element'), nodeRemoteValueSchema]),
          tuple([literal('remoteElement'), undefinedLocalValueSchema])
        ])
      }),
      object({
        type: literal('object'),
        value: tuple([
          tuple([literal('element'), undefinedLocalValueSchema]),
          tuple([
            literal('remoteElement'),
            object({
              type: literal('object'),
              value: tuple([tuple([literal('sharedId'), stringLocalValueSchema])])
            })
          ])
        ])
      })
    ])
  ])
});

// Monkey-patching selenium-webdriver, they could almost support sending RemoteValue over callFunctionInRealm() in arguments.
function addAsMap<T extends Record<string, unknown>>(value: T): WithAsMap<T> {
  return { ...value, asMap: () => value };
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
        for (const element of parse(array(entrySchema), event.data.value)) {
          let nodeRemoteValue = element.value[1].value[0][1];
          const remoteElementLocalValue = element.value[1].value[1][1];
          let sharedIdLocalValue =
            remoteElementLocalValue.type === 'object'
              ? remoteElementLocalValue.value[0][1]
              : { type: 'undefined' as const };

          if (nodeRemoteValue.type !== 'undefined') {
            // With WebElement (RemoteValue of type "node"), translate WebElement -> ID.
            sharedIdLocalValue = parse(stringLocalValueSchema, {
              type: 'string',
              value: nodeRemoteValue.sharedId
            });
          } else if (sharedIdLocalValue.type !== 'undefined') {
            // With shared ID, fake a RemoteValue to send to the browser, arriving in browser as DOM element.
            // So we can translate ID -> DOM element.
            nodeRemoteValue = parse(nodeRemoteValueSchema, {
              sharedId: sharedIdLocalValue.value,
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
            });
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
              LocalValue.createStringValue(element.value[0].value),
              addAsMap(nodeRemoteValue),
              addAsMap(sharedIdLocalValue)
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
