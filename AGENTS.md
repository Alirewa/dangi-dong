<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# dong-system

Offline-first PWA for splitting shared expenses (دنگ‌بندی). No backend, no account — all data lives in `localStorage`.

## Hard constraints

- **`output: 'export'`** — no server actions, no route handlers, no middleware, no dynamic routes. Routes are flat; the active group lives in the store as `activeGroupId`, not in the URL.
- **`skipHydration: true`** on the zustand persist config. Defaults use `crypto.randomUUID()` / `Date.now()`, so hydration must happen client-side in `StoreHydrator`. Every page reading persisted state sits inside `<HydrationGate>`.
- **All money is integer Toman.** No floats anywhere in `lib/money.ts` or `lib/settlement.ts`. The invariants `Σ shares === expense.amount` and `Σ net === 0` are what make settlement solvable — do not break them.
- **`src/components/share/*` deliberately does not use Tailwind classes.** `html-to-image` chokes on Tailwind v4's `oklch()` and CSS-variable indirection. Those components use hardcoded hex in inline styles. See `SHARE_COLORS`.
- **Every displayed amount goes through `<Money>`** (`dir="ltr"; unicode-bidi:isolate`). Bare numbers reorder inside RTL text and produce plausible-but-wrong output.

## Conventions

Semicolons, single quotes, `PascalCase.tsx` components, `@/*` → `./src/*`.
Store actions follow `addX` / `updateX(id, Partial<X>)` / `removeX(id)` with immutable spreads (no immer).
Dates are stored as ISO Gregorian `YYYY-MM-DD` and converted only at the UI boundary.
