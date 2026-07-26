# Dangi Dong — دنگ‌بندی

An offline-first PWA for splitting shared expenses between housemates and friends. No account, no server, no tracking — everything lives in your browser.

### 🔗 [Live demo — alirewa.github.io/dangi-dong](https://alirewa.github.io/dangi-dong/)

Open it on a phone or desktop and use your browser's **Install** option to add it as a real app.

[![Deploy](https://github.com/Alirewa/dangi-dong/actions/workflows/deploy.yml/badge.svg)](https://github.com/Alirewa/dangi-dong/actions/workflows/deploy.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149ECA)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8)
![PWA](https://img.shields.io/badge/PWA-offline--first-0F766E)
![Tests](https://img.shields.io/badge/tests-79%20passing-15803D)

## Features

- **Two group types.** A monthly ledger for housemates, settled month by month, and a one-off event group (restaurant, trip) where guests can be added temporarily without polluting your saved contacts.
- **Three ways to split.** Equally, by multiplier for whoever consumed more, or by exact amounts. In exact mode a blank box joins the equal split of the remainder — so one expense can hold both a personal item and a shared bill.
- **Multiple payers.** Any expense can be paid by several people. The app computes each person's net balance and the fewest money movements needed to settle up.
- **Main payer card.** The person who fronted the money is shown with their card number and IBAN, both checksum-validated, with one-tap copy.
- **Exports.** A share image for chat apps, a plain-text summary, a printable A4 PDF, and a JSON backup you can restore on another device.
- **Bilingual and themed.** Persian and English with full RTL/LTR mirroring, Jalali dates, Persian-Indic digits, and light/dark/system themes.

## Stack

Next.js 16 (App Router, static export) · React 19 · TypeScript strict · Tailwind CSS v4 (CSS-first) · Zustand with `persist` · a hand-rolled service worker.

## Commands

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm test
```

`npm run build` also runs `scripts/build-sw.mjs`, which hashes everything in `out/` into a precache manifest and writes `out/sw.js`. It fails the build if the precache exceeds 6 MB.

Also available: `npm run type-check` and `npm run lint`.

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. It runs type-check, lint and the test suite first, so a broken build never reaches the demo. The site is served from a subdirectory, so the workflow sets `NEXT_PUBLIC_BASE_PATH=/dangi-dong` and writes a `.nojekyll` file — without it, Pages discards the `_next/` directory.

**One caveat specific to GitHub Pages:** it does not allow custom response headers, so `sw.js` cannot be served with `Cache-Control: no-cache`. The service worker still updates in practice, but a stale copy can linger longer than it should. **Settings → Clear cache and reload** unregisters every service worker and clears all caches without touching your data.

To host it elsewhere, the build produces a fully static `out/`. Serve it over **HTTPS** — required for service workers and for the clipboard API.

## Data and privacy

Everything is stored in `localStorage` in your browser. Nothing is transmitted anywhere: there is no backend and no analytics. Your data is never cleared automatically — only the explicit **Erase all data** action in Settings removes it.

The consequences are real and the app says so in its own UI: clearing browser data erases everything, and iOS Safari evicts storage for sites unused for 7 days **unless the PWA is installed to the home screen**. That is why the install prompt is framed as data safety, why the app requests persistent storage, and why it asks for a JSON backup after 30 days. Private browsing loses everything when the tab closes.

Note that the JSON backup file contains any saved card numbers.

## Architecture notes

`AGENTS.md` lists the constraints that shaped the code. The load-bearing ones:

- **Static export forbids dynamic routes**, so there is no `/group/[id]`. Routes are flat and the active group lives in the store as `activeGroupId`.
- **`skipHydration: true`** on the persist config, because defaults use `crypto.randomUUID()` and `Date.now()`. `StoreHydrator` rehydrates in an effect, and every page reading persisted state sits inside `<HydrationGate>`.
- **All money is integer Toman.** `lib/money.ts` allocates by largest remainder so shares sum *exactly* to the expense total; that exactness is what guarantees net balances sum to zero and keeps the settlement free of floating-point error. Outside production, a red strip appears on the settlement screen if any invariant breaks.
- **`components/share/*` does not use Tailwind classes.** html-to-image cannot resolve Tailwind v4's `oklch()` and CSS-variable indirection, so the export cards use literal hex in inline styles and are always light. See `shareColors.ts`.
- **Every displayed number goes through `<Money>` or `<Count>`.** A bare number inside RTL text is reordered by the bidi algorithm into a different, plausible-looking value.
- **Dates are stored as ISO Gregorian** and converted only at the UI boundary. Jalali entry and display are handled in `lib/jalali.ts`.

Store schema changes ship with a migration: v2 converted group emoji to icon keys, v3 introduced the owner (“you”) identity, v4 added usage tracking. Older JSON backups are mapped through the same paths on import.

## Testing

79 unit tests cover the settlement engine, integer money allocation, Jalali conversion, bank validation and backup parsing — including a 500-case randomized property test asserting that shares always sum to the expense total and net balances always sum to zero.

Verified in-browser against a hand-calculated four-person scenario across equal, weighted, excluded-member, multi-payer and mixed-exact splits, in both languages and at both exact and rounded settings. The live deployment is verified to register its service worker and precache all build files.

**Not yet verified on physical devices** — the highest-risk remaining items:

- PNG and PDF rasterization. The capture pipeline's inputs are verified (fonts load, no unsupported color functions in the export cards), but html-to-image's rasterization cannot run in a non-compositing headless browser. Test on Android Chrome, iOS Safari and Windows Chrome.
- `navigator.share` on iOS, where transient user activation is easily lost. The share image is pre-built to avoid this; if it still fails, split it into two taps.
- Installing to the home screen and cold-launching in airplane mode.

## License

MIT

---

by [@Alirewa](https://github.com/Alirewa)
