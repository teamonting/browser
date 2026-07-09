export default function registerErrorEventHandler() {
  window.addEventListener('error', ({ error }) =>
    console.log('🆖', { error: Object.fromEntries(Object.entries(error)) })
  );
}
