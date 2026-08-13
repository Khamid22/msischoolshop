# AGENTS.md

React 19 + TypeScript + Vite shop (MSI Bot Shop). No test suite.

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build` (typecheck via `tsc -b`, no `tsc --noEmit` flag needed)
- `npm run lint` — oxlint (`.oxlintrc.json`). No formatter configured.
- `npm run preview` — serve built `dist/`

No tests exist; `npm run lint` + `npm run build` are the verification steps.

## Architecture
- **Multi-entry build** (vite.config.ts): `index.html` = React storefront, plus `admin.html` and `admin-login.html` as inputs.
- `admin.html` / `admin-login.html` are **plain HTML + inline vanilla JS at repo root** (NOT React) — not covered by `tsc -b` or oxlint, so edits there are never typechecked/linted. Styles come from `/admin/*.css` in `public/`.
- React app entry: `src/main.tsx` -> `src/App.tsx`. State via contexts in `src/contexts/` (Auth, Cart, Favorites, Lang, Notifications, Theme) wrapping an inline page router (view state in App, no react-router).

## Data layer: localStorage mock, no backend
- `src/api.ts` is a mock API; every function reads/writes `localStorage` under `msi_*` keys (`msi_products`, `msi_banners`, `msi_news`, `msi_orders`, `msi_users`, `msi_current_user`, `msi_notifications`, `msi_grant_log`). Swap to `fetch` when a backend exists — all TODO comments point to that.
- Only `fetchProducts` / `fetchBanners` / `fetchNews` / `fetchOrders` are consumed by the React app. The other `api.ts` exports (product/banner/news CRUD, `fetchSlots`, `login`/`logout`/`isAuthenticated`) are **unused** — `admin.html` reimplements the same operations inline in its own vanilla JS. A backend migration must rewrite `admin.html` too.
- Some storefront code bypasses `api.ts` entirely: `CartContext` writes `msi_orders` directly (placing an order = deduct balance via `AuthContext.spendStars`, write order with `status: 'paid'`), and `AuthContext` owns `msi_users`/`msi_current_user`.
- `seed()` in `api.ts` migrates/backfills stored data against `DEFAULT_*` arrays, gated by `msi_*_seeded` flags. Because data persists in localStorage, changing defaults in code won't be visible until existing storage is reset (or the migration logic in `seed()` covers it). Clear the `msi_*` keys in dev to force re-seed.
- Admin and storefront share the same `msi_products`/`msi_banners`/`msi_news`/`msi_orders`/`msi_users` keys, so edits are visible on both sides (storefront re-syncs on storage events / focus).

## Auth (do not conflate the three)
- **Storefront users (React):** `AuthContext` authenticates students by email + password against `msi_users`; the active user is cached in `msi_current_user`. Demo login: `aisha@msi.uz` / `demo` (seeded by `seed()`). Student discounts and balance live on the user record.
- **Admin panel (vanilla JS):** `admin-login.html` hardcodes `ADMIN_PASSWORD = '123456789'` and sets `sessionStorage['msi_admin_auth'] = '1'`; `admin.html` redirects to `admin-login.html` unless that flag is set. The storefront Header links straight to `/admin-login.html`.
- **Dead-code gotcha:** `src/api.ts` also exports `login`/`logout`/`isAuthenticated` (same password `123456789`, writes a **boolean to `localStorage`** `msi_admin_auth`) — the React app never calls them. If the password changes, update `admin-login.html`; if you ever wire up the `api.ts` auth, don't let it collide with the admin `sessionStorage` usage of the same key name.

## i18n
- `src/data/translations.ts` (ru/uz/en) via `LangContext`. Products, banners, and news carry `nameKey`/`descKey` that reference translation keys; `name`/`description` fields are fallbacks. Always add keys to all three languages.

## Styling
- Per-component SCSS imported in each component (e.g. `Header.tsx` imports `./Header.scss`).
- Design tokens: `src/styles/tokens.scss`; design-system component layer: `src/styles/nocturne.scss` (labeled "source of truth" for the design system); `src/styles/global.scss` `@use`s both and is imported once in `App.tsx`.
- Theme via `data-theme="light|dark"` attribute on `<html>` (index.html sets `light`), persisted in localStorage key `theme`.

## TypeScript conventions
- `verbatimModuleSyntax` on: type-only imports must use `import type { ... }`.
- Imports use explicit file extensions (`./App.tsx`, `./Header.scss`); don't strip them.
- `noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly` enforced by `tsc -b`.

## Domain quirks
- Prices are in **MSI Coin**; `src/utils/currency.ts` defines `COIN_TO_SUM = 5000 / 30` (≈167 сум per coin). Use `formatCoins`/`coinsToSum`, don't hardcode the rate.
- React `StrictMode` is on — effects double-fire in dev.
- Product "type" is `'digital' | 'physical'`; physical items support `stock`, digital support `downloadUrl`/`licenseKey`, some have a `course` field. The `carousel?: boolean` flag is editable in the admin panel but not yet read by any storefront component.
- Order lifecycle is driven by the admin panel: storefront places orders as `status: 'paid'` (with generated `pickupCode`), then admin advances `packed` -> `ready` -> `collected`.
