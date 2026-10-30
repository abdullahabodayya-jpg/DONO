<?php

declare(strict_types=1);

// ========================================
// DEPENDENCIES
// ========================================

require_once __DIR__ . '/../app/Repositories/CouponRepository.php';

require_once __DIR__ . '/../app/Controllers/CouponController.php';
require_once __DIR__ . '/../app/Controllers/CartController.php';
require_once __DIR__ . '/../app/Controllers/WishlistController.php';
require_once __DIR__ . '/../app/Controllers/OrderController.php';
require_once __DIR__ . '/../app/Controllers/AdminOrderController.php';

require_once __DIR__ . '/../app/Repositories/ProductRepository.php';
require_once __DIR__ . '/../app/Repositories/ProductImageRepository.php';

require_once __DIR__ . '/../app/Controllers/ProductController.php';
require_once __DIR__ . '/../app/Controllers/ProductImageController.php';

require_once __DIR__ . '/../app/Middleware/AdminMiddleware.php';


// ========================================
// MIDDLEWARE
// ========================================

$adminMiddleware = new AdminMiddleware();


// ========================================
// HEALTH CHECK
// ========================================

$router->get('/api/health', function () use ($database): void {

    $database->getConnection()->query('SELECT 1');

    Response::success(
        'DONO API is running.',
        ['database' => 'connected']
    );
});


// ========================================
// COUPONS API
// ========================================

$couponController = new CouponController($database);

// GET ALL COUPONS (ADMIN)
$router->get('/api/coupons', function () use (
    $couponController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $couponController->index();
});

// GET ONE COUPON (ADMIN)
$router->get('/api/coupons/{id}', function (string $id) use (
    $couponController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $couponController->show($id);
});

// CREATE COUPON (ADMIN)
$router->post('/api/coupons', function () use (
    $couponController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $couponController->store();
});

// UPDATE COUPON (ADMIN)
$router->put('/api/coupons/{id}', function (string $id) use (
    $couponController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $couponController->update($id);
});

// PATCH COUPON (ADMIN)
$router->patch('/api/coupons/{id}', function (string $id) use (
    $couponController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $couponController->patch($id);
});

// DELETE COUPON (ADMIN)
$router->delete('/api/coupons/{id}', function (string $id) use (
    $couponController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $couponController->destroy($id);
});

// VALIDATE COUPON (PUBLIC)
$router->post('/api/coupons/validate', function () use (
    $couponController
): void {
    $couponController->validateCoupon();
});


// ========================================
// CART API
// ========================================

$cartController = new CartController(
    $database->getConnection()
);

// GET CART
$router->get('/api/cart', function () use ($cartController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    $result = $cartController->getCart((int) $userId);

    Response::success('Cart loaded successfully.', $result);
});

// ADD TO CART
$router->post('/api/cart', function () use ($cartController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    $body = json_decode(file_get_contents('php://input'), true);

    if (
        !is_array($body)
        || !isset($body['product_id'], $body['quantity'])
        || filter_var($body['product_id'], FILTER_VALIDATE_INT) === false
        || filter_var($body['quantity'], FILTER_VALIDATE_INT) === false
        || (int) $body['product_id'] <= 0
        || (int) $body['quantity'] <= 0
    ) {
        Response::send(
            false,
            'Valid product ID and quantity are required.',
            null,
            422
        );
    }

    $result = $cartController->addToCart(
        (int) $userId,
        (int) $body['product_id'],
        (int) $body['quantity']
    );

    Response::send(
        $result['success'],
        $result['message'],
        $result['success'] ? ['order_id' => $result['order_id']] : null,
        $result['success'] ? 201 : 422
    );
});

// UPDATE CART QUANTITY
$router->put('/api/cart/items', function () use ($cartController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    $body = json_decode(file_get_contents('php://input'), true);

    if (
        !is_array($body)
        || !isset($body['product_id'], $body['quantity'])
        || filter_var($body['product_id'], FILTER_VALIDATE_INT) === false
        || filter_var($body['quantity'], FILTER_VALIDATE_INT) === false
        || (int) $body['product_id'] <= 0
        || (int) $body['quantity'] <= 0
    ) {
        Response::send(
            false,
            'Valid product ID and quantity are required.',
            null,
            422
        );
    }

    $result = $cartController->updateCartQuantity(
        (int) $userId,
        (int) $body['product_id'],
        (int) $body['quantity']
    );

    Response::send(
        $result['success'],
        $result['message'],
        null,
        $result['success'] ? 200 : 422
    );
});

