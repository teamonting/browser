type Fn<T = unknown> = () => Promise<T>;

// We could use `p-queue` and set `{ concurrency: 1 }` but it has too many features and too big.

/**
 * Creates a sequencer which sequence function calls with concurrency of 1.
 *
 * @returns A function, when called, will queue the passing function into the sequencer.
 */
function createSequencer(): <T>(fn: Fn<T>) => Promise<T> {
  const backlog: Fn<void>[] = [];
  let isBusy = false;

  async function kickoff() {
    if (isBusy) {
      return;
    }

    isBusy = true;

    try {
      let fn: Fn<void> | undefined;

      while ((fn = backlog.shift())) {
        await fn();
      }
    } finally {
      isBusy = false;
    }
  }

  return <T>(fn: Fn<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      backlog.push(async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });

      kickoff();
    });
}

export default createSequencer;
