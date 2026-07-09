import registerElementTranslator from './registerElementTranslator.ts';
import registerErrorEventHandler from './registerErrorEventHandler.ts';

registerElementTranslator();
registerErrorEventHandler();

export { default as createExpectMatcher } from './expectMatcher/createExpectMatcher.ts';
export { default as getStub } from './getStub.ts';
