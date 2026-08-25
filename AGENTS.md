# AGENTS.md

React 19 + TypeScript + Vite Telegram Shop in `frontend/`, with a local FastAPI + SQLite compatibility backend in `backend/`. The production target is the existing LMS API and PostgreSQL coin ledger. All frontend paths below are relative to `frontend/` unless stated otherwise.

## Commands
- `cd frontend && npm run dev` — Vite dev server
- `cd frontend && npm run build` — `tsc -b && vite build` (typecheck via `tsc -b`, no `tsc --noEmit` flag needed)
- `cd frontend && npm run lint` — oxlint (`.oxlintrc.json`). No formatter configured.
- `cd frontend && npm run preview` — serve built `dist/`
- `cd backend && .venv/bin/uvicorn app.main:app --reload` — FastAPI dev server
- `cd backend && PYTHONPATH=. .venv/bin/pytest -q` — backend API tests

Verification is backend pytest plus frontend lint and build.

## Architecture
- **Multi-entry build** (vite.config.ts): `index.html` = React storefront, plus `admin.html` and `admin-login.html` as inputs.
- `admin.html` / `admin-login.html` are **plain HTML + inline vanilla JS at the frontend project root** (NOT React) — not covered by `tsc -b` or oxlint, so edits there are never typechecked/linted. Styles come from `/admin/*.css` in `public/`.
- React app entry: `src/main.tsx` -> `src/App.tsx`. State via contexts in `src/contexts/` (Auth, Cart, Favorites, Lang, Notifications, Theme) wrapping an inline page router (view state in App, no react-router).
- FastAPI entry: `backend/app/main.py`. Routers cover catalog, auth/users, orders, and admin operations. SQLite models live in `backend/app/models.py`.

## Data layer: local adapter and LMS target
- `src/api.ts` calls `/api`; Vite proxies that prefix to `http://127.0.0.1:8000` in development.
- Local products, banners, news, users, orders, notifications, pickup slots, and grant logs live in SQLite. Seed data is in `backend/app/seed.py`.
- Local checkout and balance deduction happen in one backend transaction in `backend/app/routers/orders.py`. `requestId` makes repeated purchase requests idempotent.
- Production must use the LMS PostgreSQL student coin ledger and the contract in `docs/LMS_INTEGRATION.md`; never treat the local SQLite balance as authoritative LMS data.
- The vanilla admin hydrates a browser cache from `/api/admin/bootstrap` and synchronizes edits to authenticated bulk endpoints. The cache is not the source of truth.
- The vanilla admin is a local compatibility tool. Production product and purchase management belongs to the LMS Customer Support workspace.
- Theme, language, favorites, search history, and the current session cache remain in localStorage because they are client preferences/session data.

## Auth (do not conflate the three)
- **Storefront users:** Telegram `initData` is validated by FastAPI with `BOT_TOKEN`, then matched to `users.telegram_id`. User tokens are signed by the backend and cached as `msi_user_token`.
- **Admin panel:** `admin-login.html` sends the password to `/api/admin/login`; the signed admin token is kept in sessionStorage as `msi_admin_token`.
- Development defaults are documented in `backend/.env.example`; never commit real secrets.

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
- Orders start as `paid`; the API supports `packed` -> `ready` -> `collected` status updates.
