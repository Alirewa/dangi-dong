/**
 * Palette for the exported image and PDF ONLY.
 *
 * These are duplicated from globals.css on purpose and MUST stay literal hex.
 * html-to-image reads computed styles, and Tailwind v4 emits `oklch()` plus a
 * layer of CSS-variable indirection that it cannot resolve — the observed
 * failure is blank or black regions in the exported PNG.
 *
 * The export card is a rendering artifact, not app UI, so it does not follow
 * the app theme: it is always dark, which is what the author wanted and what
 * stands out in a chat thread full of light message bubbles.
 *
 * Changing the brand color means changing it here AND in globals.css.
 */
export const SHARE_COLORS = {
  primary: '#2dd4bf',
  primaryDark: '#0b3b38',
  primarySoft: '#134e4a',
  background: '#0b1220',
  surface: '#131f33',
  surfaceAlt: '#0f1a2b',
  border: '#25344b',
  text: '#f1f5f9',
  muted: '#94a3b8',
  positive: '#4ade80',
  positiveSoft: '#14532d',
  negative: '#f87171',
  negativeSoft: '#4c1d1d',
  warningSoft: '#4a2f0a',
  warningText: '#fbbf24',
} as const;
