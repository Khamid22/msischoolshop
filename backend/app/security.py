import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any
from urllib.parse import parse_qsl

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import (
    BOT_TOKEN,
    SECRET_KEY,
    SHOP_ADMIN_SSO_SECRET,
    TELEGRAM_AUTH_MAX_AGE_SECONDS,
    TOKEN_LIFETIME_SECONDS,
)


bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, salt_value, digest_value = stored.split("$", 2)
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(salt_value)
        expected = base64.urlsafe_b64decode(digest_value)
        actual = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _base64_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _base64_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(subject: str, role: str) -> str:
    payload = {"sub": subject, "role": role, "exp": int(time.time()) + TOKEN_LIFETIME_SECONDS}
    encoded = _base64_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = _base64_encode(hmac.new(SECRET_KEY.encode(), encoded.encode(), hashlib.sha256).digest())
    return f"{encoded}.{signature}"


def verify_lms_admin_assertion(assertion: str) -> dict[str, Any]:
    if len(SHOP_ADMIN_SSO_SECRET) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LMS Shop Admin SSO is not configured",
        )
    try:
        encoded, supplied_signature = assertion.split(".", 1)
        expected_signature = _base64_encode(
            hmac.new(
                SHOP_ADMIN_SSO_SECRET.encode("utf-8"),
                encoded.encode("ascii"),
                hashlib.sha256,
            ).digest()
        )
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError
        payload = json.loads(_base64_decode(encoded))
        now = int(time.time())
        issued_at = int(payload.get("iat", 0))
        expires_at = int(payload.get("exp", 0))
        if payload.get("iss") != "msi-lms" or payload.get("aud") != "msi-shop-admin":
            raise ValueError
        if payload.get("role") != "customer_support":
            raise ValueError
        if not str(payload.get("sub") or "").isdigit():
            raise ValueError
        if len(str(payload.get("nonce") or "")) < 8:
            raise ValueError
        if issued_at > now + 10 or expires_at < now:
            raise ValueError
        if expires_at <= issued_at or expires_at - issued_at > 60:
            raise ValueError
        return payload
    except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired LMS admin assertion",
        )


def decode_token(token: str) -> dict[str, Any]:
    try:
        encoded, supplied_signature = token.split(".", 1)
        expected_signature = _base64_encode(
            hmac.new(SECRET_KEY.encode(), encoded.encode(), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError
        payload = json.loads(_base64_decode(encoded))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def current_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return decode_token(credentials.credentials)


def require_admin(claims: dict[str, Any] = Depends(current_claims)) -> dict[str, Any]:
    if claims.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return claims


def require_user(claims: dict[str, Any] = Depends(current_claims)) -> dict[str, Any]:
    if claims.get("role") != "user":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return claims


def validate_telegram_init_data(init_data: str) -> dict[str, Any]:
    if not BOT_TOKEN:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="BOT_TOKEN is not configured")

    values = dict(parse_qsl(init_data, keep_blank_values=True))
    supplied_hash = values.pop("hash", "")
    values.pop("signature", None)
    if not supplied_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram hash is missing")

    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(supplied_hash, expected_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram signature")

    try:
        auth_date = int(values.get("auth_date", "0"))
        telegram_user = json.loads(values["user"])
    except (KeyError, ValueError, TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram data")

    now = int(time.time())
    if auth_date > now + 60 or now - auth_date > TELEGRAM_AUTH_MAX_AGE_SECONDS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired Telegram data")
    return telegram_user