// REMOVE FROM CART
$router->delete('/api/cart/items', function () use ($cartController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    $body = json_decode(file_get_contents('php://input'), true);

    if (
        !is_array($body)
        || !isset($body['product_id'])
        || filter_var($body['product_id'], FILTER_VALIDATE_INT) === false
        || (int) $body['product_id'] <= 0
    ) {
        Response::send(false, 'Valid product ID is required.', null, 422);
    }

    $result = $cartController->removeFromCart(
        (int) $userId,
        (int) $body['product_id']
    );

    Response::send(
        $result['success'],
        $result['message'],
        null,
        $result['success'] ? 200 : 422
    );
});


// ========================================
// WISHLIST API
// ========================================

$wishlistController = new WishlistController(
    $database->getConnection()
);

// GET WISHLIST
$router->get('/api/wishlist', function () use ($wishlistController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    $result = $wishlistController->getWishlist((int) $userId);

    if (!$result['success']) {
        Response::send(false, $result['message'], null, 500);
    }

    Response::success(
        $result['message'],
        ['items' => $result['items']]
    );
});

// ADD TO WISHLIST
$router->post('/api/wishlist/items', function () use ($wishlistController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    $body = json_decode(file_get_contents('php://input'), true);

    if (
        !is_array($body)
        || !isset($body['product_id'])
        || filter_var($body['product_id'], FILTER_VALIDATE_INT) === false
        || (int) $body['product_id'] <= 0
    ) {
        Response::send(false, 'Valid product ID is required.', null, 422);
    }

    $result = $wishlistController->addToWishlist(
        (int) $userId,
        (int) $body['product_id']
    );

    Response::send(
        $result['success'],
        $result['message'],
        null,
        $result['success'] ? 201 : 422
    );
});

// REMOVE FROM WISHLIST
$router->delete('/api/wishlist/items/{productId}', function (
    string $productId
) use ($wishlistController): void {

    $userId = $_SESSION['user']['id'] ?? null;

    if (!is_numeric($userId) || (int) $userId <= 0) {
        Response::send(false, 'Authentication required.', null, 401);
    }

    if (
        filter_var($productId, FILTER_VALIDATE_INT) === false
        || (int) $productId <= 0
    ) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $result = $wishlistController->removeFromWishlist(
        (int) $userId,
        (int) $productId
    );

    Response::send(
        $result['success'],
        $result['message'],
        null,
        $result['success'] ? 200 : 422
    );
});


// ========================================
// MY ORDERS API
// ========================================

$orderController = new OrderController(
    $database->getConnection()
);

$router->get('/api/orders', function () use ($orderController): void {
    $orderController->getMyOrders();
});


// ========================================
// ADMIN ORDERS API
// ========================================

$adminOrderController = new AdminOrderController(
    $database->getConnection()
);

// GET ALL ORDERS
$router->get('/api/admin/orders', function () use (
    $adminOrderController
): void {
    $adminOrderController->getAllOrders();
});

// UPDATE ORDER STATUS
$router->put('/api/admin/orders/{id}/status', function (
    string $id
) use ($adminOrderController): void {

    if (!ctype_digit($id) || (int) $id <= 0) {
        Response::send(false, 'Invalid order ID.', null, 422);
    }

    $adminOrderController->updateStatus((int) $id);
});


/*
|--------------------------------------------------------------------------
| PRODUCTS API
|--------------------------------------------------------------------------
*/

// Use the existing database connection
$pdo = $database->getConnection();

// Initialize repositories
$productRepository = new ProductRepository($pdo);
$productImageRepository = new ProductImageRepository($pdo);

// Initialize controllers
$productController = new ProductController($productRepository);

$productImageController = new ProductImageController(
    $productImageRepository,
    $productRepository
);


/*
|--------------------------------------------------------------------------
| PUBLIC PRODUCTS
|--------------------------------------------------------------------------
*/

