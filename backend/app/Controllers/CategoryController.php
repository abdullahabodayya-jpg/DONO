<?php

declare(strict_types=1);

/** Category management matching DONO's actual categories schema. */
final class CategoryController
{
    public function __construct(private PDO $db) {}

    public function index(): void
    {
        (new AdminMiddleware())->handle();
        $stmt = $this->db->query('SELECT c.id,c.name,c.description,c.image,COUNT(p.id) AS products_count FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.deleted_at IS NULL WHERE c.deleted_at IS NULL GROUP BY c.id,c.name,c.description,c.image ORDER BY c.id DESC');
        Response::success('Categories loaded.', $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function store(): void
    {
        (new AdminMiddleware())->handle();
        $data = $this->validate();
        $stmt = $this->db->prepare('INSERT INTO categories (name,description,image) VALUES (?,?,?)');
        $stmt->execute([$data['name'],$data['description'],$data['image']]);
        Response::success('Category created.', ['id'=>(int)$this->db->lastInsertId()], 201);
    }

    public function update(string $id): void
    {
        (new AdminMiddleware())->handle();
        $this->validateId($id);
        $data = $this->validate();
        $stmt = $this->db->prepare('UPDATE categories SET name=?,description=?,image=? WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$data['name'],$data['description'],$data['image'],(int)$id]);
        if ($stmt->rowCount() === 0) {
            $exists = $this->db->prepare('SELECT 1 FROM categories WHERE id=? AND deleted_at IS NULL');
            $exists->execute([(int)$id]);
            if (!$exists->fetchColumn()) Response::send(false, 'Category not found.', null, 404);
        }
        Response::success('Category updated.');
    }

    public function destroy(string $id): void
    {
        (new AdminMiddleware())->handle();
        $this->validateId($id);
        $linked = $this->db->prepare('SELECT COUNT(*) FROM products WHERE category_id=? AND deleted_at IS NULL');
        $linked->execute([(int)$id]);
        if ((int)$linked->fetchColumn()>0) Response::send(false, 'Category has products. Reassign them before deleting.', null, 409);
        $stmt = $this->db->prepare('UPDATE categories SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([(int)$id]);
        if (!$stmt->rowCount()) Response::send(false, 'Category not found.', null, 404);
        Response::success('Category deleted.');
    }

    private function validateId(string $id): void
    {
        if (!ctype_digit($id) || (int)$id<1) Response::send(false, 'Invalid category ID.', null, 422);
    }

    private function validate(): array
    {
        $body = json_decode((string)file_get_contents('php://input'),true);
        if (!is_array($body)) Response::send(false, 'JSON body required.', null, 422);
        $name = $body['name'] ?? null;
        if (!is_string($name) || trim($name)==='' || (function_exists('mb_strlen') ? mb_strlen(trim($name)) : strlen(trim($name)))>100) Response::send(false,'Category name is required (max 100 characters).',null,422);
        $description=$body['description']??null;
        $image=$body['image']??null;
        if ($description!==null && !is_string($description)) Response::send(false,'Invalid description.',null,422);
        if ($image!==null && (!is_string($image) || strlen($image)>255)) Response::send(false,'Invalid image URL.',null,422);
        return ['name'=>trim($name),'description'=>$description!==null?trim($description):null,'image'=>$image!==null?trim($image):null];
    }
}
