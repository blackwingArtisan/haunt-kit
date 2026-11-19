/**
 * Registers the service worker written by hauntKitPwa(). Pass `enabled:
 * import.meta.env.PROD` so development servers never cache stale code.
 */
export async function registerServiceWorker({ enabled, url = './sw.js' }: { enabled: boolean; url?: string }) {
  if (!enabled || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(url, { scope: './' });
  } catch {
    // A failed registration only costs offline support; the walk still works online.
    return null;
  }
}

/** Resolves true once a service worker controls the page (offline-ready). */
export function whenOfflineReady(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(false);
  return navigator.serviceWorker.ready.then(() => true);
}
