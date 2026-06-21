import { parse } from 'valibot';
import {
  MARSHALLED_ELEMENT_SIGNATURE,
  TRANSLATOR_TRANSLATE_SYMBOL,
  type GlobalThisWithTranslator
} from './constant.ts';
import { marshalledElementSchema, type MarshalledElement } from './marshalledElement.ts';

async function marshalDOMElement(value: Element): Promise<MarshalledElement> {
  return parse(marshalledElementSchema, [
    MARSHALLED_ELEMENT_SIGNATURE,
    (await (globalThis as GlobalThisWithTranslator)[TRANSLATOR_TRANSLATE_SYMBOL](value)).remoteElement
  ]);
}

async function unmarshalToDOMElement(value: MarshalledElement): Promise<Element> {
  return (
    await (globalThis as GlobalThisWithTranslator)[TRANSLATOR_TRANSLATE_SYMBOL]({
      sharedId: value[1].sharedId
    })
  ).domElement;
}

export { marshalDOMElement, unmarshalToDOMElement };
