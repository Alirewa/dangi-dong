# دنگ‌بندی — dong-system

تقسیم هزینه‌های مشترک بین دوستان و هم‌خانه‌ای‌ها. کاملاً آفلاین، بدون حساب کاربری، بدون سرور.

An offline-first PWA for splitting shared expenses, in Persian and English.

## What it does

- **دو حالت** — گروه ماهانه (هم‌خانه‌ای‌ها، هر ماه جداگانه) و گروه دورهمی (رستوران، سفر) با امکان تعریف نفرات موقت.
- **سه روش تقسیم** — مساوی، با ضریب (مثلاً کسی که دو برابر خورده)، و مبلغ دقیق. در حالت مبلغ دقیق، کادر خالی یعنی «باقی‌مانده را مساوی تقسیم کن» — پس یک هزینه می‌تواند هم‌زمان قلم شخصی و سهم مشترک داشته باشد.
- **چند پرداخت‌کننده** — هر هزینه می‌تواند توسط چند نفر پرداخت شده باشد؛ سیستم بدهی خالص هر نفر و کمترین جابه‌جایی پول را حساب می‌کند.
- **مادرخرج** — نمایش کسی که بیشترین مبلغ را پرداخت کرده، همراه با شماره کارت و شبا (با اعتبارسنجی و دکمه کپی).
- **خروجی** — تصویر PNG برای تلگرام/واتساپ، کپی متن، PDF قابل چاپ، و فایل پشتیبان JSON.

## Stack

Next.js 16 (App Router, `output: 'export'`) · React 19 · TypeScript strict · Tailwind v4 (CSS-first) · zustand 5 with `persist` · hand-rolled service worker.

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

The build produces a fully static `out/`. Upload it anywhere that serves static files over **HTTPS** (required for service workers and for `navigator.clipboard`).

**One hosting rule matters:** `sw.js` must be served with `Cache-Control: no-cache`. If a stale service worker gets cached, users can be pinned to an old build with no way to update. `static-export.htaccess` sets this for Apache — rename it to `.htaccess` alongside the upload. On other hosts, configure the equivalent header yourself.

If the app is served from a subdirectory, set `NEXT_PUBLIC_BASE_PATH=/subdir` before building.

There is an escape hatch in **تنظیمات → پاک‌سازی حافظه و بازخوانی** that unregisters all service workers and clears caches without touching user data.

## Data and privacy

Everything lives in `localStorage` in the user's browser. Nothing is transmitted anywhere — there is no backend and no analytics.

The consequence is real and the UI says so: clearing browser data erases everything, and iOS Safari evicts storage for sites unused for 7 days **unless the PWA is installed to the home screen**. That is why the install prompt is framed as data safety, why the app requests `navigator.storage.persist()`, and why it nags for a JSON backup after 30 days. Private/incognito browsing loses everything when the tab closes.

Note that the JSON backup file contains any saved card numbers.

## Architecture notes

Read `AGENTS.md` first — it lists the constraints that shaped the code. The load-bearing ones:

- **`output: 'export'` forbids dynamic routes**, so there is no `/group/[id]`. Routes are flat and the active group lives in the store as `activeGroupId`.
- **`skipHydration: true`** on the persist config, because defaults use `crypto.randomUUID()` and `Date.now()`. `StoreHydrator` rehydrates in an effect and every page reading persisted state sits inside `<HydrationGate>`.
- **All money is integer Toman.** `lib/money.ts` allocates by largest remainder so shares sum *exactly* to the expense total; that exactness is what guarantees `Σ net === 0` and makes the settlement solvable with no floating-point epsilon anywhere. Outside production, a red strip appears on `/settle/` if any invariant breaks.
- **`components/share/*` does not use Tailwind classes.** html-to-image cannot resolve Tailwind v4's `oklch()` and CSS-variable indirection, so the export cards use literal hex in inline styles and are always light. See `shareColors.ts`.
- **Every displayed number goes through `<Money>` or `<Count>`.** A bare number inside RTL text gets reordered by the bidi algorithm into a different, plausible-looking value.

## Testing status

66 unit tests cover the settlement engine, money allocation, bank validation and backup parsing, including a 500-case randomized property test asserting the core invariants.

Verified in-browser against a hand-calculated 4-person, 5-expense scenario (equal, weighted, excluded-member, multi-payer and mixed exact splits) in both locales, at exact and 1,000-Toman rounding.

**Not yet verified on real devices** — these need a physical phone and are the highest-risk remaining items:

- PNG/PDF rasterization. The capture pipeline's inputs are verified (fonts load, no unsupported color functions in the export cards), but html-to-image's actual rasterization cannot run in a non-compositing headless pane. Test on Android Chrome, iOS Safari and Windows Chrome.
- `navigator.share` on iOS, where transient user activation is easily lost. `useShareBlob` pre-warms the image to avoid this; if it still fails, split it into two taps.
- Installation and offline cold-launch on all three platforms.
