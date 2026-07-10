import registerElementTranslator from './registerElementTranslator.ts';
import registerErrorEventHandler from './registerErrorEventHandler.ts';

registerElementTranslator();
registerErrorEventHandler();

export { default as getStub } from './getStub.ts';
