import createToMatchImageSnapshot, { type ImageSnapshotMatcher } from './private/createToMatchImageSnapshot.ts';
import type { Stub } from './type.ts';

export default function createExpectMatcher(stub: Stub): { readonly toMatchImageSnapshot: ImageSnapshotMatcher } {
  return Object.freeze({ toMatchImageSnapshot: createToMatchImageSnapshot(stub) });
}
