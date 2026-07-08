import type { SnapshotStore } from '@onting/stub';
import type InMemorySnapshotStore from './InMemorySnapshotStore';

const INITIAL_INDEX = -1;

class InMemorySnapshotStoreView implements SnapshotStore {
  constructor(store: InMemorySnapshotStore) {
    this.#store = store;
  }

  #index: number = INITIAL_INDEX;
  #store: InMemorySnapshotStore;

  async getNext(type: 'image/png'): Promise<string | undefined> {
    return this.#store.get(++this.#index, type);
  }

  async setCurrent(type: 'image/png', data: string): Promise<void> {
    if (this.#index !== INITIAL_INDEX) {
      this.#store.set(this.#index, type, data);
    }
  }
}

export default InMemorySnapshotStoreView;
