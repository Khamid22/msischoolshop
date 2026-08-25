# LMS connection contract

The Telegram Shop is the student-facing client. The existing LMS must remain the source of truth for student identity, MSI Coins, products, stock, and purchases.

## Student API

Set `VITE_API_URL` to the LMS shop prefix, for example:

```text
https://lms-backend-development.up.railway.app/api/v1/shop
```

The shop expects these relative endpoints:

```text
POST /auth/telegram
GET  /auth/me
GET  /auth/notifications
POST /auth/notifications/read-all
GET  /products
GET  /banners
GET  /news
GET  /pickup-slots
GET  /orders
POST /orders
```

`POST /auth/telegram` receives `{ "initData": "..." }` and returns a short-lived shop token plus the linked LMS student:

```json
{
  "token": "signed-token",
  "user": {
    "id": "student-id",
    "telegramId": "123456789",
    "name": "Student Name",
    "email": "student@example.com",
    "phone": "",
    "address": "",
    "balance": 120,
    "group": "11-A",
    "studentId": "MSI00001",
    "discount": 0,
    "earned": 0
  }
}
```

All authenticated requests use `Authorization: Bearer <token>`.

## Purchase contract

The client sends a stable `requestId` for each checkout:

```json
{
  "requestId": "client-generated-uuid",
  "productId": "product-id",
  "quantity": 1,
  "customerName": "Student Name",
  "customerPhone": "+998...",
  "deliveryAddress": "MSI Campus",
  "deliveryMethod": "pickup",
  "pickupSlot": "16:00–17:00 · MSI Campus"
}
```

The LMS must treat `requestId` as idempotent. Repeating the same request returns the original order without deducting coins twice.

Creating an order must be one PostgreSQL transaction: lock the student and product, verify the current coin balance and stock, insert the order, insert a negative coin event, reduce stock, and commit. The client never supplies the price or trusted balance.

## Customer Support

Set `VITE_CUSTOMER_SUPPORT_URL` to the LMS Customer Support Shop page. Customer Support owns product maintenance, stock, order status, cancellation, refunds, and audit history. The existing `admin.html` pages remain only as a local compatibility tool until that LMS page is live.

No Payme or real-money endpoint is part of this contract.
