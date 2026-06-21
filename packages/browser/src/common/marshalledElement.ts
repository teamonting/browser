import { is, literal, object, string, tuple, type InferOutput } from 'valibot';
import { MARSHALLED_ELEMENT_SIGNATURE } from './constant.ts';

const marshalledElementSchema = tuple([
  literal(MARSHALLED_ELEMENT_SIGNATURE),
  object({
    sharedId: string()
  })
]);

type MarshalledElement = InferOutput<typeof marshalledElementSchema>;

function isMarshalledElement(value: unknown): value is MarshalledElement {
  return is(marshalledElementSchema, value);
}

export { isMarshalledElement, marshalledElementSchema };
export type { MarshalledElement };
