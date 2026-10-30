<?php



declare(strict_types=1);
require_once __DIR__ . '/../../Models/Category.php';

final class CategoryController
{
    private Category $categories;

    public function __construct(Database $database)
    {
        $this->categories = new Category(
            $database->getConnection()
        );
    }

    private function readJsonBody(): array
    {
        $body = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($body)) {
            Response::send(
                false,
                'Invalid JSON request body.',
                null,
                400
            );
        }

        return $body;
    }

    private function parseId(string $id): int
    {
        if (!ctype_digit($id) || (int) $id < 1) {
            Response::send(
                false,
                'Invalid category ID.',
                null,
                422
            );
        }

        return (int) $id;
    }

    private function validateData(array $body): array
    {
        $name = $body['name'] ?? null;
        $description = $body['description'] ?? null;
        $image = $body['image'] ?? null;
        $active = $body['is_active'] ?? 1;

        if (!is_string($name) || trim($name) === '') {
            Response::send(
                false,
                'Category name is required.',
                null,
                422
            );
        }

        $name = trim($name);

        if (mb_strlen($name) > 100) {
            Response::send(
                false,
                'Category name is too long.',
                null,
                422
            );
        }

        if (
            $description !== null
            && !is_string($description)
        ) {
            Response::send(
                false,
                'Description must be a string.',
                null,
                422
            );
        }

        if ($description !== null) {
            $description = trim($description);
        }

        if ($image !== null) {
            if (
                !is_string($image)
                || strlen($image) > 255
            ) {
                Response::send(
                    false,
                    'Invalid image value.',
                    null,
                    422
                );
            }

            $image = trim($image);

            if ($image === '') {
                $image = null;
            }
        }

        if (
            !in_array($active, [0, 1, '0', '1'], true)
        ) {
            Response::send(
                false,
                'is_active must be 0 or 1.',
                null,
                422
            );
        }

        return [
            'name' => $name,
            'description' => $description,
            'image' => $image,
            'is_active' => (int) $active,
        ];
    }

    public function index(): void
    {
        $search = isset($_GET['search'])
            ? trim((string) $_GET['search'])
            : null;

        $status = $_GET['status'] ?? null;

        if (
            $status !== null
            && !in_array(
                $status,
                ['active', 'inactive'],
                true
            )
        ) {
            $status = null;
        }

        Response::success(
            'Categories retrieved successfully.',
            $this->categories->getAll($search, $status)
        );
    }

    public function show(string $id): void
    {
        $category = $this->categories->findById(
            $this->parseId($id)
        );

        if ($category === false) {
            Response::send(
                false,
                'Category not found.',
                null,
                404
            );
        }

        Response::success(
            'Category retrieved successfully.',
            $category
        );
    }

    public function store(): void
    {
        $data = $this->validateData(
            $this->readJsonBody()
        );

        if (
            $this->categories->findByName(
                $data['name']
            ) !== false
        ) {
            Response::send(
                false,
                'Category name already exists.',
                null,
                409
            );
        }

        $id = $this->categories->create($data);

        Response::success(
            'Category created successfully.',
            $this->categories->findById($id),
            201
        );
    }

    public function update(string $id): void
    {
        $categoryId = $this->parseId($id);

        if (
            $this->categories->findById($categoryId)
            === false
        ) {
            Response::send(
                false,
                'Category not found.',
                null,
                404
            );
        }

        $data = $this->validateData(
            $this->readJsonBody()
        );

        $existing = $this->categories->findByName(
            $data['name']
        );

        if (
            $existing !== false
            && (int) $existing['id'] !== $categoryId
        ) {
            Response::send(
                false,
                'Category name already exists.',
                null,
                409
            );
        }

        $this->categories->update(
            $categoryId,
            $data
        );

        Response::success(
            'Category updated successfully.',
            $this->categories->findById($categoryId)
        );
    }

    public function patch(string $id): void
    {
        $categoryId = $this->parseId($id);

        $category = $this->categories->findById(
            $categoryId
        );

        if ($category === false) {
            Response::send(
                false,
                'Category not found.',
                null,
                404
            );
        }

        $body = $this->readJsonBody();

        if ($body === []) {
            Response::send(
                false,
                'At least one field is required.',
                null,
                422
            );
        }

        $merged = array_replace(
            [
                'name' => $category['name'],
                'description' => $category['description'],
                'image' => $category['image'],
                'is_active' => (int) $category['is_active'],
            ],
            $body
        );

        $data = $this->validateData($merged);

        $existing = $this->categories->findByName(
            $data['name']
        );

        if (
            $existing !== false
            && (int) $existing['id'] !== $categoryId
        ) {
            Response::send(
                false,
                'Category name already exists.',
                null,
                409
            );
        }

        $this->categories->update(
            $categoryId,
            $data
        );

        Response::success(
            'Category partially updated successfully.',
            $this->categories->findById($categoryId)
        );
    }

    public function destroy(string $id): void
    {
        $categoryId = $this->parseId($id);

        if (
            $this->categories->findById($categoryId)
            === false
        ) {
            Response::send(
                false,
                'Category not found.',
                null,
                404
            );
        }

        if ($this->categories->hasProducts($categoryId)) {
            Response::send(
                false,
                'Cannot delete a category that still has products.',
                null,
                409
            );
        }

        $this->categories->delete($categoryId);

        Response::success(
            'Category deleted successfully.'
        );
    }
}