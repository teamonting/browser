function tryGetPropertyValue<T extends string, U>(
  value: { [P in T]: U },
  key: T,
  fallbackValue?: U | undefined
): U | undefined {
  try {
    return value[key];
  } catch {
    // Get property could throw, ignore them.
    return fallbackValue;
  }
}

export default function registerErrorEventHandler() {
  window.addEventListener('error', ({ error }) =>
    console.log('🆖', {
      error:
        error && typeof error === 'object'
          ? {
              cause: tryGetPropertyValue(error, 'cause'),
              columnNumber: tryGetPropertyValue(error, 'columnNumber'),
              fileName: tryGetPropertyValue(error, 'fileName'),
              lineNumber: tryGetPropertyValue(error, 'lineNumber'),
              name: tryGetPropertyValue(error, 'name'),
              stack: tryGetPropertyValue(error, 'stack')
            }
          : error
    })
  );
}
