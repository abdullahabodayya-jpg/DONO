<?php

class ProductImageController
{
    private ProductImageRepository $imageRepository;
    private ProductRepository $productRepository;

    public function __construct(
        ProductImageRepository $imageRepository,
        ProductRepository $productRepository
    ) {
        $this->imageRepository = $imageRepository;
        $this->productRepository = $productRepository;
    }

    public function upload(int $productId): void
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

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve product",
                null,
                500
            );
        }

        // Check if image was uploaded
        if (!isset($_FILES["image"])) {
            Response::send(
                false,
                "Image is required",
                null,
                400
            );
        }

        // Get uploaded image
        $image = $_FILES["image"];

        // Check upload errors
        if (
            !is_array($image) ||
            !isset($image["error"]) ||
            !is_int($image["error"]) ||
            $image["error"] !== UPLOAD_ERR_OK
        ) {
            Response::send(
                false,
                "Image upload failed",
                null,
                400
            );
        }

        // Validate image size (maximum 5 MB)
        $maxSize = 5 * 1024 * 1024;

        if (
            !isset($image["size"]) ||
            !is_int($image["size"]) ||
            $image["size"] <= 0 ||
            $image["size"] > $maxSize
        ) {
            Response::send(
                false,
                "Image must be 5 MB or less",
                null,
                422
            );
        }

        // Check uploaded temporary file
        if (
            !isset($image["tmp_name"]) ||
            !is_string($image["tmp_name"]) ||
            !is_uploaded_file($image["tmp_name"])
        ) {
            Response::send(
                false,
                "Invalid uploaded file",
                null,
                400
            );
        }

        // Detect actual image MIME type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($image["tmp_name"]);

        $allowedTypes = [
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp"
        ];

        // Check image dimensions and format
        $imageInfo = @getimagesize($image["tmp_name"]);

        if (
            $mimeType === false ||
            !isset($allowedTypes[$mimeType]) ||
            $imageInfo === false ||
            ($imageInfo["mime"] ?? null) !== $mimeType
        ) {
            Response::send(
                false,
                "Only JPG, PNG and WEBP images are allowed",
                null,
                422
            );
        }

        // Limit image dimensions
        $width = $imageInfo[0];
        $height = $imageInfo[1];

        if (
            $width <= 0 ||
            $height <= 0 ||
            $width > 5000 ||
            $height > 5000 ||
            ($width * $height) > 20000000
        ) {
            Response::send(
                false,
                "Image dimensions are too large",
                null,
                422
            );
        }

        // Get safe file extension
        $extension = $allowedTypes[$mimeType];

        // Define image upload directory
        $uploadDirectory = __DIR__ . "/../../public/uploads/products/";

        // Create upload directory if it does not exist
        if (!is_dir($uploadDirectory)) {
            if (
                !mkdir($uploadDirectory, 0755, true) &&
                !is_dir($uploadDirectory)
            ) {
                Response::send(
                    false,
                    "Failed to prepare image storage",
                    null,
                    500
                );
            }
        }

        // Generate a unique and safe filename
        try {
            $fileName = bin2hex(random_bytes(16)) . "." . $extension;

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to generate image filename",
                null,
                500
            );
        }

        // Prepare image paths
        $filePath = $uploadDirectory . $fileName;

        // Get the public URL path of this project
        $publicBasePath = str_replace(
            "\\",
            "/",
            dirname($_SERVER["SCRIPT_NAME"])
        );

        $publicBasePath = rtrim($publicBasePath, "/");

        $imageUrl = $publicBasePath .
            "/uploads/products/" . $fileName;

        // Save uploaded image on the server
        if (!move_uploaded_file($image["tmp_name"], $filePath)) {
            Response::send(
                false,
                "Failed to save uploaded image",
                null,
                500
            );
        }

        // Save image information in database
        try {
            $imageId = $this->imageRepository->addImage(
                $productId,
                $imageUrl
            );

            Response::send(
                true,
                "Image uploaded successfully",
                [
                    "id" => $imageId,
                    "product_id" => $productId,
                    "image_url" => $imageUrl
                ],
                201
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            // Remove uploaded file if database insertion fails
            if (is_file($filePath) && !@unlink($filePath)) {
                error_log("Failed to remove uploaded file: " . $fileName);
            }

            Response::send(
                false,
                "Failed to save image information",
                null,
                500
            );
        }
    }

    public function index(int $productId): void
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

            // Get all images for this product
            $images = $this->imageRepository->getByProductId($productId);

            Response::send(
                true,
                "Product images retrieved successfully",
                $images,
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to retrieve product images",
                null,
                500
            );
        }
    }

    public function destroy(int $productId, int $imageId): void
    {
        // Check if IDs are valid
        if ($productId <= 0 || $imageId <= 0) {
            Response::send(
                false,
                "Invalid product or image ID",
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

            // Check if image belongs to the product
            $image = $this->imageRepository->getById(
                $imageId,
                $productId
            );

            if (!$image) {
                Response::send(
                    false,
                    "Image not found",
                    null,
                    404
                );
            }

            // Prepare the local file path
            $fileName = basename($image["image_url"]);

            // Check if filename follows our upload format
            $isLocalImage = preg_match(
                '/^[a-f0-9]{32}\.(jpg|png|webp)$/',
                $fileName
            ) === 1;

            $expectedDirectory = __DIR__ .
                "/../../public/uploads/products/";

            $expectedUrlPath = "/uploads/products/" . $fileName;

            $isStoredImage = is_string($image["image_url"]) &&
                str_ends_with(
                    $image["image_url"],
                    $expectedUrlPath
                );

            if (!$isLocalImage || !$isStoredImage) {
                Response::send(
                    false,
                    "Image file path is not valid",
                    null,
                    422
                );
            }

            $filePath = $expectedDirectory . $fileName;

            // Delete image record from database
            $deleted = $this->imageRepository->deleteImage(
                $imageId,
                $productId
            );

            if (!$deleted) {
                Response::send(
                    false,
                    "Image not found or already deleted",
                    null,
                    404
                );
            }

            // Delete the image file from the server
            if (
                is_file($filePath) &&
                !is_link($filePath) &&
                !@unlink($filePath)
            ) {
                error_log("Failed to remove product image file: " . $fileName);
            }

            Response::send(
                true,
                "Product image deleted successfully",
                null,
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to delete product image",
                null,
                500
            );
        }
    }

    public function setPrimary(int $productId, int $imageId): void
    {
        // Check if IDs are valid
        if ($productId <= 0 || $imageId <= 0) {
            Response::send(
                false,
                "Invalid product or image ID",
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

            // Set selected image as primary
            $updated = $this->imageRepository->setPrimaryImage(
                $imageId,
                $productId
            );

            if (!$updated) {
                Response::send(
                    false,
                    "Image not found for this product",
                    null,
                    404
                );
            }

            Response::send(
                true,
                "Primary image updated successfully",
                [
                    "product_id" => $productId,
                    "image_id" => $imageId
                ],
                200
            );

        } catch (Throwable $e) {

            error_log($e->getMessage());

            Response::send(
                false,
                "Failed to update primary image",
                null,
                500
            );
        }
    }
}