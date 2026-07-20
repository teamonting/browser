type InMemorySnapshotStoreInit = {
  getShouldUpdateSnapshot?: (() => boolean) | undefined;
};

class InMemorySnapshotStore {
  constructor(init?: InMemorySnapshotStoreInit | undefined) {
    this.#getShouldUpdateSnapshot = init?.getShouldUpdateSnapshot ?? (() => false);
  }

  #bucket: ArrayBuffer[] = [];
  #getShouldUpdateSnapshot: () => boolean;

  async get(index: number, _type: 'image/png'): Promise<ArrayBuffer | undefined> {
    if (this.#getShouldUpdateSnapshot()) {
      return;
    }

    return this.#bucket[index];
  }

  async set(index: number, _type: 'image/png', data: ArrayBuffer): Promise<void> {
    this.#bucket[index] = data;
  }
}

export default InMemorySnapshotStore;
export type { InMemorySnapshotStoreInit };
