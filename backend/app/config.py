import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_DIR = BACKEND_DIR.parent

# Keep secrets out of frontend builds. A backend/.env overrides a repository .env.
load_dotenv(REPOSITORY_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env", override=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{(BACKEND_DIR / 'msishop.db').as_posix()}",
)
DATABASE_SCHEMA = os.getenv("DATABASE_SCHEMA", "msi_shop").strip() or "msi_shop"
SEED_DEMO_DATA = os.getenv(
    "SEED_DEMO_DATA",
    "true" if DATABASE_URL.startswith("sqlite") else "false",
).lower() in {"1", "true", "yes", "on"}
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "123456789")
SECRET_KEY = os.getenv("SECRET_KEY", "change-this-development-secret")
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
DEMO_TELEGRAM_ID = os.getenv("DEMO_TELEGRAM_ID") or None
TOKEN_LIFETIME_SECONDS = int(os.getenv("TOKEN_LIFETIME_SECONDS", "86400"))
TELEGRAM_AUTH_MAX_AGE_SECONDS = int(os.getenv("TELEGRAM_AUTH_MAX_AGE_SECONDS", "86400"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]
