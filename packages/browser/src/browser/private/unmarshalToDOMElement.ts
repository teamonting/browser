import { TRANSLATOR_TRANSLATE_SYMBOL, type GlobalThisWithTranslator } from '../../internal/constant.ts';
import { type MarshalledElement } from '../../internal/marshalledElement.ts';

export default async function unmarshalToDOMElement(value: MarshalledElement): Promise<Element> {
  return (
    await (globalThis as GlobalThisWithTranslator)[TRANSLATOR_TRANSLATE_SYMBOL]({
      sharedId: value[1].sharedId
    })
  ).domElement;
}
