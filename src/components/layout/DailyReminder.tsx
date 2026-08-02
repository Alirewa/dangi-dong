'use client';

import { useEffect } from 'react';
import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import {
  msUntilNextReminder,
  notificationSupport,
  shouldNotifyNow,
  showReminder,
} from '@/lib/reminder';
import { todayIso } from '@/lib/utils';

/**
 * Fires the daily "log today's spending" reminder.
 *
 * Honest limitation: this is a serverless static PWA, so there is no push
 * channel and no reliable background scheduler — Notification Triggers never
 * shipped, and Periodic Background Sync is Chrome-only and needs an installed
 * app. The reminder therefore fires when the app is running, plus a catch-up
 * the next time it is opened after 13:30. Installing the app to the home
 * screen is what makes that "next open" happen often enough to be useful.
 */
export function DailyReminder() {
  const { t } = useT();
  const hydrated = useDongStore((s) => s.hydrated);
  const enabled = useDongStore((s) => s.settings.dailyReminder);
  const lastReminderOn = useDongStore((s) => s.settings.lastReminderOn);
  const markReminderShown = useDongStore((s) => s.markReminderShown);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    if (notificationSupport() !== 'granted') return;

    let cancelled = false;

    const fire = () => {
      if (cancelled) return;
      const state = useDongStore.getState();
      // Re-read from the store: this closure can outlive the render that made it.
      if (!shouldNotifyNow(state.settings.lastReminderOn)) return;
      void showReminder(t.reminder.title, t.reminder.body);
      markReminderShown(todayIso());
    };

    // Catch up on a slot that passed while the app was closed.
    fire();

    // Land exactly on the next 13:30…
    const timer = setTimeout(fire, msUntilNextReminder());
    // …and poll as a safety net, because a background tab's timers are
    // throttled and a laptop that sleeps through 13:30 never fires the timeout.
    const poll = setInterval(fire, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [hydrated, enabled, lastReminderOn, markReminderShown, t]);

  return null;
}
