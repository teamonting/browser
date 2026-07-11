function tryGetPropertyValue<T extends string>(value: { [P in T]: any }, key: T): any {
  try {
    return value[key];
  } catch {
    // Get property could throw, ignore them.
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
