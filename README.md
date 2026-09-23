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

The PostgreSQL connection makes shop products, users, and orders persistent, but it does not automatically link a Telegram account to an LMS student. For linked LMS students, `backend/app/coin_ledger.py` reads and updates the canonical `msi_v2.coin_events` ledger within the shop transaction; SQLite uses the local development balance.

Production students can sign in from the Profile page with their LMS Student ID and password. The Shop verifies the canonical `msi_v2` account read-only and stores only a minimal shop profile with a random local password; it never copies the LMS password or password hash.

Each profile refresh reads the student's active group, current MSI Coin total, positive coins earned this month, and active subject count from the LMS. These values are no longer demo defaults.

## Repository structure

- `frontend/src/` contains the React storefront and its API client.
- `frontend/public/` contains product images and admin styles.
- `frontend/src/admin/` is the current six-section admin: sales analytics, catalogue, orders, users/MSI Coin, banners and news. `admin.html` mounts it; `admin-login.html` and `admin-sso.html` handle direct login and the LMS Customer Support handoff. Both entry paths use the same responsive dark/light interface. The old horizontal-tab UI and legacy CSS have been removed.
- `backend/app/` contains the FastAPI API, database models, authentication, and optional local seed data.
- `backend/tests/` tests the complete API workflow.
- `backend/msishop.db` is generated locally on first startup and is ignored by Git.
- `Dockerfile` and `railway.toml` provide a reproducible Railway build and health check.

## Verify

Digital products can request after-purchase actions in the catalogue editor: instructions, up to five links, and up to ten text, numeric Player ID, email or confirmation fields. Each field may be required or optional; calendar dates are not supported. The buyer sees the form immediately after checkout and in **My orders**. Staff see all answers and the submission time in the orders table and CSV export. Required answers must be complete before fulfillment starts. Failed submissions keep the draft; retrying a saved submission does not charge coins or add another audit entry.

Robux (both variants of `product-4e53e3f6ed90`) defaults to the supplied Roblox profile link, a required Player ID and a required “friend request sent” confirmation. The catalogue editor can change this configuration. Older Robux orders receive the instructions through the legacy snapshot adapter, without rewriting orders or reopening completed fulfillment. Other products are configured in the editor without code changes.

Each new order snapshots its product's instructions and fields. Later product edits or deletion do not change that purchase's requirements. Public catalogue responses expose only a `hasDeliveryForm` indicator; full instructions and links are returned only to authorized staff and the order owner. Answers and timestamped edits remain in order-items JSON. In-app reminders persist until required details are supplied. Order links use `/?view=orders&order=<order-id>` and require the buyer to sign in. Bulk replacement cannot overwrite orders containing these forms.

Students send the friend request in Roblox through the profile link and confirm it themselves. Staff handle Roblox friendship and delivery; the Shop does not verify the external friendship or send Robux automatically. The persistent reminder is inside the Shop.

Existing databases require the additive `20260924_delivery_forms` migration before deploying this version. It adds nullable `products.delivery_form` and records its version within the Shop schema; it does not rewrite products, orders, balances or LMS tables. Supply the approved target connection explicitly as `DATABASE_URL`; the migration runner has no default connection and does not load `.env` files. Check the current revision first:

```bash
.venv/bin/alembic -c backend/alembic.ini current
.venv/bin/alembic -c backend/alembic.ini upgrade head
```

For PostgreSQL, set `DATABASE_SCHEMA=msi_shop`. An existing local SQLite database uses its explicit SQLite URL. Fresh local SQLite startup still uses the established bootstrap. Downgrading the migration drops stored product configurations and requires separate approval on live data; rolling back only the application code can retain this additive column.

```bash
PYTHONPATH=backend .venv/bin/python -m pytest backend/tests -q
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run test:browser
```

`npm --prefix frontend run test:admin` checks catalogue editing, images/options, order handling, analytics, mobile navigation, themes and the LMS SSO iframe. Its backend uses the repository-root `.venv` and a disposable SQLite database. For canonical-ledger PostgreSQL tests, set `SHOP_TEST_POSTGRES_URL` to a disposable loopback database named `msi_shop_redesign_test` and run `backend/tests/test_coin_ledger_postgres.py` separately.

To run the delivery-details PostgreSQL locking tests, set `MSI_SHOP_TEST_DATABASE_URL` to a fresh, disposable loopback database named `msi_*_test` (SQLAlchemy `postgresql+psycopg` URL) and run `backend/tests/test_order_delivery_details.py`, `backend/tests/test_delivery_forms.py` and `backend/tests/test_delivery_form_migration.py`. The fixture creates and removes its tables; never point it at application data.

For a single production process, build `frontend/` first and then start FastAPI; the backend serves the generated `frontend/dist/` alongside `/api`.

## Prepare for the LMS

The storefront already sends signed Telegram `initData`, bearer tokens, and idempotent purchase `requestId` values. When the LMS shop endpoints are available, configure:

```bash
VITE_API_URL=https://lms-backend-development.up.railway.app/api/v1/shop
VITE_CUSTOMER_SUPPORT_URL=https://msischool.up.railway.app/customer-support/shop
```

Railway sets `DATABASE_URL` from the existing `msi-database` service, uses `DATABASE_SCHEMA=msi_shop`, and disables demo seeding. Keep `SEED_DEMO_DATA=false` in production so fake catalog and student records are not inserted.

## Student Picks

The homepage loads `/api/student-picks`, which ranks active products by all-time purchased quantity, including paid orders awaiting fulfillment and completed orders. Ties use catalogue position and product ID. Existing purchases count immediately; historical product IDs preserved as variant IDs by catalogue consolidation map to the current product. Ambiguous variant IDs are ignored, and current product IDs take priority. Hidden/deleted products without an active replacement and orders outside paid fulfillment stages do not appear.

The manual carousel checkbox/filter has been removed. Its stored field remains for API compatibility and does not affect ranking. No migration or order rewriting is needed. Guests can see the same product selection without buyer/order details. The homepage refreshes the selection each time it is opened and supports loading, empty and retry states. Run `npm --prefix frontend run test:browser` for the admin and Student Picks browser flows. `backend/tests/test_student_picks.py` covers ranking, historical variants, paid statuses, idempotent purchases and privacy; it also supports `MSI_SHOP_TEST_DATABASE_URL` targeting an empty disposable loopback `msi_*_test` PostgreSQL database.
