<?php

declare(strict_types=1);

final class ProfileController
{
    private UserRepository $users;

    public function __construct(private PDO $db)
    {
        $this->users = new UserRepository($db);
    }

    private function id(): int
    {
        $id = (int) ($_SESSION['user']['id'] ?? 0);
        if ($id < 1) Response::send(false, 'Please log in.', null, 401);
        return $id;
    }

    public function show(): void
    {
        $user = $this->users->findById($this->id());
        if (!$user) Response::send(false, 'Account not found.', null, 404);
        Response::success('Your profile.', ['user' => $user]);
    }

    public function update(): void
    {
        $id = $this->id();
        $raw = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($raw)) Response::send(false, 'JSON request required.', null, 422);
        $name = trim((string) ($raw['name'] ?? ''));
        $email = strtolower(trim((string) ($raw['email'] ?? '')));
        $phone = trim((string) ($raw['phone'] ?? ''));
        $address = trim((string) ($raw['address'] ?? ''));
        if ($name === '' || strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150 || strlen($phone) > 20 || strlen($address) > 1000) {
            Response::send(false, 'Please enter valid account information.', null, 422);
        }
        // Require password verification to prevent account-email takeover.
        $current = $this->users->findByEmail((string) ($_SESSION['user']['email'] ?? ''));
        if (!$current || (int)$current['id'] !== $id) Response::send(false, 'Account not found.', null, 404);
        if ($email !== strtolower((string) $current['email'])) {
            $password = (string)($raw['current_password'] ?? '');
            if (!password_verify($password, (string)$current['password_hash'])) {
                Response::send(false, 'Current password required to change email.', null, 403);
            }
        }
        try {
            $stmt = $this->db->prepare('UPDATE users SET name=?,email=?,phone=?,address=? WHERE id=? AND deleted_at IS NULL');
            $stmt->execute([$name,$email,$phone ?: null,$address ?: null,$id]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') Response::send(false, 'Email is already in use.', null, 409);
            throw $e;
        }
        $_SESSION['user']['name'] = $name;
        $_SESSION['user']['email'] = $email;
        $this->show();
    }

    public function password(): void
    {
        $id = $this->id();
        $raw = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($raw)) Response::send(false, 'JSON request required.', null, 422);
        $old = (string)($raw['current_password'] ?? '');
        $new = (string)($raw['new_password'] ?? '');
        if (strlen($new) < 8 || strlen($new) > 200) Response::send(false, 'Use a password of at least 8 characters.', null, 422);
        $stmt = $this->db->prepare('SELECT password_hash FROM users WHERE id=? AND deleted_at IS NULL');
        $stmt->execute([$id]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($old, (string)$hash)) Response::send(false, 'Current password is incorrect.', null, 403);
        $this->users->updatePassword($id, password_hash($new, PASSWORD_DEFAULT));
        session_regenerate_id(true);
        Response::success('Password updated.');
    }
}
