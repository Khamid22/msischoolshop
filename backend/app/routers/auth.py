from collections import deque
import secrets
from threading import Lock
import time

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session
from werkzeug.security import check_password_hash

from ..database import IS_SQLITE, get_db
from ..models import Notification, User
from ..schemas import StudentLogin, TelegramLogin, UserUpdate
from ..security import create_token, hash_password, require_user, validate_telegram_init_data, verify_password
from ..serializers import notification_to_dict, user_to_dict


router = APIRouter(prefix="/api/auth", tags=["authentication"])

LOGIN_ATTEMPTS: dict[str, deque[float]] = {}
LOGIN_ATTEMPTS_LOCK = Lock()


def enforce_login_rate_limit(identifier: str) -> None:
    now = time.monotonic()
    with LOGIN_ATTEMPTS_LOCK:
        attempts = LOGIN_ATTEMPTS.setdefault(identifier, deque())
        while attempts and attempts[0] <= now - 3600:
            attempts.popleft()
        attempts_in_last_minute = sum(attempt > now - 60 for attempt in attempts)
        if attempts_in_last_minute >= 10 or len(attempts) >= 50:
            raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
        attempts.append(now)


def clear_login_attempts(identifier: str) -> None:
    with LOGIN_ATTEMPTS_LOCK:
        LOGIN_ATTEMPTS.pop(identifier, None)


def authenticate_local_student(identifier: str, password: str, database: Session) -> User | None:
    user = database.scalar(
        select(User).where(
            (User.email == identifier.lower()) | (User.student_id == identifier)
        )
    )
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


def refresh_lms_student_profile(user: User, lms_student_id: int, database: Session) -> User:
    details = database.execute(
        text(
            """
            SELECT
                COALESCE(academic.group_names, '') AS group_names,
                COALESCE(academic.active_course_count, 0)::integer AS active_course_count,
                COALESCE(coins.total_coins, 0)::integer AS total_coins,
                COALESCE(coins.earned_this_month, 0)::integer AS earned_this_month
            FROM msi_v2.students student
            LEFT JOIN LATERAL (
                SELECT
                    string_agg(DISTINCT groups.group_name, ', ' ORDER BY groups.group_name)
                        FILTER (WHERE lower(groups.group_name) <> 'online') AS group_names,
                    count(DISTINCT programs.subject_id)
                        FILTER (WHERE lower(groups.group_name) <> 'online') AS active_course_count
                FROM msi_v2.group_students enrollment
                JOIN msi_v2.groups groups ON groups.id = enrollment.group_id
                JOIN msi_v2.subject_programs programs ON programs.id = groups.program_id
                WHERE enrollment.student_id = student.id
                  AND enrollment.enrollment_status = 'active'
            ) academic ON true
            LEFT JOIN LATERAL (
                SELECT
                    sum(event.amount) AS total_coins,
                    sum(event.amount) FILTER (
                        WHERE event.amount > 0
                          AND event.occurred_at >= date_trunc('month', now())
                          AND event.occurred_at < date_trunc('month', now()) + interval '1 month'
                    ) AS earned_this_month
                FROM msi_v2.coin_events event
                WHERE event.student_id = student.id
            ) coins ON true
            WHERE student.id = :student_id
            LIMIT 1
            """
        ),
        {"student_id": lms_student_id},
    ).mappings().first()
    if details is None:
        return user

    group_name = str(details["group_names"] or "").strip()[:100] or None
    balance = int(details["total_coins"] or 0)
    earned = int(details["earned_this_month"] or 0)
    if user.group_name != group_name or user.balance != balance or user.earned != earned:
        user.group_name = group_name
        user.balance = balance
        user.earned = earned
        database.commit()
    user.active_courses = int(details["active_course_count"] or 0)
    return user


def refresh_lms_user(user: User, database: Session) -> User:
    prefix = "lms-student-"
    if not user.id.startswith(prefix):
        return user
    try:
        lms_student_id = int(user.id.removeprefix(prefix))
    except ValueError:
        return user
    return refresh_lms_student_profile(user, lms_student_id, database)


