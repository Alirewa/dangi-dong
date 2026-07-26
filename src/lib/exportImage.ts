import { captureBlob } from './capture';

export const SHARE_CARD_ID = 'dong-share-card';
export const STATEMENT_CARD_ID = 'dong-statement-card';

/** Telegram and WhatsApp re-compress anything larger, so 720×2 is the sweet spot. */
export const SHARE_WIDTH = 720;
export const STATEMENT_WIDTH = 794; // A4 at 96 dpi

export function buildShareBlob(dir: 'rtl' | 'ltr'): Promise<Blob> {
  return captureBlob(SHARE_CARD_ID, { width: SHARE_WIDTH, pixelRatio: 2, dir });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  triggerDownload(blob, filename);
}

/**
 * Share a pre-built blob.
 *
 * The blob MUST be built before the click handler runs. `navigator.share()`
 * requires transient user activation, and awaiting a capture inside the handler
 * consumes it — on iOS Safari that throws NotAllowedError. `useShareBlob`
 * pre-warms the blob so this function only awaits the share sheet itself.
 *
 * Returns false when file sharing is unavailable, so the caller can fall back
 * to a download.
 */
export async function shareBlob(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<boolean> {
  const file = new File([blob], filename, { type: 'image/png' });

  // canShare({ files }) is the real capability gate: desktop Chrome exposes
  // navigator.share but frequently cannot share files.
  if (!navigator.canShare?.({ files: [file] })) return false;

  try {
    await navigator.share({ files: [file], title, text });
    return true;
  } catch (err) {
    // A user-cancelled share sheet is not an error worth surfacing.
    if (err instanceof DOMException && err.name === 'AbortError') return true;
    return false;
  }
}

/** Filesystem-safe, keeping Persian letters (which are legal in filenames). */
export function safeFilename(base: string, ext: string): string {
  const cleaned = base
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${cleaned || 'dong'}.${ext}`;
}
