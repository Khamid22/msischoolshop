"""Shop coin operations on the caller's transaction and canonical LMS ledger."""

from fastapi import HTTPException
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from .database import IS_SQLITE
from .models import User


def lms_student_id(user: User) -> int | None:
    if IS_SQLITE or not user.id.startswith("lms-student-"):
        return None
    try:
        return int(user.id.removeprefix("lms-student-"))
    except ValueError:
        raise HTTPException(status_code=409, detail="Invalid LMS student link") from None


def current_balance(database: Session, user: User) -> int:
    student_id = lms_student_id(user)
    if student_id is None:
        return user.balance
    student = database.execute(
        text("SELECT id FROM msi_v2.students WHERE id = :id FOR UPDATE"),
        {"id": student_id},
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=409, detail="LMS student no longer exists")
    return int(database.execute(
        text("SELECT COALESCE(sum(amount), 0) FROM msi_v2.coin_events WHERE student_id = :id"),
        {"id": student_id},
    ).scalar_one())


def change_coins(database: Session, user: User, amount: int, *, source: str, note: str) -> None:
    balance = current_balance(database, user)
    if balance + amount < 0:
        raise HTTPException(status_code=409, detail="Insufficient balance")
    student_id = lms_student_id(user)
    if student_id is not None and amount:
        database.execute(
            text("""INSERT INTO msi_v2.coin_events (student_id, amount, source, note)
                    VALUES (:student_id, :amount, :source, :note)"""),
            {"student_id": student_id, "amount": amount, "source": source, "note": note},
        )
    user.balance = balance + amount


def user_balances(database: Session, users: list[User]) -> dict[str, int]:
    """Read fresh balances in one query without writing profile caches on GET."""
    linked = {user.id: student_id for user in users if (student_id := lms_student_id(user)) is not None}
    if not linked:
        return {}
    rows = database.execute(
        text("""SELECT student_id, sum(amount) AS balance FROM msi_v2.coin_events
                WHERE student_id IN :ids GROUP BY student_id""").bindparams(bindparam("ids", expanding=True)),
        {"ids": list(linked.values())},
    ).mappings()
    balances = {row["student_id"]: int(row["balance"]) for row in rows}
    return {user_id: balances.get(student_id, 0) for user_id, student_id in linked.items()}
