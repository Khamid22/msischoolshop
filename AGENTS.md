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
- `seed()` migrates/backfills stored data against `DEFAULT_*` arrays. Because data persists in localStorage, changing defaults in code won't be visible until existing storage is reset (or the migration logic in `seed()` covers it). Clear the `msi_*` keys in dev to force re-seed.
- Admin panel `admin.html` shares the same `msi_products`/`msi_banners`/`msi_news`/`msi_orders` keys, so shop edits are visible to admin and vice versa.

## Auth (two separate implementations)
- Storefront: `src/api.ts` `login()` — password `123456789`, stored under localStorage key `msi_admin_auth`.
- Admin login page: hardcoded `ADMIN_PASSWORD = '123456789'`, sets `sessionStorage['msi_admin_auth'] = '1'`. Keep both in sync if the password changes.

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
- Product "type" is `'digital' | 'physical'`; physical items support `stock`, digital support `downloadUrl`/`licenseKey`, some have a `course` field. Favor `carousel?: boolean` for banner rotation in the catalog.
