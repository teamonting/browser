import { any, array, boolean, is, literal, number, object, record, string, tuple, unknown } from 'valibot';
import { workthru } from 'workthru';

class RemoteNode {
  constructor(sharedId: string) {
    this.#sharedId = sharedId;
  }

  #sharedId: string;

  get sharedId() {
    return this.#sharedId;
  }
}

const arrayLocalValueSchema = object({
  type: literal('array'),
  value: array(any())
});

const booleanLocalValueSchema = object({
  type: literal('boolean'),
  value: boolean()
});

const mapLocalValueSchema = object({
  type: literal('map'),
  value: array(tuple([string(), unknown()]))
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

const nullLocalValueSchema = object({
  type: literal('null')
});

const numberLocalValueSchema = object({
  type: literal('number'),
  value: number()
});

const objectLocalValueSchema = object({
  type: literal('object'),
  value: array(tuple([string(), unknown()]))
});

const setLocalValueSchema = object({
  type: literal('set'),
  value: array(any())
});

const stringLocalValueSchema = object({
  type: literal('string'),
  value: string()
});

const undefinedLocalValueSchema = object({
  type: literal('undefined')
});

export default function deserialize(value: unknown) {
  return workthru(value, value => {
    if (is(arrayLocalValueSchema, value)) {
      return value.value.map(value => deserialize(value));
    } else if (is(booleanLocalValueSchema, value)) {
      return value.value;
    } else if (is(mapLocalValueSchema, value)) {
      return new Map(value.value.map(([key, value]) => [key, deserialize(value)]));
    } else if (is(nodeRemoteValueSchema, value)) {
      return new RemoteNode(value.sharedId);
    } else if (is(nullLocalValueSchema, value)) {
      return null;
    } else if (is(numberLocalValueSchema, value)) {
      return value.value;
    } else if (is(objectLocalValueSchema, value)) {
      return Object.fromEntries(value.value.map(([key, value]) => [key, deserialize(value)]));
    } else if (is(setLocalValueSchema, value)) {
      return new Set(value.value.map(value => deserialize(value)));
    } else if (is(stringLocalValueSchema, value)) {
      return value.value;
    } else if (is(undefinedLocalValueSchema, value)) {
      return;
    }

    return value;
  });
}

export { nodeRemoteValueSchema, RemoteNode };
