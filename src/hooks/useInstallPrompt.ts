'use client';

import { useCallback, useEffect, useState } from 'react';
import { isInAppBrowser, isIos, isStandalone } from '@/lib/pwa';

export type InstallState = 'installed' | 'available' | 'ios-manual' | 'in-app' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * One hook covering all three target platforms.
 *
 * `beforeinstallprompt` handles Android Chrome AND Windows Chrome/Edge — two of
 * the three targets on one code path. iOS Safari fires no such event at all
 * and needs the manual Share → Add to Home Screen instructions instead, which
 * is why 'ios-manual' is a distinct state rather than a fallback.
 */
export function useInstallPrompt(): {
  state: InstallState;
  promptInstall: () => Promise<boolean>;
} {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // Platform detection is a one-time read of the environment, so it belongs in
  // a lazy initializer rather than an effect. Safe from SSR mismatch because
  // every consumer sits inside <HydrationGate>, which does not render its
  // children until after hydration.
  const [state, setState] = useState<InstallState>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (isStandalone()) return 'installed';
    if (isInAppBrowser()) return 'in-app';
    if (isIos()) return 'ios-manual';
    return 'unsupported';
  });

  useEffect(() => {
    // Only the beforeinstallprompt path needs listeners; the others are static.
    if (state !== 'unsupported') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setState('available');
    };
    const onInstalled = () => {
      setDeferred(null);
      setState('installed');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [state]);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use; a dismissed prompt cannot be re-shown.
    setDeferred(null);
    if (outcome === 'accepted') setState('installed');
    return outcome === 'accepted';
  }, [deferred]);

  return { state, promptInstall };
}