def authenticate_lms_student(identifier: str, password: str, database: Session) -> User | None:
    account = database.execute(
        text(
            """
            SELECT account.id AS account_id,
                   account.password_hash,
                   account.full_name AS account_name,
                   account.phone,
                   student.id AS student_id,
                   COALESCE(NULLIF(student.student_code, ''), profile.student_code, account.login) AS student_code,
                   COALESCE(NULLIF(student.full_name, ''), account.full_name) AS student_name
            FROM msi_v2.accounts account
            JOIN msi_v2.student_profiles profile ON profile.account_id = account.id
            JOIN msi_v2.students student ON student.id = profile.student_id
            WHERE lower(btrim(account.login)) = lower(btrim(:identifier))
              AND account.role = 'student'
              AND account.status = 'active'
              AND profile.status = 'active'
              AND student.status = 'active'
            LIMIT 1
            """
        ),
        {"identifier": identifier},
    ).mappings().first()
    if account is None:
        return None
    try:
        password_matches = check_password_hash(str(account["password_hash"] or ""), password)
    except (TypeError, ValueError):
        password_matches = False
    if not password_matches:
        return None

    student_code = str(account["student_code"] or identifier).strip()
    shop_user_id = f"lms-student-{int(account['student_id'])}"
    shop_user = database.get(User, shop_user_id) or database.scalar(
        select(User).where(User.student_id == student_code)
    )
    if shop_user is None:
        shop_user = User(
            id=shop_user_id,
            name=str(account["student_name"] or account["account_name"] or student_code),
            email=f"lms-account-{int(account['account_id'])}@local.invalid",
            phone=str(account["phone"] or ""),
            address="",
            balance=0,
            student_id=student_code,
            discount=0,
            earned=0,
            password_hash=hash_password(secrets.token_urlsafe(32)),
        )
        database.add(shop_user)
    else:
        shop_user.name = str(account["student_name"] or account["account_name"] or student_code)
        shop_user.phone = str(account["phone"] or shop_user.phone or "")
        shop_user.student_id = student_code
    database.commit()
    return refresh_lms_student_profile(shop_user, int(account["student_id"]), database)


def authenticated_user(claims: dict, database: Session) -> User:
    user = database.get(User, claims["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return refresh_lms_user(user, database)


def auth_response(user: User) -> dict:
    return {"token": create_token(user.id, "user"), "user": user_to_dict(user)}


@router.post("/login")
def login(data: StudentLogin, database: Session = Depends(get_db)) -> dict:
    identifier = str(data.studentId or data.email or "").strip()
    rate_limit_key = identifier.casefold()
    if not identifier or not data.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid student ID or password")
    enforce_login_rate_limit(rate_limit_key)
    user = (
        authenticate_local_student(identifier, data.password, database)
        if IS_SQLITE
        else authenticate_lms_student(identifier, data.password, database)
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid student ID or password")
    clear_login_attempts(rate_limit_key)
    return auth_response(user)


@router.post("/telegram")
def telegram_login(data: TelegramLogin, database: Session = Depends(get_db)) -> dict:
    telegram_user = validate_telegram_init_data(data.initData)
    telegram_id = str(telegram_user.get("id", ""))
    user = database.scalar(select(User).where(User.telegram_id == telegram_id))
    if user is None:
        raise HTTPException(status_code=404, detail="Telegram account is not linked to a student")
    user = refresh_lms_user(user, database)
    if telegram_user.get("photo_url") and not user.avatar:
        user.avatar = telegram_user["photo_url"]
        database.commit()
    return auth_response(user)


@router.get("/me")
def me(claims: dict = Depends(require_user), database: Session = Depends(get_db)) -> dict:
    return user_to_dict(authenticated_user(claims, database))


@router.patch("/me")
def update_me(data: UserUpdate, claims: dict = Depends(require_user), database: Session = Depends(get_db)) -> dict:
    user = authenticated_user(claims, database)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    database.commit()
    return user_to_dict(user)


@router.post("/logout", status_code=204)
def logout() -> Response:
    return Response(status_code=204)


@router.get("/notifications")
def notifications(claims: dict = Depends(require_user), database: Session = Depends(get_db)) -> list[dict]:
    user = authenticated_user(claims, database)
    items = database.scalars(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    ).all()
    return [notification_to_dict(item) for item in items]


@router.post("/notifications/read-all", status_code=204)
def read_all_notifications(claims: dict = Depends(require_user), database: Session = Depends(get_db)) -> Response:
    user = authenticated_user(claims, database)
    items = database.scalars(
        select(Notification).where(Notification.user_id == user.id, Notification.read.is_(False))
    ).all()
    for item in items:
        item.read = True
    database.commit()
    return Response(status_code=204)
