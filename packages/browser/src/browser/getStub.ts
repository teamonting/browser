import type { StubDeclaration, StubImplementation } from '@onting/rpc';
import { createClientStub } from '@onting/rpc/client.js';
import { messagePort } from '@onting/selenium-webdriver-message-port/browser.js';
import defaultStubDeclaration from '@onting/stub';
import { workthru } from 'workthru/async';
import { isMarshalledElement } from '../common/marshalledElement.ts';
import { marshalDOMElement, unmarshalToDOMElement } from '../common/marshalledElement.browser.ts';

function getStub(stubDeclaration?: StubDeclaration<StubImplementation> | undefined) {
  return createClientStub(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (stubDeclaration ?? defaultStubDeclaration) as any,
    messagePort,
    {
      async marshal(value: unknown) {
        return await workthru(value, async value =>
          value instanceof Element ? await marshalDOMElement(value) : value
        );
      },
      async unmarshal(value: unknown) {
        return await workthru(value, async value =>
          isMarshalledElement(value) ? await unmarshalToDOMElement(value) : value
        );
      }
    }
  );
}

export default getStub;
