<?php

class ProductController
{
    private ProductRepository $productRepository;

    public function __construct(ProductRepository $productRepository)
    {
        $this->productRepository = $productRepository;
    }

    public function index(): void
    {
        try {
            $products = $this->productRepository->getAll();

            Response::send(
                true,
                "Products retrieved successfully",
                $products,
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve products",
                null,
                500
            );
        }
    }

    public function publicIndex(): void
    {
        // Get page and limit from query parameters
        $page = filter_var(
            $_GET["page"] ?? 1,
            FILTER_VALIDATE_INT,
            ["options" => ["min_range" => 1, "max_range" => 1000000]]
        );

        $limit = filter_var(
            $_GET["limit"] ?? 12,
            FILTER_VALIDATE_INT,
            ["options" => ["min_range" => 1, "max_range" => 100]]
        );

        // Validate pagination values
        if ($page === false || $limit === false) {
            Response::send(
                false,
                "Page and limit must be valid positive integers",
                null,
                422
            );
        }

        // Calculate how many products to skip
        $offset = ($page - 1) * $limit;

        try {
            // Get active products with category and primary image
            $products = $this->productRepository->getActiveProducts(
                $limit,
                $offset
            );

            // Count all active products
            $total = $this->productRepository->countActiveProducts();

            // Calculate total pages
            $totalPages = (int) ceil($total / $limit);

            // Prepare public product data
            $items = [];

            foreach ($products as $product) {
                $items[] = [
                    "id" => (int) $product["id"],
                    "name" => $product["name"],
                    "description" => $product["description"],
                    "price" => $product["price"],
                    "product_type" => $product["product_type"],
                    "image_url" => $product["image_url"],
                    "category" => [
                        "id" => (int) $product["category_id"],
                        "name" => $product["category_name"]
                    ],
                    "is_active" => (bool) $product["is_active"]
                ];
            }

            // Send products with pagination information
            Response::send(
                true,
                "Products retrieved successfully",
                [
                    "items" => $items,
                    "pagination" => [
                        "page" => $page,
                        "limit" => $limit,
                        "total" => $total,
                        "total_pages" => $totalPages
                    ]
                ],
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve products",
                null,
                500
            );
        }
    }

    public function publicCategories(): void
    {
        try {
            // Get available categories from database
            $categories = $this->productRepository->getAvailableCategories();

            // Prepare categories for API response
            $items = [];

            foreach ($categories as $category) {
                $items[] = [
                    "id" => (int) $category["id"],
                    "name" => $category["name"],
                    "description" => $category["description"],
                    "image_url" => $category["image_url"]
                ];
            }

            // Send categories response
            Response::send(
                true,
                "Categories retrieved successfully",
                ["items" => $items],
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve categories",
                null,
                500
            );
        }
    }

    public function publicShow(int $productId): void
    {
        try {
            // Get one active product by ID
            $product = $this->productRepository->getActiveProductById($productId);

            // Check if the product exists and is active
            if (!$product) {
                Response::send(
                    false,
                    "Product not found",
                    null,
                    404
                );
            }

            // Prepare public product details
            $productData = [
                "id" => (int) $product["id"],
                "name" => $product["name"],
                "description" => $product["description"],
                "price" => $product["price"],
                "stock_quantity" => (int) $product["stock_quantity"],
                "product_type" => $product["product_type"],
                "image_url" => $product["image_url"],
                "category" => [
                    "id" => (int) $product["category_id"],
                    "name" => $product["category_name"]
                ],
                "is_active" => (bool) $product["is_active"]
            ];

            // Send product details
            Response::send(
                true,
                "Product retrieved successfully",
                ["product" => $productData],
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve product",
                null,
                500
            );
        }
    }

    public function show(int $productId): void
    {
        // Check if product ID is valid
        if ($productId <= 0) {
            Response::send(
                false,
                "Invalid product ID",
                null,
                400
            );
        }

        try {
            $product = $this->productRepository->getById($productId);

            if (!$product) {
                Response::send(
                    false,
                    "Product not found",
                    null,
                    404
                );
            }

            Response::send(
                true,
                "Product retrieved successfully",
                $product,
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve product",
                null,
                500
            );
        }
    }

    public function store(): void
    {
        // Read JSON data sent by the frontend
        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput, true);

        // Check if the JSON is valid
        if (
            !is_array($input) ||
            json_last_error() !== JSON_ERROR_NONE ||
            !str_starts_with(ltrim($rawInput), "{")
        ) {
            Response::send(
                false,
                "Invalid JSON data. Expected a JSON object",
                null,
                400
            );
        }

        // Get product data
        $categoryId = $input["category_id"] ?? null;
        $name = $input["name"] ?? null;
        $description = $input["description"] ?? null;
        $price = $input["price"] ?? null;
        $stockQuantity = $input["stock_quantity"] ?? null;
        $productType = $input["product_type"] ?? "normal";
        $isActive = $input["is_active"] ?? 1;

        // Validate product data
        $errors = $this->validateProduct($input);

        // Return validation errors
        if (!empty($errors)) {
            Response::send(
                false,
                "Validation failed",
                ["errors" => $errors],
                422
            );
        }

        // Clean product name
        $name = trim($name);

