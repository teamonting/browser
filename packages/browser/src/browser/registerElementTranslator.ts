import { v7 } from 'uuid';
import {
  TRANSLATOR_HOST_RETURN_SYMBOL,
  TRANSLATOR_NOTIFY_HOST_SYMBOL,
  TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL,
  TRANSLATOR_TRANSLATE_SYMBOL,
  type GlobalThisWithTranslator,
  type TranslationResult
} from '../common/constant.ts';

type Entry = {
  readonly resolvers: PromiseWithResolvers<TranslationResult>;
} & (
  | { readonly element: Element; readonly remoteElement?: undefined }
  | { readonly element?: undefined; readonly remoteElement: { readonly sharedId: string } }
);

function registerElementTranslator() {
  const translationMap = new Map<string, Entry>();

  (globalThis as GlobalThisWithTranslator)[TRANSLATOR_HOST_RETURN_SYMBOL] = function (
    id: string,
    domElement: Element,
    remoteElement: { readonly sharedId: string }
  ) {
    const entry = translationMap.get(id);

    if (entry) {
      entry.resolvers.resolve(Object.freeze({ domElement, remoteElement }));

      translationMap.delete(id);
    }
  };

  (globalThis as GlobalThisWithTranslator)[TRANSLATOR_NOTIFY_HOST_SYMBOL] = function () {
    const sendMessageToHost = (globalThis as GlobalThisWithTranslator)[TRANSLATOR_SEND_MESSAGE_TO_HOST_SYMBOL];

    if (!sendMessageToHost) {
      return;
    }

    sendMessageToHost(
      Array.from(
        translationMap
          .entries()
          .map(([key, value]) => [key, { element: value.element, remoteElement: value.remoteElement }])
      )
    );
  };

  (globalThis as GlobalThisWithTranslator)[TRANSLATOR_TRANSLATE_SYMBOL] = function (
    value: Element | { readonly sharedId: string }
  ) {
    const id = v7();
    const resolvers = Promise.withResolvers<TranslationResult>();

    translationMap.set(id, {
      ...(value instanceof Element ? { element: value } : { remoteElement: value }),
      resolvers
    });

    (globalThis as GlobalThisWithTranslator)[TRANSLATOR_NOTIFY_HOST_SYMBOL]();

    return resolvers.promise;
  };
}

export default registerElementTranslator;
