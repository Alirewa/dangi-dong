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
/**
 * The printable statement keeps a LIGHT palette.
 *
 * It shares the shape of SHARE_COLORS so StatementCard can swap one for the
 * other, but a dark A4 page is wrong to print and, more immediately, the PDF
 * capture is given a white background — html-to-image's `backgroundColor`
 * option overwrites the root node's own background, so dark text colours on a
 * forced-white root would render unreadable.
 */
export const STATEMENT_COLORS = {
  primary: '#0f766e',
  primaryDark: '#115e59',
  primarySoft: '#ccfbf1',
  background: '#ffffff',
  surface: '#f1f5f9',
  surfaceAlt: '#f8fafc',
  border: '#cbd5e1',
  text: '#0f172a',
  muted: '#475569',
  positive: '#15803d',
  positiveSoft: '#dcfce7',
  negative: '#b91c1c',
  negativeSoft: '#fee2e2',
  warningSoft: '#fef3c7',
  warningText: '#92400e',
} as const;

export const SHARE_COLORS = {
  primary: '#2dd4bf',
  primaryDark: '#0d2f2c',
  primarySoft: '#134e4a',
  /** page background — near-black so the card reads as a single object */
  background: '#0a0f1a',
  /** raised panels: the table body and the card block */
  surface: '#141c2b',
  surfaceAlt: '#111826',
  border: '#26314a',
  text: '#f8fafc',
  muted: '#8fa0b8',
  positive: '#34d399',
  positiveSoft: '#0d3b2e',
  negative: '#f87171',
  negativeSoft: '#3f1d1d',
  warningSoft: '#3d2a0c',
  warningText: '#fbbf24',
} as const;
