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

            http_response_code(200);

            header("Content-Type: application/json; charset=utf-8");

            echo json_encode([
                "success" => true,
                "message" => "Products retrieved successfully",
                "data" => $products
            ], JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {

            error_log($e->getMessage());

            http_response_code(500);

            header("Content-Type: application/json; charset=utf-8");

            echo json_encode([
                "success" => false,
                "message" => "Failed to retrieve products"
            ]);
        }
    }

    public function show(int $productId): void
    {
        header("Content-Type: application/json; charset=utf-8");

        // Check if product ID is valid
        if ($productId <= 0) {
            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID"
            ]);

            return;
        }

        try {
            $product = $this->productRepository->getById($productId);

            if (!$product) {
                http_response_code(404);

                echo json_encode([
                    "success" => false,
                    "message" => "Product not found"
                ]);

                return;
            }

            http_response_code(200);

            echo json_encode([
                "success" => true,
                "message" => "Product retrieved successfully",
                "data" => $product
            ], JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {

            error_log($e->getMessage());

            http_response_code(500);

            echo json_encode([
                "success" => false,
                "message" => "Failed to retrieve product"
            ]);
        }
    }

    public function store(): void
    {
        header("Content-Type: application/json; charset=utf-8");

        // Read JSON data sent by the frontend
        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput, true);

        // Check if the JSON is valid
        if (
            !is_array($input) ||
            json_last_error() !== JSON_ERROR_NONE ||
            !str_starts_with(ltrim($rawInput), "{")
        ) {
            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid JSON data. Expected a JSON object"
            ]);

            return;
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
            http_response_code(422);

            echo json_encode([
                "success" => false,
                "message" => "Validation failed",
                "errors" => $errors
            ], JSON_UNESCAPED_UNICODE);

            return;
        }

        // Clean product name
        $name = trim($name);

        // Create product in database
        try {
            $productId = $this->productRepository->create(
                $categoryId,
                $name,
                $description,
                (float) $price,
                $stockQuantity,
                $productType,
                $isActive
            );

            http_response_code(201);

            echo json_encode([
                "success" => true,
                "message" => "Product created successfully",
                "data" => [
                    "id" => $productId
                ]
            ], JSON_UNESCAPED_UNICODE);

        } catch (PDOException $e) {

            error_log($e->getMessage());

            // Handle database constraint errors
            if ($e->getCode() === "23000") {
                http_response_code(422);

                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product data or category"
                ]);

                return;
            }

            http_response_code(500);

            echo json_encode([
                "success" => false,
                "message" => "Failed to create product"
            ]);
        }
    }

    public function update(int $productId): void
    {
        header("Content-Type: application/json; charset=utf-8");

        // Check if product ID is valid
        if ($productId <= 0) {
            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID"
            ]);

            return;
        }

        // Check if product exists
        try {
            $product = $this->productRepository->getById($productId);

            if (!$product) {
                http_response_code(404);

                echo json_encode([
                    "success" => false,
                    "message" => "Product not found"
                ]);

                return;
            }

        } catch (PDOException $e) {

            error_log($e->getMessage());

            http_response_code(500);

            echo json_encode([
                "success" => false,
                "message" => "Failed to retrieve product"
            ]);

            return;
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
            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid JSON data. Expected a JSON object"
            ]);

            return;
        }

        // Validate updated product data
        $errors = $this->validateProduct($input);

        // Return validation errors
        if (!empty($errors)) {
            http_response_code(422);

            echo json_encode([
                "success" => false,
                "message" => "Validation failed",
                "errors" => $errors
            ], JSON_UNESCAPED_UNICODE);

            return;
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
                http_response_code(500);

                echo json_encode([
                    "success" => false,
                    "message" => "Failed to update product"
                ]);

                return;
            }

            http_response_code(200);

            echo json_encode([
                "success" => true,
                "message" => "Product updated successfully"
            ], JSON_UNESCAPED_UNICODE);

        } catch (PDOException $e) {

            error_log($e->getMessage());

            // Handle database constraint errors
            if ($e->getCode() === "23000") {
                http_response_code(422);

                echo json_encode([
                    "success" => false,
                    "message" => "Invalid product data or category"
                ]);

                return;
            }

            http_response_code(500);

            echo json_encode([
                "success" => false,
                "message" => "Failed to update product"
            ]);
        }
    }

    public function destroy(int $productId): void
    {
        header("Content-Type: application/json; charset=utf-8");

        // Check if product ID is valid
        if ($productId <= 0) {
            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid product ID"
            ]);

            return;
        }

        try {
            // Check if product exists
            $product = $this->productRepository->getById($productId);

            if (!$product) {
                http_response_code(404);

                echo json_encode([
                    "success" => false,
                    "message" => "Product not found"
                ]);

                return;
            }

            // Soft delete product
            $deleted = $this->productRepository->delete($productId);

            if (!$deleted) {
                http_response_code(404);

                echo json_encode([
                    "success" => false,
                    "message" => "Product not found or already deleted"
                ]);

                return;
            }

            http_response_code(200);

            echo json_encode([
                "success" => true,
                "message" => "Product deleted successfully"
            ]);

        } catch (PDOException $e) {

            error_log($e->getMessage());

            http_response_code(500);

            echo json_encode([
                "success" => false,
                "message" => "Failed to delete product"
            ]);
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