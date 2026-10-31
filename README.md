DONO — E-Commerce Gift Store
DONO is a full-stack e-commerce platform for discovering, purchasing, and managing thoughtfully curated gift packages. It brings together a customer-friendly shopping experience and an administrative dashboard for managing store operations.
Features
Customer Experience
- Gift discovery: Browse products, explore categories, and view detailed product information and images.
- Customer accounts: Registration, login, and profile management.
- Shopping cart: Add products, adjust quantities, remove items, and view order totals.
- Wishlist: Save favorite products and manage a personal wishlist.
- My Orders: View orders and follow their status.
- Checkout and payments: Stripe-powered checkout, payment status, and payment result pages.
- Reviews: View and submit product reviews.
- Coupons: Apply and validate promotional codes.
Administration
- Dashboard: View store statistics and operational insights.
- Product management: Manage products, product details, and images.
- Order management: Review customer orders and update their statuses.
- Coupon management: Create, edit, and manage discount codes.
- Review management: Moderate customer reviews.
- Payment management: Monitor payments and process refunds.
Technology Stack
Layer	Technologies
Frontend	HTML5, CSS3, JavaScript
Backend	PHP 8+, Object-Oriented Programming
Database	MySQL with PDO
API	REST-style JSON endpoints
Payment integration	Stripe PHP SDK
Local development	XAMPP, Apache, phpMyAdmin
Dependency management	Composer


Project Structure
DONO/
├── frontend/
│   ├── admin/                   # Admin dashboard and management pages
│   ├── assets/
│   │   ├── css/                 # Stylesheets
│   │   ├── js/                  # Client-side scripts and API helpers
│   │   └── images/              # Image assets
│   ├── cart.html
│   ├── wishlist.html
│   ├── my-orders.html
│   ├── products.html
│   ├── product-details.html
│   ├── login.html
│   ├── register.html
│   └── ...                       # Additional customer and payment pages
├── backend/
│   ├── app/
│   │   ├── Controllers/         # Request handling
│   │   ├── Repositories/        # Database operations
│   │   ├── Core/                # Database, Router, Response
│   │   ├── Middleware/          # Access control
│   │   ├── Helpers/
│   │   └── services/
│   ├── config/                   # Configuration template
│   ├── database/                 # SQL schema, seeders, migrations
│   ├── public/                   # API entry point and rewrite rules
│   ├── routes/                   # API route definitions
│   └── composer.json
└── docs/
    └── api-endpoints.md
Getting Started
Requirements
- PHP 8.2 or compatible PHP 8+ version
- MySQL
- Apache with URL rewriting enabled
- Composer
- XAMPP (recommended for local development)
Installation
1. Clone the repository into your local web directory:
   git clone https://github.com/abdullahabodayya-jpg/DONO.git
2. Start Apache and MySQL using XAMPP.
3. Create a MySQL database in phpMyAdmin. Import backend/database/schema.sql and, if needed, backend/database/seeders.sql.
4. Copy backend/config/config.example.php to backend/config/config.php and update the database name and credentials.
5. Install PHP dependencies:
   cd DONO/backend
   composer install
6. Open the frontend from your local Apache server. For a repository folder named DONO in htdocs, the storefront is available at:
   http://localhost/DONO/frontend/
   The API base URL is:
   http://localhost/DONO/backend/public/api/
   Adjust the URLs if your local folder has a different name.
API Overview
The backend uses JSON-based endpoints with HTTP methods such as GET, POST, PUT, PATCH, and DELETE.
Area	Example endpoints
Health check	GET /api/health
Products	GET /api/products, GET /api/products/{id}
Cart	GET /api/cart, POST /api/cart, PUT /api/cart/items, DELETE /api/cart/items
Wishlist	GET /api/wishlist, POST /api/wishlist/items, DELETE /api/wishlist/items/{productId}
Customer orders	GET /api/orders
Admin orders	GET /api/admin/orders, PUT /api/admin/orders/{id}/status
Coupons	GET /api/coupons, POST /api/coupons/validate
Payments	POST /api/payments/checkout, GET /api/payments/status
Reviews	GET /api/products/{id}/reviews, POST /api/products/{id}/reviews
Admin dashboard	GET /api/admin/dashboard


See [`docs/api-endpoints.md`](docs/api-endpoints.md) for additional API documentation. Some endpoints require an authenticated customer or administrator session.
Architecture
DONO separates frontend presentation from backend business logic. The PHP backend is organized into Controllers, Repositories, Core utilities, Middleware, and Services, with MySQL accessed through PDO. The frontend communicates with the backend through JSON API requests.
Database
The SQL files are located in backend/database/:
- schema.sql — database schema
- seeders.sql — seed data
- migration_stripe_refunds.sql — Stripe refund-related migration
Team Project
DONO is a collaborative e-commerce project developed using Git and GitHub, with work organized across customer-facing and administrative features.
DONO — Make gifting easier.
