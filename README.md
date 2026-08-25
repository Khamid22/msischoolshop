# MSI Shop

MSI Shop is a Telegram Mini App storefront. The React client is ready to connect to the existing LMS for student identity, MSI Coins, products, and purchases. The included FastAPI + SQLite backend is a local compatibility backend for development and API-contract testing.

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

Do not use the SQLite user balance as the production MSI Coin ledger. Production checkout belongs in the LMS PostgreSQL transaction described in [`docs/LMS_INTEGRATION.md`](docs/LMS_INTEGRATION.md).

## Repository structure

- `frontend/src/` contains the React storefront and its API client.
- `frontend/public/` contains product images and admin styles.
- `frontend/admin.html` and `frontend/admin-login.html` are the local compatibility admin interface. Customer Support will replace them in production.
- `backend/app/` contains the local FastAPI adapter, SQLite models, authentication, and seed data.
- `backend/tests/` tests the complete API workflow.
- `backend/msishop.db` is generated locally on first startup and is ignored by Git.
- `Dockerfile` and `railway.toml` provide a reproducible Railway build and health check.

## Verify

```bash
cd backend && PYTHONPATH=. .venv/bin/pytest -q
cd ../frontend && npm run build && npm run lint
```

For a single production process, build `frontend/` first and then start FastAPI; the backend serves the generated `frontend/dist/` alongside `/api`.

## Prepare for the LMS

The storefront already sends signed Telegram `initData`, bearer tokens, and idempotent purchase `requestId` values. When the LMS shop endpoints are available, configure:

```bash
VITE_API_URL=https://lms-backend-development.up.railway.app/api/v1/shop
VITE_CUSTOMER_SUPPORT_URL=https://msischool.up.railway.app/customer-support/shop
```

The Railway configuration in this repository is prepared but has not been deployed. Deploying it before the LMS endpoints exist will continue to use the local compatibility backend.
