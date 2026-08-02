'use client';

import { useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import {
  notificationSupport,
  requestNotificationPermission,
  showReminder,
  type NotificationSupport,
} from '@/lib/reminder';
import { Button } from '@/components/ui/Button';

/**
 * The reminder toggle.
 *
 * Permission is requested from this click and nowhere else: browsers only
 * honour `Notification.requestPermission()` inside a user gesture, and Chrome
 * permanently blocks origins that ask on load.
 */
export function ReminderSetting() {
  const { t } = useT();
  const enabled = useDongStore((s) => s.settings.dailyReminder);
  const setDailyReminder = useDongStore((s) => s.setDailyReminder);
  const pushToast = useDongStore((s) => s.pushToast);

  // A one-time read of the environment, so it belongs in a lazy initializer.
  // Safe from an SSR mismatch because this sits inside <HydrationGate>, which
  // renders nothing until after hydration.
  const [support, setSupport] = useState<NotificationSupport>(() => notificationSupport());

  if (support === 'unsupported') {
    return <p className="text-xs leading-relaxed text-muted">{t.reminder.unsupported}</p>;
  }

  const on = enabled && support === 'granted';

  const enable = async () => {
    const result = await requestNotificationPermission();
    setSupport(result);
    if (result !== 'granted') {
      pushToast('error', t.reminder.blocked);
      return;
    }
    setDailyReminder(true);
    pushToast('success', t.reminder.enabled);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-muted">{t.reminder.settingsHint}</p>

      {support === 'denied' ? (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning">
          {t.reminder.blocked}
        </p>
      ) : on ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            block
            icon={<BellOff className="size-4" aria-hidden="true" />}
            onClick={() => setDailyReminder(false)}
          >
            {t.reminder.disable}
          </Button>
          <Button
            variant="secondary"
            block
            icon={<BellRing className="size-4" aria-hidden="true" />}
            onClick={() => void showReminder(t.reminder.title, t.reminder.body)}
          >
            {t.reminder.test}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          block
          icon={<Bell className="size-4" aria-hidden="true" />}
          onClick={() => void enable()}
        >
          {t.reminder.enable}
        </Button>
      )}

      {/* Say plainly what a serverless PWA can and cannot do, rather than
          letting the user discover the gap at 13:31. */}
      <p className="text-xs leading-relaxed text-muted">{t.reminder.limitation}</p>
    </div>
  );
}
