const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const SW_URL = `${basePath}/sw.js`;
export const SW_SCOPE = `${basePath}/`;

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's non-standard flag; it never sets display-mode: standalone.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac; touch points disambiguate.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * In-app browsers (Telegram, Instagram, Facebook) cannot install a PWA and
 * give no indication of it — worth detecting so we can tell the user to open
 * the page in a real browser instead of showing a button that does nothing.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /FBAN|FBAV|Instagram|Line\/|Telegram|MicroMessenger|Twitter/i.test(navigator.userAgent);
}

export interface SwHandle {
  onWaiting: (cb: () => void) => void;
  skipWaiting: () => void;
}

/**
 * Registers the service worker in production and reports when a new version is
 * parked in `waiting`.
 *
 * Never auto-reloads: an update landing mid-edit would discard a half-filled
 * expense form. The user taps the toast instead.
 */
export function registerServiceWorker(onWaiting: () => void): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  if (process.env.NODE_ENV !== 'production') {
    // A stale SW from a production build served on the same origin/port will
    // happily serve dev traffic from cache. Clear it.
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => void r.unregister());
    });
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(SW_URL, { scope: SW_SCOPE })
      .then((registration) => {
        if (registration.waiting) onWaiting();

        registration.addEventListener('updatefound', () => {
          const next = registration.installing;
          if (!next) return;
          next.addEventListener('statechange', () => {
            // `controller` present means this is an update, not a first install.
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              onWaiting();
            }
          });
        });
      })
      .catch(() => {
        /* offline-first is a bonus; never break the app over it */
      });
  });
}

export async function applyUpdateAndReload(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    // The new worker takes control, then we reload once.
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
      once: true,
    });
  } else {
    window.location.reload();
  }
}

/** Escape hatch for a bad deploy: drop every SW and cache, then reload. */
export async function clearCachesAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}

/**
 * Asks the browser to exempt our localStorage from eviction. iOS Safari clears
 * storage for sites unused for 7 days unless the PWA is installed, so this is
 * a data-safety measure, not an optimization.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* ignore */
  }
  return false;
}
