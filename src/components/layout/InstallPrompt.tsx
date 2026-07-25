'use client';

import { useState } from 'react';
import { Download, ShieldCheck, X } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useDongStore } from '@/store/dongStore';
import { Button } from '@/components/ui/Button';
import { ActionButton } from '@/components/ui/ActionButton';
import { Count } from '@/components/ui/Money';
import { Sheet } from '@/components/ui/Sheet';

const DISMISS_DAYS = 14;

export function InstallPrompt() {
  const { t } = useT();
  const { state, promptInstall } = useInstallPrompt();
  const dismissedAt = useDongStore((s) => s.settings.installBannerDismissedAt);
  const dismiss = useDongStore((s) => s.dismissInstallBanner);
  const [iosOpen, setIosOpen] = useState(false);
  // Read the clock once on mount: calling Date.now() during render makes the
  // component non-idempotent, and this decision does not need to re-evaluate.
  const [mountedAt] = useState(() => Date.now());

  const recentlyDismissed =
    dismissedAt !== null &&
    mountedAt - new Date(dismissedAt).getTime() < DISMISS_DAYS * 24 * 60 * 60 * 1000;

  if (state === 'installed' || state === 'unsupported' || recentlyDismissed) return null;

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary-soft p-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t.install.bannerTitle}</p>
          {/* Framed as data safety, not convenience — with localStorage-only
              persistence, installing genuinely protects the user's data. */}
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {state === 'in-app' ? t.install.inAppBrowser : t.install.bannerDesc}
          </p>
          {state !== 'in-app' && (
            <Button
              size="sm"
              className="mt-2"
              icon={<Download className="size-4" aria-hidden="true" />}
              onClick={() => {
                if (state === 'ios-manual') setIosOpen(true);
                else void promptInstall();
              }}
            >
              {t.install.installNow}
            </Button>
          )}
        </div>
        <ActionButton icon={<X className="size-4" aria-hidden="true" />} onClick={dismiss}>
          {t.install.later}
        </ActionButton>
      </div>

      <Sheet open={iosOpen} onClose={() => setIosOpen(false)} title={t.install.iosTitle}>
        <ol className="space-y-4">
          {[t.install.iosStep1, t.install.iosStep2, t.install.iosStep3].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg">
                <Count value={i + 1} />
              </span>
              <span className="pt-1 text-sm leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-lg bg-warning-soft p-3 text-xs leading-relaxed text-warning">
          {t.install.iosSafariOnly}
        </p>
      </Sheet>
    </>
  );
}
