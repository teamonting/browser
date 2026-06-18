import type { StubDeclaration, StubImplementation } from '@onting/rpc';
import { createClientStub } from '@onting/rpc/client.js';
import { messagePort } from '@onting/selenium-webdriver-message-port/browser.js';
import defaultStubDeclaration from '@onting/stub';

function getStub(stubDeclaration?: StubDeclaration<StubImplementation> | undefined) {
  return createClientStub(stubDeclaration ?? defaultStubDeclaration, messagePort);
}

export default getStub;
