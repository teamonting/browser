type DoIntervalInit = {
  signal?: AbortSignal | undefined;
};

export default async function doInterval(
  fn: () => Promise<false | undefined>,
  intervalMS: number,
  init?: DoIntervalInit | undefined
) {
  const aborted = Promise.withResolvers<void>();
  const abortHandler = () => aborted.resolve();

  init?.signal?.addEventListener('abort', abortHandler, { once: true });

  try {
    while (!init?.signal?.aborted) {
      if ((await fn()) === false) {
        break;
      }

      await Promise.race([aborted.promise, new Promise<void>(resolve => setTimeout(resolve, intervalMS))]);
    }
  } finally {
    init?.signal?.removeEventListener('abort', abortHandler);
  }
}
