from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import DEMO_TELEGRAM_ID
from .models import Banner, News, Notification, Order, PickupSlot, Product, User
from .security import hash_password


PRODUCTS = [
    {"id": "tg-premium-6m", "image": "./images/telegram-premium.svg", "price": 150, "nameKey": "products.prem6", "descKey": "products.prem6Desc", "type": "digital", "name": "Telegram Premium 6 мес.", "description": "Премиум-подписка на 6 месяцев.", "rating": 4.8, "ratingCount": 210},
    {"id": "tg-premium-12m", "image": "./images/telegram-premium.svg", "price": 250, "nameKey": "products.prem12", "descKey": "products.prem12Desc", "type": "digital", "name": "Telegram Premium 12 мес.", "description": "Премиум-подписка на год.", "rating": 4.9, "ratingCount": 178},
    {"id": "tg-gift-25", "image": "./images/telegram-gift-stars.svg", "price": 25, "nameKey": "products.gift25", "descKey": "products.gift25Desc", "type": "digital", "name": "Gift 25 MSI Coin", "description": "Подарок на 25 MSI Coin.", "rating": 4.5, "ratingCount": 64},
    {"id": "tg-gift-50", "image": "./images/telegram-gift-stars.svg", "price": 50, "nameKey": "products.gift50", "descKey": "products.gift50Desc", "type": "digital", "name": "Gift 50 MSI Coin", "description": "Подарок на 50 MSI Coin.", "rating": 4.5, "ratingCount": 92},
    {"id": "tg-gift-150", "image": "./images/telegram-gift-stars.svg", "price": 150, "nameKey": "products.gift150", "descKey": "products.gift150Desc", "type": "digital", "name": "Gift 150 MSI Coin", "description": "Премиум-подарок на 150 MSI Coin.", "rating": 4.6, "ratingCount": 77},
    {"id": "student-sticker-pack", "image": "./images/student-stickers.jpg", "price": 35, "nameKey": "products.stickerPack", "descKey": "products.stickerPackDesc", "type": "physical", "name": "MSI Sticker Pack", "description": "Six durable student-themed vinyl stickers.", "rating": 4.9, "ratingCount": 118, "stock": 120},
    {"id": "student-keychain", "image": "./images/student-keychain.jpg", "price": 75, "nameKey": "products.keychain", "descKey": "products.keychainDesc", "type": "physical", "name": "MSI Acrylic Keychain", "description": "Clear acrylic keychain with a violet MSI design.", "rating": 4.8, "ratingCount": 91, "stock": 80},
    {"id": "student-phone-grip", "image": "./images/student-phone-grip.jpg", "price": 110, "nameKey": "products.phoneGrip", "descKey": "products.phoneGripDesc", "type": "physical", "name": "MSI Phone Grip", "description": "Compact collapsible phone grip in matte charcoal.", "rating": 4.7, "ratingCount": 76, "stock": 65},
    {"id": "student-notebook-set", "image": "./images/student-notebook-set.jpg", "price": 190, "nameKey": "products.notebookSet", "descKey": "products.notebookSetDesc", "type": "physical", "name": "MSI Notebook & Pen Set", "description": "A5 hardcover notebook with a matching black pen.", "rating": 4.9, "ratingCount": 104, "stock": 55},
    {"id": "tshirt-1", "image": "./images/tshirt-black.svg", "price": 750, "nameKey": "products.tshirt1", "descKey": "products.tshirt1Desc", "type": "physical", "name": "T-Shirt Black Edition", "description": "Стильная футболка MSI Bot Shop.", "rating": 4.7, "ratingCount": 150},
    {"id": "calc-2in1", "image": "./images/canculator.jpg", "price": 720, "nameKey": "products.calc2in1", "descKey": "products.calc2in1Desc", "type": "physical", "name": "2-in-1 Scientific Calculator with Writing Tablet", "description": "2-in-1: научный калькулятор с LCD-планшетом для записей.", "rating": 4.8, "ratingCount": 96, "stock": 20},
    {"id": "cap-1", "image": "./images/cap-1.svg", "price": 400, "nameKey": "products.cap1", "descKey": "products.cap1Desc", "type": "physical", "name": "Cap — Stealth", "description": "Кепка MSI Bot Shop, вариант 1.", "rating": 4.3, "ratingCount": 48},
    {"id": "cap-2", "image": "./images/cap-2.svg", "price": 400, "nameKey": "products.cap2", "descKey": "products.cap2Desc", "type": "physical", "name": "Cap — Shadow", "description": "Кепка MSI Bot Shop, вариант 2.", "rating": 4.4, "ratingCount": 52},
    {"id": "cap-3", "image": "./images/cap-3.svg", "price": 400, "nameKey": "products.cap3", "descKey": "products.cap3Desc", "type": "physical", "name": "Cap — Phantom", "description": "Кепка MSI Bot Shop, вариант 3.", "rating": 4.5, "ratingCount": 41},
    {"id": "la2-bundle", "image": "./images/course.svg", "price": 1200, "nameKey": "products.la2", "descKey": "products.la2Desc", "type": "digital", "name": "Course bundle · Linear Algebra II", "description": "Полный пакет Linear Algebra II: конспекты, задачи, записи лекций.", "rating": 4.9, "ratingCount": 86, "course": {"id": "course-la2", "title": "Linear Algebra II", "url": "https://lms.msi.uz/courses/linear-algebra-2"}},
    {"id": "calc-notebook", "image": "./images/notebook.svg", "price": 180, "nameKey": "products.notebook", "descKey": "products.notebookDesc", "type": "physical", "name": "Calculus notebook", "description": "Фирменный тетрадный блокнот по математике.", "rating": 4.6, "ratingCount": 132},
    {"id": "msi-hoodie", "image": "./images/hoodie.svg", "price": 900, "nameKey": "products.hoodie", "descKey": "products.hoodieDesc", "type": "physical", "name": "Hoodie — Midnight", "description": "Тёплый худи MSI Bot Shop.", "rating": 4.7, "ratingCount": 58},
    {"id": "tg-premium-3m", "image": "./images/telegram-premium.svg", "price": 80, "nameKey": "products.prem3", "descKey": "products.prem3Desc", "type": "digital", "name": "Telegram Premium 3 мес.", "description": "Премиум-подписка на 3 месяца.", "rating": 4.7, "ratingCount": 134},
    {"id": "spotify-premium", "image": "./images/spotify.svg", "price": 95, "nameKey": "products.spotify", "descKey": "products.spotifyDesc", "type": "digital", "name": "Spotify Premium 3 мес.", "description": "Премиум Spotify на 3 месяца.", "rating": 4.6, "ratingCount": 88},
    {"id": "yt-premium", "image": "./images/youtube.svg", "price": 95, "nameKey": "products.yt", "descKey": "products.ytDesc", "type": "digital", "name": "YouTube Premium 3 мес.", "description": "YouTube без рекламы на 3 месяца.", "rating": 4.6, "ratingCount": 97},
    {"id": "msi-buds", "image": "./images/headphones.svg", "price": 450, "nameKey": "products.buds", "descKey": "products.budsDesc", "type": "physical", "name": "MSI Buds", "description": "Беспроводные наушники MSI Buds с кейсом.", "rating": 4.7, "ratingCount": 41, "stock": 15},
    {"id": "msi-bottle", "image": "./images/bottle.svg", "price": 350, "nameKey": "products.bottle", "descKey": "products.bottleDesc", "type": "physical", "name": "MSI Bottle", "description": "Стальная бутылка MSI, 600 мл.", "rating": 4.5, "ratingCount": 63, "stock": 40},
    {"id": "msi-tote", "image": "./images/tote.svg", "price": 300, "nameKey": "products.tote", "descKey": "products.toteDesc", "type": "physical", "name": "MSI Tote Bag", "description": "Вместительный шопер MSI.", "rating": 4.4, "ratingCount": 38, "stock": 50},
    {"id": "msi-deskmat", "image": "./images/deskmat.svg", "price": 280, "nameKey": "products.deskmat", "descKey": "products.deskmatDesc", "type": "physical", "name": "MSI Desk Mat", "description": "Большой коврик для стола и мыши.", "rating": 4.6, "ratingCount": 45, "stock": 35},
    {"id": "msi-mug", "image": "./images/mug.svg", "price": 220, "nameKey": "products.mug", "descKey": "products.mugDesc", "type": "physical", "name": "MSI Mug", "description": "Керамическая кружка MSI, 350 мл.", "rating": 4.5, "ratingCount": 72, "stock": 60},
    {"id": "tshirt-white", "image": "./images/tshirt-white.svg", "price": 700, "nameKey": "products.tshirtWhite", "descKey": "products.tshirtWhiteDesc", "type": "physical", "name": "T-Shirt White Edition", "description": "Светлая футболка MSI Bot Shop.", "rating": 4.6, "ratingCount": 84, "stock": 25},
    {"id": "cap-4", "image": "./images/cap-black.svg", "price": 400, "nameKey": "products.cap4", "descKey": "products.cap4Desc", "type": "physical", "name": "Cap — Onyx", "description": "Чёрная кепка MSI Bot Shop.", "rating": 4.5, "ratingCount": 33, "stock": 30},
    {"id": "physics-bundle", "image": "./images/course.svg", "price": 1100, "nameKey": "products.physics", "descKey": "products.physicsDesc", "type": "digital", "name": "Course bundle · Physics I", "description": "Полный пакет Physics I: конспекты, задачи, записи лекций.", "rating": 4.8, "ratingCount": 54, "course": {"id": "course-physics", "title": "Physics I", "url": "https://lms.msi.uz/courses/physics-1"}},
    {"id": "chem-bundle", "image": "./images/course.svg", "price": 1000, "nameKey": "products.chem", "descKey": "products.chemDesc", "type": "digital", "name": "Course bundle · Chemistry", "description": "Полный пакет Chemistry: конспекты, задачи, записи лекций.", "rating": 4.7, "ratingCount": 47, "course": {"id": "course-chem", "title": "Chemistry", "url": "https://lms.msi.uz/courses/chemistry"}},
    {"id": "ielts-bundle", "image": "./images/course.svg", "price": 950, "nameKey": "products.ielts", "descKey": "products.ieltsDesc", "type": "digital", "name": "Course bundle · IELTS Prep", "description": "Подготовка к IELTS: стратегии, тесты, speaking-практика.", "rating": 4.9, "ratingCount": 61, "course": {"id": "course-ielts", "title": "IELTS Prep", "url": "https://lms.msi.uz/courses/ielts"}},
    {"id": "msi-pen", "image": "./images/pen.svg", "price": 150, "nameKey": "products.pen", "descKey": "products.penDesc", "type": "physical", "name": "MSI Pen", "description": "Брендированная ручка MSI Bot Shop.", "rating": 4.4, "ratingCount": 35, "stock": 100},
    {"id": "msi-mug-branded", "image": "./images/mug-branded.svg", "price": 280, "nameKey": "products.mugBranded", "descKey": "products.mugBrandedDesc", "type": "physical", "name": "MSI Branded Mug", "description": "Керамическая кружка с логотипом MSI Bot Shop, 350 мл.", "rating": 4.6, "ratingCount": 44, "stock": 50},
    {"id": "msi-flashdrive", "image": "./images/flashdrive.svg", "price": 200, "nameKey": "products.flashdrive", "descKey": "products.flashdriveDesc", "type": "physical", "name": "MSI Flash Drive 32 GB", "description": "Флешка MSI Bot Shop, 32 ГБ.", "rating": 4.5, "ratingCount": 28, "stock": 60},
]

