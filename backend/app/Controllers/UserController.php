<?php

declare(strict_types=1);

class UserController
{
    private UserRepository $userRepository;

    public function __construct(PDO $db)
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
            Response::send(false, 'Unauthorized. Admin access required.', null, 403);
        }

        $this->userRepository = new UserRepository($db);
    }

    public function index(): void
    {
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;

        $users = $this->userRepository->getAll($limit, $offset);
        $totalUsers = $this->userRepository->countAll();

        Response::success('Users retrieved successfully.', [
            'users' => $users,
            'pagination' => [
                'currentPage' => $page,
                'perPage'     => $limit,
                'totalUsers'  => $totalUsers,
                'totalPages'  => ceil($totalUsers / $limit)
            ]
        ]);
    }

    public function show(int $id): void
    {
        $user = $this->userRepository->findById($id);

        if (!$user) {
            Response::send(false, 'User not found.', null, 404);
        }

        Response::success('User retrieved successfully.', ['user' => $user]);
    }

    public function update(int $id): void
    {
        $user = $this->userRepository->findById($id);

        if (!$user) {
            Response::send(false, 'User not found.', null, 404);
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $name    = trim($input['name'] ?? $user['name']);
        $phone   = trim($input['phone'] ?? $user['phone']);
        $gender  = $input['gender'] ?? $user['gender'];
        $address = trim($input['address'] ?? $user['address']);
        $role    = $input['role'] ?? $user['role'];

        $errors = [];

        if (empty($name) || strlen($name) > 100) {
            $errors['name'] = 'Valid name is required.';
        }

        if (!empty($gender) && !in_array($gender, ['male', 'female'], true)) {
            $errors['gender'] = 'Invalid gender value.';
        }

        if (!in_array($role, ['customer', 'admin'], true)) {
            $errors['role'] = 'Invalid role specified.';
        }

        if (!empty($errors)) {
            Response::send(false, 'Validation failed.', ['errors' => $errors], 422);
        }

        $updated = $this->userRepository->update($id, [
            'name'    => $name,
            'phone'   => $phone,
            'gender'  => $gender,
            'address' => $address,
            'role'    => $role
        ]);

        if (!$updated) {
            Response::send(false, 'Failed to update user.', null, 500);
        }

        Response::success('User updated successfully.', [
            'user' => $this->userRepository->findById($id)
        ]);
    }

    public function destroy(int $id): void
    {
        $user = $this->userRepository->findById($id);

        if (!$user) {
            Response::send(false, 'User not found.', null, 404);
        }

        if ($id === (int) $_SESSION['user']['id']) {
            Response::send(false, 'You cannot delete your own account.', null, 400);
        }

        $deleted = $this->userRepository->delete($id);

        if (!$deleted) {
            Response::send(false, 'Failed to delete user.', null, 500);
        }

        Response::success('User deleted successfully.');
    }

    public function restore(int $id): void
    {
        $restored = $this->userRepository->restore($id);

        if (!$restored) {
            Response::send(false, 'Failed to restore user or user not found.', null, 400);
        }

        Response::success('User restored successfully.');
    }
}