from .delivery_forms import product_delivery_form
from .models import Banner, CatalogCategory, GrantLog, News, Notification, Order, PickupSlot, Product, User
from .order_delivery_details import delivery_requirements, information_required, product_delivery_requirement
from .order_fulfillment import (
    flow_for_fulfillment,
    fulfillment_type_from_order,
    fulfillment_type_from_product,
    next_status,
    status_for_fulfillment,
)


def without_none(data: dict) -> dict:
    return {key: value for key, value in data.items() if value is not None}


def product_to_dict(product: Product, *, include_delivery_form: bool = False) -> dict:
    delivery_form = product_delivery_form(product)
    images = product.images or ([product.image] if product.image else [])
    return without_none({
        "id": product.id,
        "image": product.image,
        "images": images,
        "price": product.price,
        "categoryId": product.category_id,
        "nameKey": product.name_key,
        "descKey": product.desc_key,
        "name": product.name,
        "description": product.description,
        "type": product.product_type,
        "fulfillmentType": fulfillment_type_from_product(product),
        "deliveryRequirement": product_delivery_requirement(product),
        "hasDeliveryForm": bool(delivery_form and any(delivery_form.values())),
        **({"deliveryForm": delivery_form or {"instructions": "", "links": [], "fields": []}} if include_delivery_form else {}),
        "active": product.active,
        "carousel": product.carousel,
        "downloadUrl": product.download_url,
        "licenseKey": product.license_key,
        "weight": product.weight,
        "stock": product.stock,
        "variantLabel": product.variant_label,
        "variants": product.variants or [],
        "discount": product.discount,
        "rating": product.rating,
        "ratingCount": product.rating_count,
        "course": product.course,
    })


def category_to_dict(category: CatalogCategory) -> dict:
    return {
        "id": category.id,
        "nameRu": category.name_ru,
        "nameUz": category.name_uz,
        "nameEn": category.name_en,
        "active": category.active,
        "position": category.position,
    }


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
        "activeCourses": getattr(user, "active_courses", 0),
    })


def order_to_dict(order: Order) -> dict:
    fulfillment_type = fulfillment_type_from_order(order)
    status = status_for_fulfillment(fulfillment_type, order.status)
    is_physical = fulfillment_type == "physical_pickup"
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
        "status": status,
        "fulfillmentType": fulfillment_type,
        "statusFlow": list(flow_for_fulfillment(fulfillment_type)),
        "nextStatus": None if information_required(order) else next_status(fulfillment_type, status),
        "informationRequired": information_required(order),
        "deliveryRequirements": delivery_requirements(order),
        "pickupCode": order.pickup_code if is_physical else None,
        "pickupSlot": order.pickup_slot if is_physical else None,
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
