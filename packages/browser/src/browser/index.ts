import registerElementTranslator from './private/registerElementTranslator.ts';
import registerErrorEventHandler from './private/registerErrorEventHandler.ts';

registerElementTranslator();
registerErrorEventHandler();

export { default as getStub } from './getStub.ts';
