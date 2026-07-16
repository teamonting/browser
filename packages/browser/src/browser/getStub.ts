import type { AnyStub, InferClient, StubContract } from '@onting/rpc';
import { createClientStub } from '@onting/rpc/client.js';
import { messagePort } from '@onting/selenium-webdriver-message-port/browser.js';
import type { Stub } from '@onting/stub';
import { workthru } from 'workthru/async';
import { marshalDOMElement, unmarshalToDOMElement } from '../common/marshalledElement.browser.ts';
import { isMarshalledElement } from '../common/marshalledElement.ts';
import { isMarshalledError, marshalError, unmarshalError } from '../common/marshalledError.ts';

async function getStub(contract?: undefined): Promise<InferClient<StubContract<Stub>>>;

async function getStub<T extends StubContract<AnyStub>>(contract: T): Promise<InferClient<T>>;

async function getStub<T extends StubContract<AnyStub>>(
  contract?: T | undefined
): Promise<InferClient<T | StubContract<Stub>>> {
  return createClientStub<T | StubContract<Stub>>(contract ?? (await import('@onting/stub')).default, messagePort, {
    async marshal(value: unknown) {
      return await workthru(value, async value =>
        value instanceof Element ? await marshalDOMElement(value) : value instanceof Error ? marshalError(value) : value
      );
    },
    async unmarshal(value: unknown) {
      return await workthru(value, async value =>
        isMarshalledElement(value)
          ? await unmarshalToDOMElement(value)
          : isMarshalledError(value)
            ? unmarshalError(value)
            : value
      );
    }
  });
}

export default getStub;
