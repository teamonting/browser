declare module 'selenium-webdriver/bidi/protocolValue.js' {
  // export type RemoteValue =
  //   | { type: 'array'; handle?: string; internalId?: string; value?: RemoteValue[] }
  //   | { type: 'arraybuffer'; handle?: string; internalId?: string }
  //   | { type: 'bigint'; value: string }
  //   | { type: 'boolean'; value: boolean }
  //   | { type: 'date'; handle?: string; internalId?: string; value?: string }
  //   | { type: 'error'; handle?: string; internalId?: string }
  //   | { type: 'function'; handle?: string; internalId?: string }
  //   | { type: 'generator'; handle?: string; internalId?: string }
  //   | { type: 'htmlcollection'; handle?: string; internalId?: string; value?: RemoteValue[] }
  //   | { type: 'map'; handle?: string; internalId?: string; value?: [RemoteValue, RemoteValue][] }
  //   | { type: 'node'; handle?: string; internalId?: string; value?: unknown }
  //   | { type: 'nodelist'; handle?: string; internalId?: string; value?: RemoteValue[] }
  //   | { type: 'null' }
  //   | { type: 'number'; value: number | 'Infinity' | '-Infinity' | '-0' | 'NaN' }
  //   | { type: 'object'; handle?: string; internalId?: string; value?: [RemoteValue, RemoteValue][] }
  //   | { type: 'promise'; handle?: string; internalId?: string }
  //   | { type: 'proxy'; handle?: string; internalId?: string }
  //   | { type: 'regexp'; handle?: string; internalId?: string; value?: { flags?: string; pattern: string } }
  //   | { type: 'set'; handle?: string; internalId?: string; value?: RemoteValue[] }
  //   | { type: 'string'; value: string }
  //   | { type: 'symbol'; handle?: string; internalId?: string }
  //   | { type: 'typedarray'; handle?: string; internalId?: string }
  //   | { type: 'undefined' }
  //   | { type: 'weakref'; handle?: string; internalId?: string }
  //   | { type: 'window'; handle?: string; internalId?: string; value?: { context: string; isTopLevelContext: boolean } };

  export class RemoteValue {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handle?: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    internalId?: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sharedId?: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value?: any;
  }

  export class ChannelValue {
    channel: string;
    options?: SerializationOptions;
    resultOwnership?: 'none' | 'root';

    constructor(channel: string, options?: SerializationOptions, resultOwnership?: 'none' | 'root');
  }

  export class LocalValue {
    type: string;
    value?: unknown;

    constructor(type: string, value?: unknown);

    asMap(): Record<string, unknown>;
    static createArrayValue(value: unknown[]): LocalValue;
    static createBigIntValue(value: bigint | string): LocalValue;
    static createBooleanValue(value: boolean): LocalValue;
    static createChannelValue(value: ChannelValue): LocalValue;
    static createDateValue(value: string): LocalValue;
    static createMapValue(map: Record<string, unknown>): LocalValue;
    static createNullValue(): LocalValue;
    static createNumberValue(value: number): LocalValue;
    static createObjectValue(object: Record<string, unknown>): LocalValue;
    static createReferenceValue(handle: string, sharedId?: string): LocalValue;
    static createRegularExpressionValue(value: { flags?: string; pattern: string }): LocalValue;
    static createSetValue(value: unknown[]): LocalValue;
    static createSpecialNumberValue(value: number): LocalValue;
    static createStringValue(value: string): LocalValue;
    static createUndefinedValue(): LocalValue;
  }

  export class SerializationOptions {
    constructor(maxDomDepth?: number, maxObjectDepth?: number | null, includeShadowTree?: 'all' | 'none' | 'open');
  }
}