BANNERS = [
    {"id": "banner-1", "title": "Telegram Premium", "subtitle": "Подписка на 6 и 12 месяцев", "description": "Получите все премиум-функции Telegram прямо сейчас", "image": "./images/telegram-premium.svg", "accent": "#666666", "icon": "💎", "active": True, "productIds": ["tg-premium-6m", "tg-premium-12m"]},
    {"id": "banner-2", "title": "MSI Coin", "subtitle": "Подарочные MSI Coin", "description": "Отправляйте подарки друзьям и близким", "image": "./images/telegram-gift-stars.svg", "accent": "#999999", "icon": "Ⓒ", "active": True, "productIds": ["tg-gift-25", "tg-gift-50", "tg-gift-150"]},
    {"id": "banner-3", "title": "Merch Collection", "subtitle": "Эксклюзивный мерч", "description": "Футболки и кепки MSI Bot Shop", "image": "./images/tshirt-black.svg", "accent": "#333333", "icon": "👕", "active": True, "productIds": ["tshirt-1", "cap-1", "cap-2", "cap-3"]},
]

SLOTS = [
    {"id": "slot-1", "label": "After Calculus II", "when": "Tue 14:30", "location": "Campus A · Room 112"},
    {"id": "slot-2", "label": "After Physics Lab", "when": "Wed 16:00", "location": "Campus A · Room 214"},
    {"id": "slot-3", "label": "Before Linear Algebra", "when": "Thu 09:00", "location": "Campus B · Atrium"},
    {"id": "slot-4", "label": "Friday after classes", "when": "Fri 13:00", "location": "Campus A · Lobby"},
]


