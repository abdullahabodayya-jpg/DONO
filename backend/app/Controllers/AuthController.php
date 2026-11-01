<?php

declare(strict_types=1);

// Response is the existing global project class.

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

        try {
        $userId = $this->userRepository->create([
            'name'          => $name,
            'email'         => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'phone'         => !empty($phone) ? $phone : null,
            'gender'        => !empty($gender) ? $gender : null,
            'address'       => !empty($address) ? $address : null,
            'role'          => 'customer'
        ]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                Response::send(false, 'This email is already registered.', ['errors'=>['email'=>'Email already exists.']], 409);
            }
            throw $e;
        }

        if (!$userId) {
            Response::send(false, 'Registration failed.', null, 500);
        }

        session_regenerate_id(true);
        $_SESSION['user'] = ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'customer'];
        Response::success('Registration successful.', ['userId' => $userId, 'user' => $_SESSION['user']], 201);
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

    /**
     * Resolve the callback from the actual Apache application path on localhost.
     * This prevents stale /dono and /DONO URLs from breaking OAuth when the
     * repository lives inside a longer XAMPP folder name.
     * For hosted deployments, explicitly configure google.redirect_uri.
     */
    private function googleRedirectUri(): string
    {
        $configured = trim((string) ($this->config['google']['redirect_uri'] ?? ''));
        $host = (string) ($_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '');
        $localHost = preg_match('/^(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$/i', $host) === 1;

        if (!$localHost) {
            if (!filter_var($configured, FILTER_VALIDATE_URL)
                || !in_array(strtolower((string) parse_url($configured, PHP_URL_SCHEME)), ['http', 'https'], true)) {
                Response::send(false, 'Google redirect URI is not configured for this host.', null, 503);
            }
            return $configured;
        }

        $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
        if (!str_ends_with($script, '/backend/public/index.php')) {
            Response::send(false, 'Could not determine the Google callback path.', null, 503);
        }
        $projectPath = substr($script, 0, -strlen('/backend/public/index.php'));
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        return $scheme . '://' . $host . $projectPath . '/frontend/google-callback.html';
    }

    public function getGoogleAuthUrl(): void
    {
        if (empty($this->config['google']['client_id']) || empty($this->config['google']['client_secret'])) {
            Response::send(false, 'Google Sign-In is not configured.', null, 503);
        }

        // OAuth CSRF protection: bind the Google return to this browser session.
        $state = bin2hex(random_bytes(32));
        $_SESSION['dono_google_oauth'] = ['state' => $state, 'created_at' => time()];
        $params = [
            'client_id' => $this->config['google']['client_id'],
            'redirect_uri' => $this->googleRedirectUri(),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'access_type' => 'online',
            'prompt' => 'select_account',
            'state' => $state,
        ];
        Response::success('Google auth URL generated.', [
            'url' => 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params, '', '&', PHP_QUERY_RFC3986),
        ]);
    }

    public function handleGoogleCallback(): void
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        if (!is_array($input)) {
            Response::send(false, 'Invalid Google callback data.', null, 400);
        }

        $state = $input['state'] ?? null;
        $pending = $_SESSION['dono_google_oauth'] ?? null;
        unset($_SESSION['dono_google_oauth']); // Single-use state, even on failure.
        if (!is_string($state) || !is_array($pending)
            || !isset($pending['state'], $pending['created_at'])
            || !is_string($pending['state'])
            || !hash_equals($pending['state'], $state)
            || abs(time() - (int) $pending['created_at']) > 600) {
            Response::send(false, 'Google login session expired or invalid. Please try again.', null, 400);
        }

        $code = $input['code'] ?? null;
        if (!is_string($code) || $code === '') {
            Response::send(false, 'Authorization code is missing.', null, 400);
        }
        if (empty($this->config['google']['client_id']) || empty($this->config['google']['client_secret'])) {
            Response::send(false, 'Google Sign-In is not configured.', null, 503);
        }
        if (!function_exists('curl_init')) {
            Response::send(false, 'PHP cURL extension is required for Google Sign-In.', null, 503);
        }

        $postData = [
            'code' => $code,
            'client_id' => $this->config['google']['client_id'],
            'client_secret' => $this->config['google']['client_secret'],
            'redirect_uri' => $this->googleRedirectUri(),
            'grant_type' => 'authorization_code',
        ];
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($postData, '', '&', PHP_QUERY_RFC3986),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
        ]);
        $tokenResponse = curl_exec($ch);
        $tokenStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $tokenData = is_string($tokenResponse) ? json_decode($tokenResponse, true) : null;
        if ($tokenStatus !== 200 || !is_array($tokenData) || empty($tokenData['access_token'])) {
            error_log('DONO Google OAuth token exchange failed (HTTP ' . $tokenStatus . ').');
            Response::send(false, 'Google authorization could not be completed. Please try again.', null, 401);
        }

        $ch = curl_init('https://www.googleapis.com/oauth2/v3/userinfo');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $tokenData['access_token']],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
        ]);
        $userResponse = curl_exec($ch);
        $userStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $googleUser = is_string($userResponse) ? json_decode($userResponse, true) : null;
        if ($userStatus !== 200 || !is_array($googleUser)
            || ($googleUser['email_verified'] ?? false) !== true
            || !filter_var($googleUser['email'] ?? null, FILTER_VALIDATE_EMAIL)) {
            error_log('DONO Google OAuth userinfo failed or email was not verified (HTTP ' . $userStatus . ').');
            Response::send(false, 'Google did not return a verified email address.', null, 401);
        }

        $email = strtolower(trim((string) $googleUser['email']));
        $name = trim((string) ($googleUser['name'] ?? 'Google User'));
        $name = $name !== '' ? $name : 'Google User';
        $name = function_exists('mb_substr') ? mb_substr($name, 0, 100) : substr($name, 0, 100);
        $existingUser = $this->userRepository->findByEmail($email);

        if ($existingUser) {
            if (empty($existingUser['phone']) || empty($existingUser['gender']) || empty($existingUser['address'])) {
                $_SESSION['temp_google_user'] = [
                    'id' => $existingUser['id'],
                    'name' => $existingUser['name'],
                    'email' => $existingUser['email'],
                ];
                Response::success('Profile completion required.', ['requiresProfileCompletion' => true]);
            }
            session_regenerate_id(true);
            unset($_SESSION['temp_google_user']);
            $_SESSION['user'] = [
                'id' => $existingUser['id'],
                'name' => $existingUser['name'],
                'email' => $existingUser['email'],
                'role' => $existingUser['role'],
            ];
            Response::success('Login successful.', [
                'requiresProfileCompletion' => false,
                'user' => $_SESSION['user'],
            ]);
        }

        $_SESSION['temp_google_user'] = ['name' => $name, 'email' => $email];
        Response::success('Profile completion required.', ['requiresProfileCompletion' => true]);
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
                $phone,
                $gender,
                $address
            );
            $existing = $this->userRepository->findById($userId);
            $role = $existing['role'] ?? 'customer';
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
