"""Atomic, retry-safe administrator adjustments of student coins."""

from datetime import datetime, timezone
from hashlib import sha256
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .coin_ledger import change_coins, current_balance
from .models import GrantLog, Notification, User
from .schemas import BalanceChange
from .serializers import user_to_dict


def change_balance(database: Session, user_id: str, data: BalanceChange, actor: str) -> dict:
    user = database.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if data.amount == 0:
        raise HTTPException(status_code=422, detail="Amount must not be zero")
    suffix = sha256(data.requestId.encode()).hexdigest() if data.requestId else uuid4().hex
    grant_id, notification_id = f"grant-{suffix}", f"notif-{suffix}"
    note = (data.note or "").strip() or ("Balance top-up" if data.amount > 0 else "Balance deduction")
    previous = database.get(GrantLog, grant_id)
    if previous is not None:
        notification = database.get(Notification, notification_id)
        if (notification is None or notification.user_id != user.id or previous.amount != data.amount
                or notification.note != note or previous.admin != actor):
            raise HTTPException(status_code=409, detail="Request ID is already used for another adjustment")
        return {"user": {**user_to_dict(user), "balance": current_balance(database, user)}, "amount": previous.amount}
    change_coins(database, user, data.amount, source=f"shop:{grant_id}", note=note)
    now = datetime.now(timezone.utc).isoformat()
    database.add_all([
        Notification(id=notification_id, user_id=user.id, notification_type="topup" if data.amount > 0 else "spend",
                     amount=abs(data.amount), note=note, created_at=now, read=False),
        GrantLog(id=grant_id, admin=actor, user_name=user.name, user_email=user.email,
                 amount=data.amount, operation_type="grant" if data.amount > 0 else "withdraw", created_at=now),
    ])
    try:
        database.commit()
    except IntegrityError:
        database.rollback()
        raise HTTPException(status_code=409, detail="Adjustment already submitted. Refresh and retry.") from None
    return {"user": user_to_dict(user), "amount": data.amount}
