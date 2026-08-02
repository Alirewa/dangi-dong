import { todayIso } from './utils';

/** Local time the reminder is due, in 24h form. */
export const REMINDER_HOUR = 13;
export const REMINDER_MINUTE = 30;

export type NotificationSupport = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationSupport;
}

/**
 * Permission must be requested from a user gesture — browsers reject (and
 * Safari ignores) an unprompted call, and Chrome permanently blocks origins
 * that ask on load.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as NotificationSupport;
  } catch {
    return 'denied';
  }
}

/** Milliseconds until the next 13:30 local, always positive. */
export function msUntilNextReminder(now = new Date()): number {
  const due = new Date(now);
  due.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  if (due.getTime() <= now.getTime()) due.setDate(due.getDate() + 1);
  return due.getTime() - now.getTime();
}

/** True once today's 13:30 has passed. */
export function isReminderDue(now = new Date()): boolean {
  const due = new Date(now);
  due.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
  return now.getTime() >= due.getTime();
}

/**
 * Whether today's reminder still needs showing.
 *
 * `lastReminderOn` is a local ISO date, so the check is "has today's slot
 * passed and have we not already fired for this date".
 */
export function shouldNotifyNow(lastReminderOn: string | null, now = new Date()): boolean {
  return isReminderDue(now) && lastReminderOn !== todayIso(now);
}

/**
 * Show the reminder.
 *
 * Prefers the service worker registration: on Android, `new Notification()` is
 * not allowed from a page and throws, while `showNotification` works and the
 * notification survives the tab closing.
 */
export async function showReminder(title: string, body: string): Promise<boolean> {
  if (notificationSupport() !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          // Replaces rather than stacks if one is somehow still on screen.
          tag: 'dong-daily-reminder',
        });
        return true;
      }
    }
    new Notification(title, { body, tag: 'dong-daily-reminder' });
    return true;
  } catch {
    return false;
  }
}
