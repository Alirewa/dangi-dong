/**
 * Palette for the exported image and PDF ONLY.
 *
 * These are duplicated from globals.css on purpose and MUST stay literal hex.
 * html-to-image reads computed styles, and Tailwind v4 emits `oklch()` plus a
 * layer of CSS-variable indirection that it cannot resolve — the observed
 * failure is blank or black regions in the exported PNG.
 *
 * The export card is a rendering artifact, not app UI, so it does not
 * participate in theming: it is always light, because that is what reads
 * correctly when pasted into a chat thread.
 *
 * Changing the brand color means changing it here AND in globals.css.
 */
export const SHARE_COLORS = {
  primary: '#0f766e',
  primaryDark: '#115e59',
  primarySoft: '#ccfbf1',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  positive: '#15803d',
  positiveSoft: '#dcfce7',
  negative: '#b91c1c',
  negativeSoft: '#fee2e2',
  warningSoft: '#fef3c7',
  warningText: '#92400e',
} as const;
