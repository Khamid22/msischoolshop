# MSI Shop

MSI Shop is a Telegram Mini App storefront with a React client and FastAPI API. Local development uses SQLite; the Railway deployment uses the existing PostgreSQL service with its shop tables isolated in the `msi_shop` schema.

## Run locally

Start the API in one terminal:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. API documentation is at `http://127.0.0.1:8000/docs`, and the admin login is at `http://localhost:5173/admin-login.html`.

The development admin password is `123456789`. Copy `backend/.env.example` to `backend/.env` and replace the password and secret. Set `BOT_TOKEN` and link a student's `telegramId` to test verified Telegram sign-in. The seeded local demo user is `aisha@msi.uz` / `demo`.

The PostgreSQL connection makes shop products, users, and orders persistent, but it does not automatically link a Telegram account to an LMS student. Authoritative MSI Coin transactions still require the integration described in [`docs/LMS_INTEGRATION.md`](docs/LMS_INTEGRATION.md).

Production students can sign in from the Profile page with their LMS Student ID and password. The Shop verifies the canonical `msi_v2` account read-only and stores only a minimal shop profile with a random local password; it never copies the LMS password or password hash. MSI Coin purchases are still not written to the LMS ledger yet.

Each profile refresh reads the student's active group, current MSI Coin total, positive coins earned this month, and active subject count from the LMS. These values are no longer demo defaults.

## Repository structure

- `frontend/src/` contains the React storefront and its API client.
- `frontend/public/` contains product images and admin styles.
- `frontend/admin.html` and `frontend/admin-login.html` are the local compatibility admin interface. Customer Support will replace them in production.
- `backend/app/` contains the FastAPI API, database models, authentication, and optional local seed data.
- `backend/tests/` tests the complete API workflow.
- `backend/msishop.db` is generated locally on first startup and is ignored by Git.
- `Dockerfile` and `railway.toml` provide a reproducible Railway build and health check.

## Verify

Robux purchases (both variants of `product-4e53e3f6ed90`) request a numeric Roblox Player ID after checkout and in **My purchases**. Existing paid orders show the same form without another purchase or balance change. An in-app reminder remains until the buyer submits the ID. Staff see the ID in the orders table; delivery cannot advance until all required items have details. Buyers can correct an ID until delivery starts.

Details and timestamped edits are stored in the existing order-items JSON; no migration or existing-order rewrite is required. Order links use `/?view=orders&order=<order-id>` and require the buyer to sign in. Bulk order replacement is rejected when Robux orders exist, protecting submissions from stale admin caches. New Robux products with different catalogue IDs need an explicit delivery requirement in `backend/app/order_delivery_details.py`.

The feature does not validate that the Roblox account exists, send Robux automatically, or change the existing MSI Coin integration. Telegram reminders are not automatically sent by this feature; the persistent reminder is inside the Shop.

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest -q
cd ../frontend && npm run build && npm run lint
```

To run the delivery-details PostgreSQL locking tests, set `MSI_SHOP_TEST_DATABASE_URL` to a fresh, disposable loopback database named `msi_*_test` (SQLAlchemy `postgresql+psycopg` URL) and run `backend/tests/test_order_delivery_details.py`. The fixture creates and removes its tables; never point it at application data.

For a single production process, build `frontend/` first and then start FastAPI; the backend serves the generated `frontend/dist/` alongside `/api`.

## Prepare for the LMS

The storefront already sends signed Telegram `initData`, bearer tokens, and idempotent purchase `requestId` values. When the LMS shop endpoints are available, configure:

```bash
VITE_API_URL=https://lms-backend-development.up.railway.app/api/v1/shop
VITE_CUSTOMER_SUPPORT_URL=https://msischool.up.railway.app/customer-support/shop
```

Railway sets `DATABASE_URL` from the existing `msi-database` service, uses `DATABASE_SCHEMA=msi_shop`, and disables demo seeding. Keep `SEED_DEMO_DATA=false` in production so fake catalog and student records are not inserted.