def _product_model(data: dict, position: int) -> Product:
    return Product(
        id=data["id"], position=position, image=data["image"], price=data["price"],
        name_key=data.get("nameKey", ""), desc_key=data.get("descKey", ""),
        name=data.get("name"), description=data.get("description"), product_type=data.get("type"),
        carousel=data.get("carousel"), download_url=data.get("downloadUrl"),
        license_key=data.get("licenseKey"), weight=data.get("weight"), stock=data.get("stock"),
        discount=data.get("discount"), rating=data.get("rating"), rating_count=data.get("ratingCount"),
        course=data.get("course"),
    )


def seed_database(database: Session) -> None:
    now = datetime.now(timezone.utc)

    existing_ids = set(database.scalars(select(Product.id)).all())
    new_products = [p for p in PRODUCTS if p["id"] not in existing_ids]
    if new_products:
        max_pos = database.scalar(select(func.coalesce(func.max(Product.position), -1)))
        database.add_all(
            _product_model(p, max_pos + i + 1) for i, p in enumerate(new_products)
        )

    if database.scalar(select(func.count()).select_from(Banner)) == 0:
        database.add_all(
            Banner(
                id=item["id"], position=position, title=item["title"], subtitle=item["subtitle"],
                description=item["description"], image=item["image"], accent=item["accent"],
                icon=item["icon"], active=item["active"], product_ids=item.get("productIds"),
            )
            for position, item in enumerate(BANNERS)
        )

    if database.scalar(select(func.count()).select_from(News)) == 0:
        news = [
            ("news-1", "Добро пожаловать в MSI Bot Shop!", "Мы запустили наш магазин. Покупайте цифровые товары и мерч за MSI Coin прямо на сайте.", "./images/telegram-gift-stars.svg"),
            ("news-2", "Telegram Premium уже в продаже", "Подписки Telegram Premium на 6 и 12 месяцев доступны для покупки. Активация происходит автоматически после оплаты.", "./images/telegram-premium.svg"),
            ("news-3", "Курс MSI Coin: 30 ◆ = 5 000 сум", "1 MSI Coin = 167 сум. Покупайте товары за MSI Coin — эквивалент в сумах показывается рядом с каждой ценой.", "./images/telegram-gift-stars.svg"),
        ]
        database.add_all(
            News(id=item[0], position=position, title=item[1], description=item[2], image=item[3], date=(now - timedelta(minutes=position)).isoformat(), active=True)
            for position, item in enumerate(news)
        )

    if database.scalar(select(func.count()).select_from(PickupSlot)) == 0:
        database.add_all(
            PickupSlot(id=item["id"], position=position, label=item["label"], when_text=item["when"], location=item["location"])
            for position, item in enumerate(SLOTS)
        )

    if database.scalar(select(func.count()).select_from(User)) == 0:
        database.add(
            User(
                id="student-2023114", telegram_id=DEMO_TELEGRAM_ID, name="Aisha Karimova",
                email="aisha@msi.uz", phone="+998 90 123 45 67", address="Campus A",
                balance=2480, group_name="IT-203", student_id="2023114", discount=10,
                earned=2120, password_hash=hash_password("demo"),
            )
        )

    if database.scalar(select(func.count()).select_from(Order)) == 0:
        product_by_id = {product["id"]: product for product in PRODUCTS}
        database.add_all([
            Order(
                id="order-demo-1", items=[{"product": product_by_id["la2-bundle"], "quantity": 1}],
                total_price=1080, original_price=1200, customer_name="Aisha Karimova",
                customer_phone="+998 90 123 45 67", delivery_address="Campus A · Room 112",
                delivery_method="pickup", user_id="student-2023114", customer_email="aisha@msi.uz",
                status="ready", pickup_code="K-4821", pickup_slot="After Calculus II · Tue 14:30",
                created_at=(now - timedelta(hours=5)).isoformat(),
            ),
            Order(
                id="order-demo-2", items=[{"product": product_by_id["calc-notebook"], "quantity": 1}],
                total_price=162, original_price=180, customer_name="Aisha Karimova",
                customer_phone="+998 90 123 45 67", delivery_address="Campus A · Lobby",
                delivery_method="pickup", user_id="student-2023114", customer_email="aisha@msi.uz",
                status="collected", pickup_code="K-3307", pickup_slot="Friday after classes · Fri 13:00",
                created_at=(now - timedelta(days=3)).isoformat(),
            ),
        ])

    if database.scalar(select(func.count()).select_from(Notification)) == 0:
        database.add(
            Notification(
                id="notif-welcome-aisha", user_id="student-2023114", notification_type="welcome",
                amount=0, note="Добро пожаловать в MSI Shop", created_at=now.isoformat(), read=False,
            )
        )

    database.commit()
