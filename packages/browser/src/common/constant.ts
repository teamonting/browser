const MARSHALLED_ELEMENT_SIGNATURE = '__onting/browser/element__';
const TRANSLATOR_CHANNEL_NAME_PREFIX = '@onting/browser/element-translator/channel/';
const TRANSLATOR_HOST_RETURN_SYMBOL = Symbol.for('@onting/browser/element-translator/hostReturn');
const TRANSLATOR_NOTIFY_HOST_SYMBOL = Symbol.for('@onting/browser/element-translator/notifyHost');
const TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL = Symbol.for('@onting/browser/element-translator/sendMessageToHost');
const TRANSLATOR_TRANSLATE_SYMBOL = Symbol.for('@onting/browser/element-translator/translate');

type RemoteElement = { readonly sharedId: string };

type TranslationResult = {
  readonly domElement: Element;
  readonly remoteElement: RemoteElement;
};

type GlobalThisWithTranslator = typeof globalThis & {
  [TRANSLATOR_HOST_RETURN_SYMBOL]: (key: string, element: Element, remoteElement: RemoteElement) => void;
  [TRANSLATOR_NOTIFY_HOST_SYMBOL]: () => void;
  [TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL]?: (...args: unknown[]) => void;
  [TRANSLATOR_TRANSLATE_SYMBOL]: (value: Element | RemoteElement) => Promise<TranslationResult>;
};

export {
  MARSHALLED_ELEMENT_SIGNATURE,
  TRANSLATOR_CHANNEL_NAME_PREFIX,
  TRANSLATOR_HOST_RETURN_SYMBOL,
  TRANSLATOR_NOTIFY_HOST_SYMBOL,
  TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL,
  TRANSLATOR_TRANSLATE_SYMBOL
};

export type { GlobalThisWithTranslator, TranslationResult };