        // Create product in database
        try {
            // Check if category exists
            if (!$this->productRepository->categoryExists($categoryId)) {
                Response::send(
                    false,
                    "Category not found",
                    ["errors" => [
                        "category_id" => "Selected category does not exist"
                    ]],
                    422
                );
            }

            $productId = $this->productRepository->create(
                $categoryId,
                $name,
                $description,
                (float) $price,
                $stockQuantity,
                $productType,
                $isActive
            );

            Response::send(
                true,
                "Product created successfully",
                ["id" => $productId],
                201
            );

        } catch (PDOException $e) {

            error_log($e->getMessage());

            // Handle database constraint errors
            if ($e->getCode() === "23000") {
                Response::send(
                    false,
                    "Invalid product data or category",
                    null,
                    422
                );
            }

            Response::send(
                false,
                "Failed to create product",
                null,
                500
            );
        }
    }

    public function update(int $productId): void
    {
        // Check if product ID is valid
        if ($productId <= 0) {
            Response::send(
                false,
                "Invalid product ID",
                null,
                400
            );
        }

        // Check if product exists
        try {
            $product = $this->productRepository->getById($productId);

            if (!$product) {
                Response::send(
                    false,
                    "Product not found",
                    null,
                    404
                );
            }

        } catch (PDOException $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve product",
                null,
                500
            );
        }

        // Read JSON data sent by the frontend
        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput, true);

        // Check if JSON is valid
        if (
            !is_array($input) ||
            json_last_error() !== JSON_ERROR_NONE ||
            !str_starts_with(ltrim($rawInput), "{")
        ) {
            Response::send(
                false,
                "Invalid JSON data. Expected a JSON object",
                null,
                400
            );
        }

        // Validate updated product data
        $errors = $this->validateProduct($input);

        // Return validation errors
        if (!empty($errors)) {
            Response::send(
                false,
                "Validation failed",
                ["errors" => $errors],
                422
            );
        }

        // Get product data
        $categoryId = $input["category_id"];
        $name = trim($input["name"]);
        $description = $input["description"] ?? null;
        $price = (float) $input["price"];
        $stockQuantity = $input["stock_quantity"];
        $productType = $input["product_type"] ?? "normal";
        $isActive = $input["is_active"] ?? 1;

        // Update product in database
        try {
            // Check if category exists
            if (!$this->productRepository->categoryExists($categoryId)) {
                Response::send(
                    false,
                    "Category not found",
                    ["errors" => [
                        "category_id" => "Selected category does not exist"
                    ]],
                    422
                );
            }

            $updated = $this->productRepository->update(
                $productId,
                $categoryId,
                $name,
                $description,
                $price,
                $stockQuantity,
                $productType,
                $isActive
            );

            if (!$updated) {
                Response::send(
                    false,
                    "Failed to update product",
                    null,
                    500
                );
            }

            Response::send(
                true,
                "Product updated successfully",
                null,
                200
            );

        } catch (PDOException $e) {

            error_log($e->getMessage());

            // Handle database constraint errors
            if ($e->getCode() === "23000") {
                Response::send(
                    false,
                    "Invalid product data or category",
                    null,
                    422
                );
            }

            Response::send(
                false,
                "Failed to update product",
                null,
                500
            );
        }
    }

    public function destroy(int $productId): void
    {
        // Check if product ID is valid
        if ($productId <= 0) {
            Response::send(
                false,
                "Invalid product ID",
                null,
                400
            );
        }

        try {
            // Check if product exists
            $product = $this->productRepository->getById($productId);

            if (!$product) {
                Response::send(
                    false,
                    "Product not found",
                    null,
                    404
                );
            }

            // Soft delete product
            $deleted = $this->productRepository->delete($productId);

            if (!$deleted) {
                Response::send(
                    false,
                    "Product not found or already deleted",
                    null,
                    404
                );
            }

            Response::send(
                true,
                "Product deleted successfully",
                null,
                200
            );

        } catch (PDOException $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to delete product",
                null,
                500
            );
        }
    }

    private function validateProduct(array $input): array
    {
        $errors = [];

        // Validate category ID
        $categoryId = $input["category_id"] ?? null;

        if (!is_int($categoryId) || $categoryId <= 0) {
            $errors["category_id"] = "Valid category ID is required";
        }

        // Validate product name
        $name = $input["name"] ?? null;

        if (!is_string($name) || trim($name) === "") {
            $errors["name"] = "Product name is required";
        } elseif (mb_strlen(trim($name), "UTF-8") > 150) {
            $errors["name"] = "Product name must not exceed 150 characters";
        }

        // Validate description
        $description = $input["description"] ?? null;

        if ($description !== null && !is_string($description)) {
            $errors["description"] = "Description must be text";
        }

        // Validate price
        $price = $input["price"] ?? null;

        if (
            (!is_int($price) && !is_float($price) && !is_string($price)) ||
            !preg_match('/^\d{1,8}(\.\d{1,2})?$/', (string) $price)
        ) {
            $errors["price"] = "Price must be a valid non-negative number with up to 2 decimal places";
        }

        // Validate stock quantity
        $stockQuantity = $input["stock_quantity"] ?? null;

        if (
            !is_int($stockQuantity) ||
            $stockQuantity < 0 ||
            $stockQuantity > 2147483647
        ) {
            $errors["stock_quantity"] = "Stock quantity must be a valid non-negative integer";
        }

        // Validate product type
        $productType = $input["product_type"] ?? "normal";

        $allowedTypes = ["normal", "package", "custom_box"];

        if (!in_array($productType, $allowedTypes, true)) {
            $errors["product_type"] = "Invalid product type";
        }

        // Validate product status
        $isActive = $input["is_active"] ?? 1;

        if ($isActive !== 0 && $isActive !== 1) {
            $errors["is_active"] = "Product status must be 0 or 1";
        }

        return $errors;
    }
}