// GET /api/products
// Get all active products
$router->get('/api/products', function () use (
    $productController
): void {
    $productController->publicIndex();
});


// GET /api/products/{id}
// Get one active product
$router->get('/api/products/{id}', function (
    string $id
) use ($productController): void {

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $productController->publicShow($productId);
});


// GET /api/products/{id}/images
// Get images of an active product
$router->get('/api/products/{id}/images', function (
    string $id
) use (
    $productImageController,
    $productRepository
): void {

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    if (!$productRepository->getActiveProductById($productId)) {
        Response::send(false, 'Product not found.', null, 404);
    }

    $productImageController->index($productId);
});


// GET /api/categories
// Get public categories
$router->get('/api/categories', function () use (
    $productController
): void {
    $productController->publicCategories();
});


/*
|--------------------------------------------------------------------------
| ADMIN PRODUCTS
|--------------------------------------------------------------------------
*/

// GET /api/admin/products
$router->get('/api/admin/products', function () use (
    $productController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $productController->index();
});


// GET /api/admin/products/{id}
$router->get('/api/admin/products/{id}', function (
    string $id
) use (
    $productController,
    $adminMiddleware
): void {

    $adminMiddleware->handle();

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $productController->show($productId);
});


// POST /api/admin/products
$router->post('/api/admin/products', function () use (
    $productController,
    $adminMiddleware
): void {
    $adminMiddleware->handle();
    $productController->store();
});


// PUT /api/admin/products/{id}
$router->put('/api/admin/products/{id}', function (
    string $id
) use (
    $productController,
    $adminMiddleware
): void {

    $adminMiddleware->handle();

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $productController->update($productId);
});


// DELETE /api/admin/products/{id}
$router->delete('/api/admin/products/{id}', function (
    string $id
) use (
    $productController,
    $adminMiddleware
): void {

    $adminMiddleware->handle();

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $productController->destroy($productId);
});


/*
|--------------------------------------------------------------------------
| ADMIN PRODUCT IMAGES
|--------------------------------------------------------------------------
*/

// GET /api/admin/products/{id}/images
$router->get('/api/admin/products/{id}/images', function (
    string $id
) use (
    $productImageController,
    $adminMiddleware
): void {

    $adminMiddleware->handle();

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $productImageController->index($productId);
});


// POST /api/admin/products/{id}/images
$router->post('/api/admin/products/{id}/images', function (
    string $id
) use (
    $productImageController,
    $adminMiddleware
): void {

    $adminMiddleware->handle();

    $productId = filter_var(
        $id,
        FILTER_VALIDATE_INT,
        ['options' => ['min_range' => 1]]
    );

    if ($productId === false) {
        Response::send(false, 'Invalid product ID.', null, 422);
    }

    $productImageController->upload($productId);
});


// DELETE /api/admin/products/{id}/images/{imageId}
$router->delete(
    '/api/admin/products/{id}/images/{imageId}',
    function (
        string $id,
        string $imageId
    ) use (
        $productImageController,
        $adminMiddleware
    ): void {

        $adminMiddleware->handle();

        $productId = filter_var(
            $id,
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1]]
        );

        $validatedImageId = filter_var(
            $imageId,
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1]]
        );

        if ($productId === false || $validatedImageId === false) {
            Response::send(
                false,
                'Invalid product or image ID.',
                null,
                422
            );
        }

        $productImageController->destroy(
            $productId,
            $validatedImageId
        );
    }
);


// PATCH /api/admin/products/{id}/images/{imageId}/primary
$router->patch(
    '/api/admin/products/{id}/images/{imageId}/primary',
    function (
        string $id,
        string $imageId
    ) use (
        $productImageController,
        $adminMiddleware
    ): void {

        $adminMiddleware->handle();

        $productId = filter_var(
            $id,
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1]]
        );

        $validatedImageId = filter_var(
            $imageId,
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1]]
        );

        if ($productId === false || $validatedImageId === false) {
            Response::send(
                false,
                'Invalid product or image ID.',
                null,
                422
            );
        }

        $productImageController->setPrimary(
            $productId,
            $validatedImageId
        );
    }
);
