"""Isolated local configuration shared by the API tests."""
import atexit
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
database_file = tempfile.NamedTemporaryFile(prefix="msishop-test-", suffix=".db", delete=False)
database_file.close()
atexit.register(lambda: Path(database_file.name).unlink(missing_ok=True))
os.environ.update({
    "DATABASE_URL": f"sqlite:///{database_file.name}", "SEED_DEMO_DATA": "true",
    "ADMIN_PASSWORD": "test-admin-password", "SECRET_KEY": "test-secret-key",
    "SHOP_ADMIN_SSO_SECRET": "test-shop-admin-sso-secret-that-is-long-enough",
    "BOT_TOKEN": "test-bot-token", "DEMO_TELEGRAM_ID": "777000",
})
