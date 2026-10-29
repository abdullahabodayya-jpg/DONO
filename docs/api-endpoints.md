# DONO API Contract v1

**Project:** DONO  
**Base URL:** `http://localhost/dono/backend/public/api`  
**Backend:** PHP 8.2 + PDO + MariaDB  
**Frontend:** HTML, CSS, JavaScript  
**Authentication:** PHP Sessions  
**AI Design:** Asynchronous generation  
**Payments:** Mock Payment  
**Contract status:** Draft — proposed endpoints are not necessarily implemented.

---

## 1. Implementation status

| Feature / API | Status | Notes |
|---|---|---|
| `GET /health` | Implemented | Health-check route exists in current routing code. |
| Coupon CRUD | Implemented | GET, POST, PUT, PATCH, DELETE routes and controller methods were tested. |
| Coupon validation | Implemented | Preview endpoint exists; must be revalidated during order creation. |
| Authentication | Proposed | PHP Session behavior and authorization middleware still need implementation/verification. |
| Products & categories | Proposed | Requires confirmation of actual database columns and relations. |
| Cart & wishlist | Proposed | Assigned to Member 2. |
| Orders | Proposed | Assigned to Member 2; no duplicate order creation in Payments. |
| Mock payments | Proposed | No Stripe integration in this version. |
| AI designs | Proposed | Asynchronous status workflow. |
| Admin management | Proposed | Must be protected by admin authorization. |

**Status rule:** An endpoint is `Implemented` only when the route and its actual behavior have been verified. This table reflects the code and tests known at the time of drafting, not a live inspection of the repository.

---

## 2. Common API rules

### 2.1 JSON responses

Every endpoint should use the same response envelope.

**Success response**

```json
{
  "success": true,
  "message": "Request successful.",
  "data": {}
}
```

