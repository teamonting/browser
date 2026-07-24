import { parse } from 'valibot';
import {
  MARSHALLED_ELEMENT_SIGNATURE,
  TRANSLATOR_TRANSLATE_SYMBOL,
  type GlobalThisWithTranslator
} from '../../internal/constant.ts';
import { marshalledElementSchema, type MarshalledElement } from '../../internal/marshalledElement.ts';

export default async function marshalDOMElement(value: Element): Promise<MarshalledElement> {
  return parse(marshalledElementSchema, [
    MARSHALLED_ELEMENT_SIGNATURE,
    (await (globalThis as GlobalThisWithTranslator)[TRANSLATOR_TRANSLATE_SYMBOL](value)).remoteElement
  ]);
}
