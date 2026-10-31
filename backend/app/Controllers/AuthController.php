<?php

declare(strict_types=1);

use App\Core\Response;

class AuthController
{
    private UserRepository $userRepository;
    private array $config;

    public function __construct(PDO $db, array $config)
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $this->userRepository = new UserRepository($db);
        $this->config = $config;
    }

    public function register(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $name            = trim($input['name'] ?? '');
        $email           = trim($input['email'] ?? '');
        $password        = $input['password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';
        $phone           = trim($input['phone'] ?? '');
        $gender          = $input['gender'] ?? '';
        $address         = trim($input['address'] ?? '');

        $errors = [];

        if (empty($name) || strlen($name) > 100) {
            $errors['name'] = 'Full name is required.';
        }

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Valid email is required.';
        } elseif ($this->userRepository->findByEmail($email)) {
            $errors['email'] = 'This email is already registered.';
        }

        if (strlen($password) < 6) {
            $errors['password'] = 'Password must be at least 6 characters.';
        } elseif ($password !== $confirmPassword) {
            $errors['confirm_password'] = 'Passwords do not match.';
        }

        if (!empty($gender) && !in_array($gender, ['male', 'female'], true)) {
            $errors['gender'] = 'Invalid gender.';
        }

        if (!empty($errors)) {
            Response::send(false, 'Validation failed.', ['errors' => $errors], 422);
        }

        $userId = $this->userRepository->create([
            'name'          => $name,
            'email'         => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'phone'         => !empty($phone) ? $phone : null,
            'gender'        => !empty($gender) ? $gender : null,
            'address'       => !empty($address) ? $address : null,
            'role'          => 'customer'
        ]);

        if (!$userId) {
            Response::send(false, 'Registration failed.', null, 500);
        }

        Response::success('Registration successful.', ['userId' => $userId], 201);
    }

    public function login(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if (empty($email) || empty($password)) {
            Response::send(false, 'Email and password are required.', null, 422);
        }

        $user = $this->userRepository->findByEmail($email);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::send(false, 'Invalid email or password.', null, 401);
        }

        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role']
        ];

        Response::success('Login successful.', [
            'user' => $_SESSION['user']
        ]);
    }

    public function getGoogleAuthUrl(): void
    {
        $params = [
            'client_id'     => $this->config['google']['client_id'],
            'redirect_uri'  => $this->config['google']['redirect_uri'],
            'response_type' => 'code',
            'scope'         => 'email profile',
            'access_type'   => 'online',
            'prompt'        => 'select_account'
        ];

        $authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
        Response::success('Google auth URL generated.', ['url' => $authUrl]);
    }

    public function handleGoogleCallback(): void
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $code  = $input['code'] ?? '';

        if (empty($code)) {
            Response::send(false, 'Authorization code is missing.', null, 400);
        }

        $postData = [
            'code'          => $code,
            'client_id'     => $this->config['google']['client_id'],
            'client_secret' => $this->config['google']['client_secret'],
            'redirect_uri'  => $this->config['google']['redirect_uri'],
            'grant_type'    => 'authorization_code'
        ];

        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $tokenResponse = curl_exec($ch);
        curl_close($ch);

        $tokenData = json_decode($tokenResponse, true);

        if (!isset($tokenData['access_token'])) {
            Response::send(false, 'Failed to authenticate with Google.', null, 401);
        }

        $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $tokenData['access_token']]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $userResponse = curl_exec($ch);
        curl_close($ch);

        $googleUser = json_decode($userResponse, true);

        if (!isset($googleUser['email'])) {
            Response::send(false, 'Could not retrieve email from Google.', null, 400);
        }

        $email = $googleUser['email'];
        $name  = $googleUser['name'] ?? 'Google User';

        $existingUser = $this->userRepository->findByEmail($email);

        if ($existingUser) {
            if (empty($existingUser['phone']) || empty($existingUser['gender']) || empty($existingUser['address'])) {
                $_SESSION['temp_google_user'] = [
                    'id'    => $existingUser['id'],
                    'name'  => $existingUser['name'],
                    'email' => $existingUser['email']
                ];

                Response::success('Profile completion required.', [
                    'requiresProfileCompletion' => true
                ]);
            }

            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id'    => $existingUser['id'],
                'name'  => $existingUser['name'],
                'email' => $existingUser['email'],
                'role'  => $existingUser['role']
            ];

            Response::success('Login successful.', [
                'requiresProfileCompletion' => false,
                'user'                      => $_SESSION['user']
            ]);
        }

        $_SESSION['temp_google_user'] = [
            'name'  => $name,
            'email' => $email
        ];

        Response::success('Profile completion required.', [
            'requiresProfileCompletion' => true
        ]);
    }

    public function completeProfile(): void
    {
        if (!isset($_SESSION['temp_google_user'])) {
            Response::send(false, 'Unauthorized or session expired.', null, 401);
        }

        $input   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $phone   = trim($input['phone'] ?? '');
        $gender  = $input['gender'] ?? '';
        $address = trim($input['address'] ?? '');

        $errors = [];

        if (empty($phone)) {
            $errors['phone'] = 'Phone number is mandatory.';
        }

        if (empty($gender) || !in_array($gender, ['male', 'female'], true)) {
            $errors['gender'] = 'Please select a valid gender.';
        }

        if (empty($address)) {
            $errors['address'] = 'Delivery address is required.';
        }

        if (!empty($errors)) {
            Response::send(false, 'Validation failed.', ['errors' => $errors], 422);
        }

        $tempUser = $_SESSION['temp_google_user'];

        if (!empty($tempUser['id'])) {
            $userId = (int) $tempUser['id'];
            $this->userRepository->updateProfileDetails(
                $userId,
                $tempUser['name'] ?? null,
                $phone,
                $gender,
                $address
            );
            $role = 'customer';
        } else {
            $randomPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
            $userId = $this->userRepository->create([
                'name'          => $tempUser['name'],
                'email'         => $tempUser['email'],
                'password_hash' => $randomPassword,
                'phone'         => $phone,
                'gender'        => $gender,
                'address'       => $address,
                'role'          => 'customer'
            ]);
            $role = 'customer';
        }

        if (!$userId) {
            Response::send(false, 'Failed to save profile.', null, 500);
        }

        session_regenerate_id(true);

        $_SESSION['user'] = [
            'id'    => $userId,
            'name'  => $tempUser['name'],
            'email' => $tempUser['email'],
            'role'  => $role
        ];

        unset($_SESSION['temp_google_user']);

        Response::success('Profile completed successfully.', [
            'user' => $_SESSION['user']
        ]);
    }

    public function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
        Response::success('Logged out successfully.');
    }
}
