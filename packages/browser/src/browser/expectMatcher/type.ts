import type stubDeclaration from '@onting/stub';
import type { InferStub } from '@onting/rpc';

type Stub = InferStub<typeof stubDeclaration>;

export type { Stub };
