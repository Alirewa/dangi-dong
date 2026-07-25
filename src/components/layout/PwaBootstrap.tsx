'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { applyUpdateAndReload, registerServiceWorker } from '@/lib/pwa';
import { Button } from '@/components/ui/Button';

/**
 * Registers the service worker and surfaces a manual update prompt.
 * Kept separate from StoreHydrator so PWA plumbing never blocks hydration.
 */
export function PwaBootstrap() {
  const { t } = useT();
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    registerServiceWorker(() => setUpdateReady(true));
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      className="safe-bottom fixed inset-x-0 bottom-0 z-[110] flex justify-center px-4 pb-2"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 shadow-lg">
        <span className="text-sm font-medium">{t.update.available}</span>
        <Button
          size="sm"
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
          onClick={() => void applyUpdateAndReload()}
        >
          {t.update.reload}
        </Button>
      </div>
    </div>
  );
}
