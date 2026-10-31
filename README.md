# 🎁 DONO — E-Commerce Gift Store

**DONO** is a full-stack e-commerce platform designed to make gifting easier. It allows customers to discover thoughtful gifts, shop curated products, manage wishlists, place orders, and enjoy a smooth online shopping experience.

The platform also includes an administrative dashboard for managing products, orders, coupons, reviews, and payments.

**DONO — Make gifting easier.**

---

## 📌 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Overview](#-api-overview)
- [Architecture](#-architecture)
- [Database](#-database)
- [Website Screenshots](#-website-screenshots)
- [Team Members](#-team-members)
- [Team Project](#-team-project)

---

## ✨ Features

### 🛍️ Customer Experience

- **Gift Discovery:** Browse products, explore categories, and view detailed product information and images.
- **Customer Accounts:** Register, log in, and manage personal profiles.
- **Shopping Cart:** Add products, update quantities, remove items, and calculate order totals.
- **Wishlist:** Save favorite products for later.
- **My Orders:** View previous orders and track order statuses.
- **Checkout and Payments:** Integrated Stripe checkout with payment status and result pages.
- **Product Reviews:** View and submit product reviews.
- **Coupons:** Apply and validate promotional discount codes.

### ⚙️ Administration

- **Admin Dashboard:** View store statistics and operational insights.
- **Product Management:** Add, edit, and manage products and product images.
- **Order Management:** Review customer orders and update order statuses.
- **Coupon Management:** Create, edit, and manage promotional codes.
- **Review Management:** Moderate customer reviews.
- **Payment Management:** Monitor payment records and handle refund workflows.

---

## 💻 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | PHP 8+, Object-Oriented Programming (OOP) |
| Database | MySQL |
| Database Access | PDO |
| API | REST-style JSON endpoints |
| Payment Integration | Stripe PHP SDK |
| Local Development | XAMPP, Apache, phpMyAdmin |
| Dependency Management | Composer |
| Version Control | Git and GitHub |
| API Testing | Postman |

---

## 📁 Project Structure

```text
DONO/
├── frontend/
│   ├── admin/
│   ├── assets/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   ├── cart.html
│   ├── wishlist.html
│   ├── my-orders.html
│   ├── products.html
│   ├── product-details.html
│   ├── login.html
│   └── register.html
│
├── backend/
│   ├── app/
│   │   ├── Controllers/
│   │   ├── Repositories/
│   │   ├── Core/
│   │   ├── Middleware/
│   │   ├── Helpers/
│   │   └── services/
│   ├── config/
│   ├── database/
│   │   ├── schema.sql
│   │   ├── seeders.sql
│   │   └── migration_stripe_refunds.sql
│   ├── public/
│   ├── routes/
│   └── composer.json
│
├── docs/
│   └── api-endpoints.md
│
├── screenshots/
│
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run DONO locally.

### Prerequisites

Make sure you have the following installed:

- PHP 8.2 or a compatible PHP 8+ version
- MySQL
- Apache with URL rewriting enabled
- Composer
- XAMPP (recommended)
- Git

### 1. Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/abdullahabodayya-jpg/DONO.git
```

Navigate to the project directory:

```bash
cd DONO
```

### 2. Start XAMPP

Open the XAMPP Control Panel and start:

- Apache
- MySQL

### 3. Create the Database

1. Open phpMyAdmin at `http://localhost/phpmyadmin/`.
2. Create a MySQL database.
3. Import `backend/database/schema.sql`.
4. Import `backend/database/seeders.sql` if sample data is needed.

### 4. Configure the Backend

Copy the example configuration file:

```text
backend/config/config.example.php
```

Create `backend/config/config.php` from that example and update the database name, username, password, and other required settings.

Do not commit private credentials or Stripe secret keys to GitHub.

### 5. Install Dependencies

From the backend directory, run:

```bash
cd backend
composer install
```

### 6. Open the Website

If the project folder is located inside XAMPP's `htdocs` directory, open:

**Frontend:**

`http://localhost/DONO/frontend/`

**API Base URL:**

`http://localhost/DONO/backend/public/api/`

Replace `DONO` in the URLs if your local folder has a different name.

> **Note:** The URLs above assume the project is configured to run from the stated directories. Apache rewrite rules, PHP configuration, and backend routing may require additional setup.

---

## 🔌 API Overview

DONO uses JSON-based API endpoints to connect the frontend with the PHP backend.

The API supports HTTP methods such as `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`, depending on the endpoint.

| Area | Example Endpoints |
|---|---|
| Health Check | `GET /api/health` |
| Products | `GET /api/products`, `GET /api/products/{id}` |
| Shopping Cart | `GET /api/cart`, `POST /api/cart` |
| Cart Items | `PUT /api/cart/items`, `DELETE /api/cart/items` |
| Wishlist | `GET /api/wishlist`, `POST /api/wishlist/items` |
| Wishlist Items | `DELETE /api/wishlist/items/{productId}` |
| Customer Orders | `GET /api/orders` |
| Admin Orders | `GET /api/admin/orders` |
| Order Status | `PUT /api/admin/orders/{id}/status` |
| Coupons | `GET /api/coupons`, `POST /api/coupons/validate` |
| Payments | `POST /api/payments/checkout`, `GET /api/payments/status` |
| Product Reviews | `GET /api/products/{id}/reviews`, `POST /api/products/{id}/reviews` |
| Admin Dashboard | `GET /api/admin/dashboard` |

For additional endpoint details, see [`docs/api-endpoints.md`](docs/api-endpoints.md).

**Note:** These are example routes based on the project documentation. Actual routes and authentication requirements depend on the backend implementation.

---

## 🏗️ Architecture

DONO separates frontend presentation from backend business logic.

### Frontend

The frontend is built with HTML, CSS, and JavaScript. It provides the customer storefront, product pages, shopping cart, account pages, and administrative interfaces.

### Backend

The backend is built with PHP and Object-Oriented Programming (OOP). It handles requests, business logic, authentication, authorization, and database operations.

### Database

MySQL stores application data, while PDO provides database connectivity and prepared statements.

### API Communication

The frontend communicates with the backend through JSON requests and responses, allowing the application to exchange data without mixing presentation code with database operations.

---

## 🗄️ Database

Database-related files are located in `backend/database/`.

| File | Purpose |
|---|---|
| `schema.sql` | Defines the database structure |
| `seeders.sql` | Provides initial or sample data |
| `migration_stripe_refunds.sql` | Contains Stripe refund-related database changes |

The database schema and seed data should be reviewed before running the project in a new environment.

---

## 📸 Website Screenshots

The following screenshots showcase the DONO storefront and administration dashboard.

**Important:** The image paths below must match the actual filenames inside the `screenshots/` directory. Replace any filename that differs from your repository.

### 🏠 Landing Page

![DONO Landing Page](screenshots/Screenshot%202026-10-31%20205434.png)

### 🛍️ Products Page

![DONO Products Page](screenshots/Screenshot%202026-10-31%20213815.png)

### 🔐 Login Page

![DONO Login Page](screenshots/Screenshot%202026-10-31%20205521.png)

### 🗂️ Categories Page

![DONO Categories Page](screenshots/Screenshot%202026-10-31%20213848.png)

### 📊 Admin Dashboard

![DONO Admin Dashboard](screenshots/dashboard.png)

### 📦 Order Management

![DONO Order Management](screenshots/Screenshot%202026-10-31%20213913.png)

---

## 👥 Team Members

| Name | Role |
|---|---|
| Tamara | Product Owner |
| Abdullah | Scrum Master |
| Mousa | Developer |
| Anas | Developer |
| Leen Khateeb | Developer |

---

## 🤝 Team Project

DONO is a collaborative university e-commerce project developed as a team.

The team uses Git and GitHub for version control, collaboration, and feature development. The project combines frontend development, backend programming, database management, and API integration to create a complete e-commerce experience.

---

## 📄 Documentation

For additional API information, see:

[`docs/api-endpoints.md`](docs/api-endpoints.md)

---

**DONO — Make gifting easier.** 🎁
