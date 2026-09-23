"""Run with SHOP_TEST_POSTGRES_URL pointing to a disposable local test database."""
import os
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app import coin_ledger
from app.balance_changes import change_balance
from app.database import Base, get_db
from app.main import app
from app.models import GrantLog, Product, User
from app.order_delivery_details import ROBUX_PRODUCT_ID
from app.schemas import BalanceChange
from app.security import create_token


@pytest.fixture
def postgres_client(monkeypatch):
    url = os.getenv('SHOP_TEST_POSTGRES_URL')
    if not url:
        pytest.skip('Disposable PostgreSQL URL not provided')
    parsed = urlparse(url)
    assert parsed.hostname in {'localhost', '127.0.0.1'} and parsed.path == '/msi_shop_redesign_test'
    engine = create_engine(url, connect_args={'options': '-csearch_path=shop_redesign'})
    with engine.begin() as conn:
        conn.execute(text('DROP SCHEMA IF EXISTS shop_redesign CASCADE'))
        conn.execute(text('DROP SCHEMA IF EXISTS msi_v2 CASCADE'))
        conn.execute(text('CREATE SCHEMA shop_redesign'))
        conn.execute(text('CREATE SCHEMA msi_v2'))
        conn.execute(text('CREATE TABLE msi_v2.students (id BIGINT PRIMARY KEY)'))
        conn.execute(text("""CREATE TABLE msi_v2.coin_events (
            id BIGSERIAL PRIMARY KEY, student_id BIGINT REFERENCES msi_v2.students(id), amount INTEGER NOT NULL CHECK(amount <> 0),
            source TEXT NOT NULL, note TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT now())"""))
        conn.execute(text('CREATE TABLE msi_v2.group_students (student_id BIGINT, group_id BIGINT, enrollment_status TEXT)'))
        conn.execute(text('CREATE TABLE msi_v2.groups (id BIGINT, program_id BIGINT, group_name TEXT)'))
        conn.execute(text('CREATE TABLE msi_v2.subject_programs (id BIGINT, subject_id BIGINT)'))
        conn.execute(text('INSERT INTO msi_v2.students VALUES (101)'))
        conn.execute(text("INSERT INTO msi_v2.coin_events (student_id, amount, source, note) VALUES (101, 100, 'test', '')"))
    Base.metadata.create_all(engine)
    with Session(engine) as database:
        database.add(User(id='lms-student-101', name='Test student', email='lms@example.invalid', password_hash='unused', balance=999, discount=0))
        database.commit()
    def database_dependency():
        with Session(engine) as database:
            yield database
    app.dependency_overrides[get_db] = database_dependency
    monkeypatch.setattr(coin_ledger, 'IS_SQLITE', False)
    with TestClient(app) as client:
        yield client, engine
    app.dependency_overrides.clear()
    engine.dispose()


def headers(role='admin'):
    return {'Authorization': f'Bearer {create_token("lms:41" if role == "admin" else "lms-student-101", role)}'}


def test_lms_grant_and_checkout_survive_profile_refresh(postgres_client):
    client, engine = postgres_client
    users = client.get('/api/admin/bootstrap', headers=headers()).json()['users']
    assert users[0]['balance'] == 100  # Cached shop balance is deliberately wrong.
    adjustment = {'amount': 50, 'note': 'Award', 'requestId': 'lms-grant'}
    for _ in range(2):
        response = client.post('/api/admin/users/lms-student-101/balance', headers=headers(), json=adjustment)
        assert response.status_code == 200
        assert response.json()['user']['balance'] == 150
    assert client.get('/api/auth/me', headers=headers('user')).json()['balance'] == 150
    product = client.post('/api/products', headers=headers(), json={'name': 'Test', 'price': 40, 'type': 'physical', 'stock': 2}).json()
    purchase = {'productId': product['id'], 'quantity': 2, 'customerName': 'Test', 'requestId': 'lms-order', 'deliveryMethod': 'pickup'}
    for _ in range(2):
        result = client.post('/api/orders', headers=headers('user'), json=purchase)
        assert result.status_code == 201
        assert result.json()['user']['balance'] == 70
    assert client.get('/api/auth/me', headers=headers('user')).json()['balance'] == 70
    assert client.get(f'/api/products/{product["id"]}').json()['stock'] == 0
    with engine.connect() as conn:
        assert list(conn.execute(text('SELECT amount FROM msi_v2.coin_events ORDER BY id')).scalars()) == [100, 50, -80]
    order_id = result.json()['order']['id']
    assert client.patch(f'/api/orders/{order_id}/status', headers=headers(), json={'status': 'collected'}).status_code == 409
    for status in ['packed', 'ready', 'collected']:
        for _ in range(2):
            assert client.patch(f'/api/orders/{order_id}/status', headers=headers(), json={'status': status}).status_code == 200


def test_concurrent_withdrawals_cannot_overspend(postgres_client):
    client, engine = postgres_client
    def withdraw(request_id):
        return client.post('/api/admin/users/lms-student-101/balance', headers=headers(), json={'amount': -80, 'note': 'Deduct', 'requestId': request_id}).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(withdraw, ['parallel-1', 'parallel-2'])) == [200, 409]
    with Session(engine) as database:
        assert database.execute(text('SELECT sum(amount) FROM msi_v2.coin_events')).scalar() == 20
        assert len(database.scalars(select(GrantLog)).all()) == 1


def test_coin_event_rolls_back_with_failed_shop_transaction(postgres_client, monkeypatch):
    _, engine = postgres_client
    with Session(engine) as database:
        def fail_commit():
            raise RuntimeError('Simulated failed transaction')
        monkeypatch.setattr(database, 'commit', fail_commit)
        with pytest.raises(RuntimeError):
            change_balance(database, 'lms-student-101', BalanceChange(amount=25, requestId='failed'), 'lms:41')
        database.rollback()
    with Session(engine) as database:
        assert database.execute(text('SELECT sum(amount) FROM msi_v2.coin_events')).scalar() == 100
        assert not database.scalars(select(GrantLog)).all()


def test_robux_player_id_preserves_canonical_coin_debit_and_purchase_retry(postgres_client):
    client, engine = postgres_client
    with Session(engine) as database:
        database.add(Product(id=ROBUX_PRODUCT_ID, name='Robux test', price=880,
                             product_type='digital', fulfillment_type='digital_delivery', active=True))
        database.commit()
    grant = client.post('/api/admin/users/lms-student-101/balance', headers=headers(),
                        json={'amount': 1100, 'note': 'Test funds', 'requestId': 'robux-test-funds'})
    assert grant.status_code == 200
    purchase = {'productId': ROBUX_PRODUCT_ID, 'quantity': 1, 'customerName': 'Test', 'requestId': 'robux-ledger-order'}
    order = client.post('/api/orders', headers=headers('user'), json=purchase)
    assert order.status_code == 201
    assert order.json()['order']['informationRequired'] is True
    for _ in range(2):
        saved = client.put('/api/orders/robux-ledger-order/delivery-details', headers=headers('user'),
                           json={'itemIndex': 0, 'answers': {'playerId': '123456789', 'friendRequestSent': True}})
        assert saved.status_code == 200
        retry = client.post('/api/orders', headers=headers('user'), json=purchase)
        assert retry.json()['user']['balance'] == 320
        assert retry.json()['order']['deliveryRequirements'][0]['playerId'] == '123456789'
    with engine.connect() as connection:
        assert list(connection.execute(text('SELECT amount FROM msi_v2.coin_events ORDER BY id')).scalars()) == [100, 1100, -880]
