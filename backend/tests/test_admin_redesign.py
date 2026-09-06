from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import GrantLog, Notification, Order, User
from app.sales_analytics import sales_analytics
from app.security import create_token


@pytest.fixture
def client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    def database():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_db] = database
    with Session(engine) as session:
        session.add(User(id='redesign-user', name='Test student', email='test@example.invalid', balance=100, password_hash='unused'))
        session.commit()
    with TestClient(app) as http:
        yield http, engine
    app.dependency_overrides.clear()
    engine.dispose()


def admin_headers():
    return {'Authorization': f'Bearer {create_token("lms:41", "admin")}'}


def test_adjustment_is_exact_authenticated_and_idempotent(client):
    http, engine = client
    url = '/api/admin/users/redesign-user/balance'
    payload = {'amount': 50, 'note': 'Award', 'requestId': 'award-1'}
    assert http.post(url, json=payload).status_code == 401
    assert http.post(url, json=payload, headers={'Authorization': f'Bearer {create_token("redesign-user", "user")}'}).status_code == 403
    for _ in range(2):
        result = http.post(url, json=payload, headers=admin_headers())
        assert result.status_code == 200
        assert result.json()['user']['balance'] == 150
    assert http.post(url, json={**payload, 'amount': 75}, headers=admin_headers()).status_code == 409
    assert http.post(url, json={'amount': -151, 'requestId': 'overdraw'}, headers=admin_headers()).status_code == 409
    assert http.post(url, json={'amount': 0}, headers=admin_headers()).status_code == 422
    assert http.post(url, json={'amount': -150, 'requestId': 'withdraw'}, headers=admin_headers()).json()['user']['balance'] == 0
    with Session(engine) as database:
        grants = database.scalars(select(GrantLog)).all()
        assert [item.amount for item in grants] == [50, -150]
        assert all(item.admin == 'lms:41' for item in grants)
        assert len(database.scalars(select(Notification)).all()) == 2


def test_product_patch_clears_discount_stock_and_keeps_other_fields(client):
    http, _ = client
    response = http.post('/api/products', headers=admin_headers(), json={
        'name': 'Redesign product', 'price': 100, 'discount': 25, 'type': 'physical',
        'image': '/images/mug.svg', 'stock': 5,
    })
    assert response.status_code == 201
    product_id = response.json()['id']
    result = http.patch(f'/api/products/{product_id}', headers=admin_headers(), json={'discount': 0, 'stock': None})
    assert result.status_code == 200
    assert result.json()['discount'] == 0
    assert result.json().get('stock') is None
    assert result.json()['price'] == 100
    assert result.json()['image'] == '/images/mug.svg'
    assert http.patch(f'/api/products/{product_id}', headers=admin_headers(), json={'discount': 101}).status_code == 422


def test_sales_periods_use_tashkent_dates_and_paid_totals(client):
    http, _ = client
    def order(date, total, quantities):
        return Order(id=str(uuid4()), created_at=date, total_price=total,
                     items=[{'product': {'name': f'Item {i}', 'price': 100}, 'quantity': qty} for i, qty in enumerate(quantities)])
    orders = [order('2026-09-06T20:30:00+00:00', 101, [1, 2]), order('2026-08-31T18:59:00+00:00', 50, [1]),
              order('2026-09-07T20:00:00+00:00', 999, [1])]
    result = sales_analytics(orders, '7', datetime(2026, 9, 7, 12, tzinfo=timezone.utc))
    assert result.totalCoins == 101
    assert result.orderCount == 1
    assert result.averageOrder == 101
    assert result.unitsSold == 3
    assert len(result.periods) == 7
    assert result.periods[-1].label == '2026-09-07'
    assert result.periods[-1].amount == 101
    assert sum(point.amount for point in result.products) == 101
    assert http.get('/api/admin/analytics').status_code == 401
    assert http.get('/api/admin/analytics?range=invalid', headers=admin_headers()).status_code == 422
    assert http.get('/api/admin/analytics?range=30', headers=admin_headers()).json()['orderCount'] == 0
