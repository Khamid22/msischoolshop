from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Notification, User
from ..schemas import StudentLogin, TelegramLogin, UserUpdate
from ..security import create_token, require_user, validate_telegram_init_data, verify_password
from ..serializers import notification_to_dict, user_to_dict


router = APIRouter(prefix="/api/auth", tags=["authentication"])


def authenticated_user(claims: dict, database: Session) -> User:
    user = database.get(User, claims["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


def auth_response(user: User) -> dict:
    return {"token": create_token(user.id, "user"), "user": user_to_dict(user)}


@router.post("/login")
def login(data: StudentLogin, database: Session = Depends(get_db)) -> dict:
    user = database.scalar(select(User).where(User.email == data.email.strip().lower()))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return auth_response(user)


@router.post("/telegram")
def telegram_login(data: TelegramLogin, database: Session = Depends(get_db)) -> dict:
    telegram_user = validate_telegram_init_data(data.initData)
    telegram_id = str(telegram_user.get("id", ""))
    user = database.scalar(select(User).where(User.telegram_id == telegram_id))
    if user is None:
        raise HTTPException(status_code=404, detail="Telegram account is not linked to a student")
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