**Error response**

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": null
}
```

For validation errors, the team may standardize an optional `errors` object inside `data`:

```json
{
  "success": false,
  "message": "Validation failed.",
  "data": {
    "errors": {
      "email": ["A valid email is required."],
      "password": ["Password is required."]
    }
  }
}
```

Use one error format consistently across all controllers.

### 2.2 HTTP status codes

| Status | Meaning |
|---|---|
| `200 OK` | Successful read or update |
| `201 Created` | Resource created |
| `202 Accepted` | Asynchronous task accepted |
| `204 No Content` | Successful deletion, if the team chooses an empty response |
| `400 Bad Request` | Malformed request |
| `401 Unauthorized` | User is not authenticated |
| `403 Forbidden` | User lacks permission |
| `404 Not Found` | Resource does not exist or is not accessible |
| `409 Conflict` | Duplicate or conflicting operation |
| `422 Unprocessable Content` | Valid JSON, but invalid data or business rules |
| `500 Internal Server Error` | Unexpected server error |

### 2.3 General conventions

- JSON request bodies use `Content-Type: application/json`.
- Dates and timestamps use ISO 8601 where possible, with an explicit timezone.
- IDs are opaque identifiers from the database. Do not assume every table uses the same ID type.
- Prices and monetary amounts are decimal values, not trusted values supplied by the browser.
- `PUT` replaces the editable representation; `PATCH` updates only supplied fields.
- List endpoints should eventually support pagination with `page` and `limit`.
- The backend validates all inputs and uses PDO prepared statements.
- Never return passwords, password hashes, session IDs, internal exception details, or secret keys.
- Management endpoints must verify both authentication and authorization.
- The response examples below define the proposed contract; they do not prove implementation.

---

# 3. Health

## GET `/health`

**Status:** Implemented, subject to confirming the current local response.

Purpose: Check whether the API is responding.

**Request:** No body.

**Success — `200`**

```json
{
  "success": true,
  "message": "DONO API is running.",
  "data": {
    "status": "ok"
  }
}
```

**Errors:** `500` if the application cannot handle the request.

---

# 4. Authentication & user profile

Authentication uses PHP Sessions. The browser must send the session cookie with subsequent requests. For same-origin requests, browser cookie handling is normally automatic; for cross-origin requests, the frontend must use `credentials: "include"` and the server must configure credentials-enabled CORS with an explicit allowed origin.

The session ID must be regenerated after login. State-changing requests need CSRF protection.

## POST `/auth/register`

**Status:** Proposed.

Creates a customer account.

**Request**

```json
{
  "first_name": "Ahmad",
  "last_name": "Ali",
  "email": "ahmad@example.com",
  "password": "ExamplePassword123"
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "id": "USER_ID",
      "first_name": "Ahmad",
      "last_name": "Ali",
      "email": "ahmad@example.com",
      "role": "customer"
    }
  }
}
```

**Errors:** `409` if the email already exists; `422` for invalid fields.

**Rules:** Hash passwords using `password_hash()`. Never accept the role from a public registration request. Decide whether registration also starts a session; the proposed default is to create the account and require a separate login.

## POST `/auth/login`

**Status:** Proposed.

**Request**

```json
{
  "email": "ahmad@example.com",
  "password": "ExamplePassword123"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "USER_ID",
      "first_name": "Ahmad",
      "last_name": "Ali",
      "email": "ahmad@example.com",
      "role": "customer"
    }
  }
}
```

**Errors:** `401` for invalid credentials; `422` for invalid input.

**Rules:** Create the PHP session, regenerate its ID, and store the authenticated user's ID and role server-side. Do not return the session ID in JSON.

## POST `/auth/logout`

**Status:** Proposed.

Ends the current session.

**Request:** No body.

**Success — `200`**

```json
{
  "success": true,
  "message": "Logout successful.",
  "data": null
}
```

**Errors:** `401` if authentication is required but absent; `403` for an invalid CSRF token.

## GET `/auth/me`

**Status:** Proposed.

Returns the currently authenticated user.

**Request:** Session cookie.

**Success — `200`**

```json
{
  "success": true,
  "message": "Current user retrieved successfully.",
  "data": {
    "user": {
      "id": "USER_ID",
      "first_name": "Ahmad",
      "last_name": "Ali",
      "email": "ahmad@example.com",
      "role": "customer"
    }
  }
}
```

**Errors:** `401` when not authenticated.

## GET `/users/me`

**Status:** Proposed.

Returns the user's profile. This can share the same underlying service as `/auth/me`; keep both only if the team needs a separate profile resource.

**Success — `200`**

```json
{
  "success": true,
  "message": "Profile retrieved successfully.",
  "data": {
    "user": {
      "id": "USER_ID",
      "first_name": "Ahmad",
      "last_name": "Ali",
      "email": "ahmad@example.com"
    }
  }
}
```

**Errors:** `401`.

## PATCH `/users/me`

**Status:** Proposed.

Updates editable profile fields.

**Request**

```json
{
  "first_name": "Ahmad",
  "last_name": "Hassan"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Profile updated successfully.",
  "data": {
    "user": {
      "id": "USER_ID",
      "first_name": "Ahmad",
      "last_name": "Hassan",
      "email": "ahmad@example.com"
    }
  }
}
```

**Errors:** `401`, `409` for a conflicting unique value if email editing is later allowed, or `422`.

**Rules:** Ignore or reject attempts to change `role`, account status, password hash, or other privileged fields through this endpoint.

---

# 5. Products & categories

**Status:** Proposed. Confirm the actual `products` and `categories` columns before freezing these response objects.

The product detail API should provide everything the product page needs without making the frontend reconstruct business rules.

## GET `/products`

Returns a product listing.

**Optional query parameters:** `page`, `limit`, `category_id`, `product_type`, `search`, `sort`.

**Example request**

`GET /products?page=1&limit=12&category_id=CATEGORY_ID`

**Success — `200`**

```json
{
  "success": true,
  "message": "Products retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "PRODUCT_ID",
        "name": "Gift Box",
        "description": "A customizable gift box.",
        "price": "25.00",
        "product_type": "normal",
        "image_url": "/uploads/products/gift-box.jpg",
        "category": {
          "id": "CATEGORY_ID",
          "name": "Gifts"
        },
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

**Errors:** `422` for invalid query parameters.

## GET `/products/{id}`

Returns complete details for one active product.

**Success — `200`**

```json
{
  "success": true,
  "message": "Product retrieved successfully.",
  "data": {
    "product": {
      "id": "PRODUCT_ID",
      "name": "Gift Box",
      "description": "A customizable gift box.",
      "price": "25.00",
      "product_type": "normal",
      "image_url": "/uploads/products/gift-box.jpg",
      "category": {
        "id": "CATEGORY_ID",
        "name": "Gifts"
      },
      "is_active": true
    }
  }
}
```

**Errors:** `404` if the product does not exist or is not available.

## GET `/products/featured`

Returns the products selected for the homepage's featured section.

**Success — `200`**

```json
{
  "success": true,
  "message": "Featured products retrieved successfully.",
  "data": {
    "items": []
  }
}
```

**Rule:** The team must define how a product becomes featured, for example through an `is_featured` column or an explicit selection rule. Do not implement this endpoint until that decision is made.

## GET `/categories`

Returns active product categories.

**Success — `200`**

```json
{
  "success": true,
  "message": "Categories retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "CATEGORY_ID",
        "name": "Gifts",
        "description": "Gift products",
        "image_url": null
      }
    ]
  }
}
```

## GET `/categories/{id}/products`

Returns products belonging to a category.

**Optional query parameters:** `page`, `limit`, `sort`.

**Success — `200`**

```json
{
  "success": true,
  "message": "Category products retrieved successfully.",
  "data": {
    "category": {
      "id": "CATEGORY_ID",
      "name": "Gifts"
    },
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

**Errors:** `404` for an unknown category.

---

# 6. Cart — Member 2

**Status:** Proposed. Member 2 owns implementation. The API contract should be agreed upon by the frontend and backend team before either side depends on it.

Cart prices are always calculated by the server from the current product data.

## GET `/cart`

Returns the current user's cart.

**Authentication:** Required.

**Success — `200`**

```json
{
  "success": true,
  "message": "Cart retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "CART_ITEM_ID",
        "product": {
          "id": "PRODUCT_ID",
          "name": "Gift Box",
          "image_url": "/uploads/products/gift-box.jpg"
        },
        "quantity": 2,
        "unit_price": "25.00",
        "line_total": "50.00"
      }
    ],
    "subtotal": "50.00",
    "currency": "JOD"
  }
}
```

## POST `/cart/items`

Adds a product to the cart. If the product is already present, the team should agree whether to increment its quantity or return a conflict; recommended behavior is to increment it.

**Request**

```json
{
  "product_id": "PRODUCT_ID",
  "quantity": 1
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Product added to cart successfully.",
  "data": {
    "item": {
      "id": "CART_ITEM_ID",
      "product_id": "PRODUCT_ID",
      "quantity": 1,
      "unit_price": "25.00",
      "line_total": "25.00"
    }
  }
}
```

**Errors:** `401`, `404`, `422`.

## PATCH `/cart/items/{id}`

Changes the quantity of a cart item.

**Request**

```json
{
  "quantity": 3
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Cart item updated successfully.",
  "data": {
    "item": {
      "id": "CART_ITEM_ID",
      "quantity": 3,
      "unit_price": "25.00",
      "line_total": "75.00"
    },
    "subtotal": "75.00"
  }
}
```

**Errors:** `401`, `404`, `422`. Quantity must be a positive integer.

## DELETE `/cart/items/{id}`

Removes one item from the current user's cart.

**Success — `200`**

```json
{
  "success": true,
  "message": "Cart item removed successfully.",
  "data": {
    "subtotal": "0.00"
  }
}
```

The subtotal reflects the remaining cart.

## DELETE `/cart`

Clears the current user's cart.

**Success — `200`**

```json
{
  "success": true,
  "message": "Cart cleared successfully.",
  "data": null
}
```

**Rule:** Every cart item lookup must be scoped to the authenticated user.

---

# 7. Wishlist — Member 2

**Status:** Proposed.

## GET `/wishlist`

Returns the current user's saved products.

**Success — `200`**

```json
{
  "success": true,
  "message": "Wishlist retrieved successfully.",
  "data": {
    "items": [
      {
        "product_id": "PRODUCT_ID",
        "name": "Gift Box",
        "price": "25.00",
        "image_url": "/uploads/products/gift-box.jpg"
      }
    ]
  }
}
```

## POST `/wishlist/items`

Adds a product to the wishlist.

**Request**

```json
{
  "product_id": "PRODUCT_ID"
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Product added to wishlist successfully.",
  "data": {
    "product_id": "PRODUCT_ID"
  }
}
```

**Errors:** `401`, `404`, `409` if already saved, or `422`.

## DELETE `/wishlist/items/{productId}`

Removes a product from the wishlist.

**Success — `200`**

```json
{
  "success": true,
  "message": "Product removed from wishlist successfully.",
  "data": null
}
```

**Errors:** `401`, `404`.

---

# 8. Orders — Member 2

**Status:** Proposed. The final request schema must be coordinated with Member 2 and the actual `orders` and order-item tables.

**Critical rule:** The frontend must not determine the final subtotal, discount, shipping fee, or total. The server calculates them using database prices and validated business rules.

## POST `/orders`

Creates an order from the authenticated user's cart or an agreed checkout payload.

**Recommended request**

```json
{
  "shipping_address": {
    "full_name": "Ahmad Ali",
    "phone": "0790000000",
    "address_line": "Example Street",
    "city": "Amman"
  },
  "coupon_code": "TEST10",
  "notes": "Please handle with care"
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Order created successfully.",
  "data": {
    "order": {
      "id": "ORDER_ID",
      "status": "pending",
      "subtotal": "100.00",
      "discount_amount": "10.00",
      "shipping_fee": "3.00",
      "total_amount": "93.00",
      "currency": "JOD",
      "items": [
        {
          "product_id": "PRODUCT_ID",
          "quantity": 2,
          "unit_price": "50.00",
          "line_total": "100.00"
        }
      ]
    }
  }
}
```

**Errors:** `401`, `404`, `409`, `422`.

**Rules:**
- Read cart items and product prices from the database.
- Revalidate the coupon and its dates, active state, minimum order amount, and discount type.
- Calculate totals on the server.
- Save a price snapshot in order items so later product price changes do not rewrite order history.
- Use a database transaction.
- Coordinate whether an order is created in `pending` status before payment or only after checkout validation. The example assumes it is created as `pending`.

## GET `/orders`

Returns orders belonging to the authenticated user.

**Optional query parameters:** `page`, `limit`, `status`.

**Success — `200`**

```json
{
  "success": true,
  "message": "Orders retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "ORDER_ID",
        "status": "pending",
        "total_amount": "93.00",
        "currency": "JOD",
        "created_at": "2026-10-29T12:00:00+03:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

## GET `/orders/{id}`

Returns an order and its items.

**Success — `200`**

```json
{
  "success": true,
  "message": "Order retrieved successfully.",
  "data": {
    "order": {
      "id": "ORDER_ID",
      "status": "pending",
      "subtotal": "100.00",
      "discount_amount": "10.00",
      "shipping_fee": "3.00",
      "total_amount": "93.00",
      "currency": "JOD",
      "items": []
    }
  }
}
```

**Errors:** `401`, `404`. Users must not be able to read another user's order.

## POST `/orders/{id}/cancel`

Requests cancellation if the order is still eligible.

**Request**

```json
{
  "reason": "Changed my mind"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Order cancelled successfully.",
  "data": {
    "order": {
      "id": "ORDER_ID",
      "status": "cancelled"
    }
  }
}
```

**Errors:** `401`, `404`, `409` if cancellation is no longer permitted.

## GET `/admin/orders`

Returns orders for administration.

**Authentication:** Admin required.

**Optional query parameters:** `page`, `limit`, `status`, `from`, `to`.

**Success — `200`**

```json
{
  "success": true,
  "message": "Orders retrieved successfully.",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

## PATCH `/admin/orders/{id}/status`

Updates an order status after validating permitted transitions.

**Request**

```json
{
  "status": "confirmed"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Order status updated successfully.",
  "data": {
    "order": {
      "id": "ORDER_ID",
      "status": "confirmed"
    }
  }
}
```

**Errors:** `401`, `403`, `404`, `409`, `422`.

Allowed status transitions must be defined by the team. Do not allow arbitrary transitions simply because a value exists in the enum.

---

# 9. Coupons — Your responsibility

**Status:** Implemented for the existing CRUD and validation methods, based on the previously tested local code. Authorization protection and final integration with order creation still need verification.

## GET `/coupons`

Returns coupons for the management interface.

**Recommended permission:** Admin required. If customers need to see public promotions, expose only safe active promotion data through a separate public endpoint or an explicitly filtered response.

**Success — `200`**

```json
{
  "success": true,
  "message": "Coupons retrieved successfully.",
  "data": {
    "items": [
      {
        "id": 1,
        "code": "TEST10",
        "discount_type": "percentage",
        "discount_value": "10.00",
        "min_order_amount": "50.00",
        "start_date": "2026-01-01 00:00:00",
        "end_date": "2027-12-31 23:59:59",
        "is_active": 1
      }
    ]
  }
}
```

## GET `/coupons/{id}`

Returns a coupon by ID.

**Success — `200`**

```json
{
  "success": true,
  "message": "Coupon retrieved successfully.",
  "data": {
    "coupon": {
      "id": 1,
      "code": "TEST10",
      "discount_type": "percentage",
      "discount_value": "10.00",
      "min_order_amount": "50.00",
      "start_date": "2026-01-01 00:00:00",
      "end_date": "2027-12-31 23:59:59",
      "is_active": 1
    }
  }
}
```

**Errors:** `404` if not found.

## POST `/coupons`

Creates a coupon. Admin required.

**Request**

```json
{
  "code": "TEST10",
  "discount_type": "percentage",
  "discount_value": 10,
  "min_order_amount": 50,
  "start_date": "2026-01-01 00:00:00",
  "end_date": "2027-12-31 23:59:59",
  "is_active": 1
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Coupon created successfully.",
  "data": {
    "coupon": {
      "id": 1,
      "code": "TEST10",
      "discount_type": "percentage",
      "discount_value": "10.00",
      "min_order_amount": "50.00",
      "start_date": "2026-01-01 00:00:00",
      "end_date": "2027-12-31 23:59:59",
      "is_active": 1
    }
  }
}
```

**Errors:** `409` for duplicate code; `422` for invalid values.

## PUT `/coupons/{id}`

Replaces the editable coupon fields.

**Request:** Same fields as POST.

**Success — `200`**

```json
{
  "success": true,
  "message": "Coupon updated successfully.",
  "data": {
    "coupon": {
      "id": 1,
      "code": "TEST10",
      "discount_type": "percentage",
      "discount_value": "10.00",
      "min_order_amount": "50.00",
      "start_date": "2026-01-01 00:00:00",
      "end_date": "2027-12-31 23:59:59",
      "is_active": 1
    }
  }
}
```

## PATCH `/coupons/{id}`

Updates only the supplied fields.

**Request**

```json
{
  "discount_value": 20
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Coupon partially updated successfully.",
  "data": {
    "coupon": {
      "id": 1,
      "code": "TEST10",
      "discount_type": "percentage",
      "discount_value": "20.00",
      "min_order_amount": "50.00",
      "start_date": "2026-01-01 00:00:00",
      "end_date": "2027-12-31 23:59:59",
      "is_active": 1
    }
  }
}
```

**Rule:** Validate the merged record, not just the fields in the PATCH request.

## DELETE `/coupons/{id}`

Deletes a coupon. Admin required.

**Success — `200`**

```json
{
  "success": true,
  "message": "Coupon deleted successfully.",
  "data": null
}
```

**Rule:** The existing database design uses `orders.coupon_id` with `ON DELETE SET NULL`. Verify that this is the actual FK configuration. Deleting a coupon must not delete historical orders.

## POST `/coupons/validate`

Checks whether a coupon can be applied to a given subtotal and returns a preview.

**Request**

```json
{
  "code": "TEST10",
  "subtotal": 100
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Coupon applied successfully.",
  "data": {
    "code": "TEST10",
    "discount_type": "percentage",
    "discount_value": "20.00",
    "subtotal": "100.00",
    "discount_amount": "20.00",
    "total_after_discount": "80.00",
    "currency": "JOD"
  }
}
```

**Errors:** `422` for an invalid, inactive, expired, not-yet-active, or minimum-spend-ineligible coupon.

**Security and integration rules:**
- The `subtotal` supplied by the frontend is only a preview input; it is not authoritative.
- The order-creation service must recalculate the subtotal from database prices and validate the coupon again.
- Round money according to one agreed currency precision rule.
- The current schema does not include coupon usage limits, so do not invent usage-count behavior.

---

# 10. Payments — Mock Payment

**Status:** Proposed. This version does not use Stripe, Stripe Checkout Sessions, or Stripe webhooks.

The payment API records a simulated payment result. It is for development and demonstration only, not real money movement.

## POST `/orders/{id}/checkout`

Starts a mock payment for an existing eligible order.

**Authentication:** Required.

**Request**

```json
{
  "payment_method": "mock",
  "simulate_result": "success"
}
```

`simulate_result` is a development-only option with allowed values `success` and `failure`. It must be disabled or tightly restricted outside the local demo environment. If the team prefers a simpler interface, use `payment_method` alone and return a mock checkout session that the user completes through a separate endpoint.

**Success — `201`**

```json
{
  "success": true,
  "message": "Mock payment created successfully.",
  "data": {
    "payment": {
      "id": "PAYMENT_ID",
      "order_id": "ORDER_ID",
      "provider": "mock",
      "amount": "93.00",
      "currency": "JOD",
      "status": "succeeded",
      "provider_reference": "MOCK_REFERENCE"
    },
    "order": {
      "id": "ORDER_ID",
      "status": "confirmed"
    }
  }
}
```

If the simulated result is a failure, return a consistent response showing `status: "failed"` and the order status according to the agreed order/payment rules. Do not mark the order confirmed when the payment fails.

**Errors:** `401`, `404`, `409` if the order is not eligible for payment, `422`.

**Important implementation decision:** The simplest demo may complete the mock payment in one request. The team must decide whether failed attempts are returned as a normal `200`/`201` result with `payment.status = "failed"` or as an HTTP error. Recommended: use a successful HTTP response for a successfully recorded payment attempt, even when its business result is `failed`.

## GET `/payments/{id}`

Returns payment details for an authorized user.

**Success — `200`**

```json
{
  "success": true,
  "message": "Payment retrieved successfully.",
  "data": {
    "payment": {
      "id": "PAYMENT_ID",
      "order_id": "ORDER_ID",
      "provider": "mock",
      "provider_reference": "MOCK_REFERENCE",
      "amount": "93.00",
      "currency": "JOD",
      "status": "succeeded",
      "created_at": "2026-10-29T12:00:00+03:00"
    }
  }
}
```

**Errors:** `401`, `404`. Customers may only read payments associated with their own orders.

## GET `/orders/{id}/payments`

Returns payment attempts for a specific order.

**Success — `200`**

```json
{
  "success": true,
  "message": "Order payments retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "PAYMENT_ID",
        "provider": "mock",
        "amount": "93.00",
        "currency": "JOD",
        "status": "succeeded"
      }
    ]
  }
}
```

**Errors:** `401`, `404`.

## GET `/admin/payments`

Returns payment records for admin reporting.

**Authentication:** Admin required.

**Optional query parameters:** `page`, `limit`, `status`, `order_id`.

**Success — `200`**

```json
{
  "success": true,
  "message": "Payments retrieved successfully.",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0
    }
  }
}
```

## GET `/admin/payments/{id}`

Returns a payment record for administration.

**Success — `200`**

```json
{
  "success": true,
  "message": "Payment retrieved successfully.",
  "data": {
    "payment": {
      "id": "PAYMENT_ID",
      "order_id": "ORDER_ID",
      "provider": "mock",
      "amount": "93.00",
      "currency": "JOD",
      "status": "succeeded"
    }
  }
}
```

**Errors:** `401`, `403`, `404`.

## POST `/admin/payments/{id}/refund`

Simulates a refund record or status change. This does not return real funds.

**Request**

```json
{
  "reason": "Order cancelled"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Mock refund recorded successfully.",
  "data": {
    "payment": {
      "id": "PAYMENT_ID",
      "status": "refunded"
    }
  }
}
```

**Errors:** `401`, `403`, `404`, `409` if the payment cannot be refunded.

**Rules:**
- Only eligible successful payments can be refunded.
- Do not mark a payment refunded without recording the action in the database.
- Define whether partial refunds are supported. This v1 contract assumes full refunds only.
- The payment service does not create orders. It operates on an order ID created by the Orders service.
- Payment and order status transitions must be coordinated with Member 2.
- Do not implement `/payments/webhook/stripe` in this mock-only version. Add it only when the team adopts real Stripe integration.

---

# 11. AI Design — Asynchronous generation

**Status:** Proposed.

The design workflow uses the existing planned status values:

- `pending`
- `generating`
- `completed`
- `failed`

A request should return immediately with a design ID. The frontend can poll the design status. This contract does not assume a particular AI provider or generated image storage solution.

## POST `/designs`

Creates a design request.

**Authentication:** Required if designs belong to user accounts.

**Request — proposed fields**

```json
{
  "product_id": "PRODUCT_ID",
  "prompt": "A modern blue and silver gift box design",
  "options": {
    "style": "modern"
  }
}
```

The exact accepted options must be finalized based on the actual AI feature and database schema. The `options` object is a proposal, not a confirmed database column.

**Success — `202`**

```json
{
  "success": true,
  "message": "Design request accepted.",
  "data": {
    "design": {
      "id": "DESIGN_ID",
      "product_id": "PRODUCT_ID",
      "status": "pending",
      "created_at": "2026-10-29T12:00:00+03:00"
    }
  }
}
```

**Errors:** `401`, `404`, `422`.

**Rules:** Persist the design request before starting the background job. Do not hold the HTTP request open while the AI provider generates the design.

## GET `/designs`

Returns designs belonging to the current user.

**Optional query parameters:** `page`, `limit`, `status`.

**Success — `200`**

```json
{
  "success": true,
  "message": "Designs retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "DESIGN_ID",
        "product_id": "PRODUCT_ID",
        "status": "generating",
        "image_url": null,
        "created_at": "2026-10-29T12:00:00+03:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

## GET `/designs/{id}`

Returns the design's latest status and result.

**Success — `200`**

```json
{
  "success": true,
  "message": "Design retrieved successfully.",
  "data": {
    "design": {
      "id": "DESIGN_ID",
      "product_id": "PRODUCT_ID",
      "status": "completed",
      "image_url": "/uploads/designs/DESIGN_ID.png",
      "error_message": null,
      "created_at": "2026-10-29T12:00:00+03:00",
      "completed_at": "2026-10-29T12:00:30+03:00"
    }
  }
}
```

For a failed design:

```json
{
  "success": true,
  "message": "Design retrieved successfully.",
  "data": {
    "design": {
      "id": "DESIGN_ID",
      "status": "failed",
      "image_url": null,
      "error_message": "Design generation failed. Please try again."
    }
  }
}
```

**Errors:** `401`, `404`. Do not reveal internal provider credentials or stack traces in `error_message`.

## POST `/designs/{id}/generate`

Starts generation for an existing pending design. Use this endpoint only if creation and generation are deliberately separate steps. Otherwise, `POST /designs` should enqueue generation automatically, and this endpoint can be omitted.

**Request:** No body required.

**Success — `202`**

```json
{
  "success": true,
  "message": "Design generation started.",
  "data": {
    "design": {
      "id": "DESIGN_ID",
      "status": "generating"
    }
  }
}
```

**Errors:** `401`, `404`, `409` if already generating or completed.

## POST `/designs/{id}/retry`

Retries a failed design.

**Request**

```json
{
  "prompt": "A refined version with a cleaner layout"
}
```

The prompt may be omitted to retry the original request if the system supports that behavior.

**Success — `202`**

```json
{
  "success": true,
  "message": "Design retry accepted.",
  "data": {
    "design": {
      "id": "DESIGN_ID",
      "status": "pending"
    }
  }
}
```

**Errors:** `401`, `404`, `409` if retry is not permitted.

**Rules:**
- Only the owner or an authorized admin may access the design.
- A background worker or equivalent asynchronous process must update the status.
- Store the final image at a stable URL or object-storage key.
- Define retry limits and whether a retry reuses the same design ID or creates a new version. The examples assume the same design ID.
- Do not expose a `completed` status until the output is safely stored and accessible.

---

# 12. Admin product & category management

**Status:** Proposed. These endpoints require admin authentication and confirmation of the product/category schema.

## POST `/admin/products`

Creates a product.

**Request — illustrative fields**

```json
{
  "name": "Gift Box",
  "description": "A customizable gift box.",
  "price": "25.00",
  "product_type": "normal",
  "category_id": "CATEGORY_ID",
  "image_url": "/uploads/products/gift-box.jpg",
  "is_active": true
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "product": {
      "id": "PRODUCT_ID",
      "name": "Gift Box",
      "price": "25.00",
      "product_type": "normal",
      "category_id": "CATEGORY_ID",
      "is_active": true
    }
  }
}
```

**Errors:** `401`, `403`, `404`, `409`, `422`.

The example fields must be reconciled with the real schema before implementation.

## PUT `/admin/products/{id}`

Replaces editable product fields.

**Request:** Same editable fields as POST.

**Success — `200`**

```json
{
  "success": true,
  "message": "Product updated successfully.",
  "data": {
    "product": {
      "id": "PRODUCT_ID",
      "name": "Gift Box",
      "price": "25.00",
      "product_type": "normal",
      "category_id": "CATEGORY_ID",
      "is_active": true
    }
  }
}
```

## PATCH `/admin/products/{id}`

Partially updates a product.

**Request**

```json
{
  "price": "28.00"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Product partially updated successfully.",
  "data": {
    "product": {
      "id": "PRODUCT_ID",
      "name": "Gift Box",
      "price": "28.00"
    }
  }
}
```

The actual response should return the full product representation if that is the agreed update convention.

## DELETE `/admin/products/{id}`

Deletes or deactivates a product.

**Success — `200`**

```json
{
  "success": true,
  "message": "Product removed successfully.",
  "data": null
}
```

**Recommendation:** Prefer deactivation when historical order items reference the product. Confirm FK behavior before implementing physical deletion.

## POST `/admin/categories`

Creates a category.

**Request**

```json
{
  "name": "Gifts",
  "description": "Gift products",
  "image_url": null
}
```

**Success — `201`**

```json
{
  "success": true,
  "message": "Category created successfully.",
  "data": {
    "category": {
      "id": "CATEGORY_ID",
      "name": "Gifts",
      "description": "Gift products",
      "image_url": null
    }
  }
}
```

## PATCH `/admin/categories/{id}`

Updates selected category fields.

**Request**

```json
{
  "name": "Personalized Gifts"
}
```

**Success — `200`**

```json
{
  "success": true,
  "message": "Category updated successfully.",
  "data": {
    "category": {
      "id": "CATEGORY_ID",
      "name": "Personalized Gifts"
    }
  }
}
```

## DELETE `/admin/categories/{id}`

Removes or deactivates a category.

**Success — `200`**

```json
{
  "success": true,
  "message": "Category removed successfully.",
  "data": null
}
```

**Rule:** Define behavior when products still reference the category. Do not delete related products accidentally.

---

# 13. Frontend integration contract

The frontend should use one API service rather than repeating fetch configuration across pages.

Example `frontend/assets/js/services/api.js`:

```javascript
const API_BASE_URL = "http://localhost/dono/backend/public/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || `Request failed: ${response.status}`
    );
  }

  return result;
}

export const api = {
  get(path) {
    return request(path);
  },

  post(path, body) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  put(path, body) {
    return request(path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  },

  patch(path, body) {
    return request(path, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
  },

  delete(path) {
    return request(path, {
      method: "DELETE"
    });
  }
};
```

**Important integration notes:**

1. `credentials: "include"` is required when sessions use cookies and the frontend/backend are cross-origin. It is harmless for same-origin use, but CSRF protection is still necessary.
2. The code assumes every successful response contains valid JSON. If the backend uses `204 No Content`, adjust the helper to handle that status.
3. Merge options carefully if callers supply custom headers or credentials.
4. Do not store PHP session IDs in local storage.
5. Handle `401` centrally by showing the login flow or clearing authenticated UI state.
6. The backend must generate and validate CSRF tokens for state-changing requests. Define a CSRF-token delivery mechanism before implementing the final session flow.
7. Keep the response envelope consistent so the frontend can rely on `result.data`.

---


# 16. Suggested implementation order

1. Verify the health endpoint and standard response format.
2. Finalize session authentication and authorization middleware.
3. Confirm the database schema and freeze product/category response objects.
4. Implement product listing and product details so the frontend can proceed.
5. Finalize the Cart and Orders contracts with Member 2.
6. Finish coupon authorization and connect coupon validation to server-side order creation.
7. Implement mock payment integration against the agreed Orders API.
8. Define the asynchronous AI workflow and its persistence requirements.
9. Implement admin management endpoints.
10. Test every endpoint with Postman, then integrate the frontend.

**Definition of done for each endpoint:** route exists, validation works, permissions are enforced, success/error responses match the contract, and the endpoint has at least one successful test plus relevant failure tests.

---

## Final status

This document is the **proposed full API inventory and request/response contract for DONO v1**. The confirmed implemented portion is the health check and the coupon CRUD/validation functionality described above, based on the code and tests already shared. The remaining APIs are proposed until their routes, controllers, database dependencies, and behavior are implemented and verified.

Do not mark the full contract as implemented in the team's task board until those checks are complete.
