from .models import Banner, GrantLog, News, Notification, Order, PickupSlot, Product, User


def without_none(data: dict) -> dict:
    return {key: value for key, value in data.items() if value is not None}


def product_to_dict(product: Product) -> dict:
    return without_none({
        "id": product.id,
        "image": product.image,
        "price": product.price,
        "nameKey": product.name_key,
        "descKey": product.desc_key,
        "name": product.name,
        "description": product.description,
        "type": product.product_type,
        "carousel": product.carousel,
        "downloadUrl": product.download_url,
        "licenseKey": product.license_key,
        "weight": product.weight,
        "stock": product.stock,
        "discount": product.discount,
        "rating": product.rating,
        "ratingCount": product.rating_count,
        "course": product.course,
    })


def banner_to_dict(banner: Banner) -> dict:
    return without_none({
        "id": banner.id,
        "title": banner.title,
        "subtitle": banner.subtitle,
        "description": banner.description,
        "image": banner.image,
        "accent": banner.accent,
        "icon": banner.icon,
        "active": banner.active,
        "productIds": banner.product_ids,
    })


def news_to_dict(news: News) -> dict:
    return without_none({
        "id": news.id,
        "title": news.title,
        "description": news.description,
        "image": news.image,
        "date": news.date,
        "active": news.active,
    })


def slot_to_dict(slot: PickupSlot) -> dict:
    return {"id": slot.id, "label": slot.label, "when": slot.when_text, "location": slot.location}


def user_to_dict(user: User) -> dict:
    return without_none({
        "id": user.id,
        "telegramId": user.telegram_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "avatar": user.avatar,
        "balance": user.balance,
        "group": user.group_name,
        "studentId": user.student_id,
        "discount": user.discount,
        "earned": user.earned,
    })


def order_to_dict(order: Order) -> dict:
    return without_none({
        "id": order.id,
        "items": order.items,
        "totalPrice": order.total_price,
        "originalPrice": order.original_price,
        "customerName": order.customer_name,
        "customerPhone": order.customer_phone,
        "deliveryAddress": order.delivery_address,
        "deliveryMethod": order.delivery_method,
        "createdAt": order.created_at,
        "userId": order.user_id,
        "customerEmail": order.customer_email,
        "status": order.status,
        "pickupCode": order.pickup_code,
        "pickupSlot": order.pickup_slot,
    })


def notification_to_dict(notification: Notification) -> dict:
    return without_none({
        "id": notification.id,
        "userId": notification.user_id,
        "type": notification.notification_type,
        "amount": notification.amount,
        "note": notification.note,
        "createdAt": notification.created_at,
        "read": notification.read,
    })


def grant_to_dict(grant: GrantLog) -> dict:
    return without_none({
        "id": grant.id,
        "admin": grant.admin,
        "userName": grant.user_name,
        "userEmail": grant.user_email,
        "amount": grant.amount,
        "type": grant.operation_type,
        "createdAt": grant.created_at,
    })
