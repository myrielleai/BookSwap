<?php

/**
 * AuthController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles user registration, login (password or Google), and logout.
 *
 * Login opens a server-side session (user_sessions) and returns a JWT tied to
 * it. Logout revokes that session, so the token stops working at once instead
 * of staying valid until it expires.
 *
 * Endpoints (defined in routes/api.php):
 *   POST /api/auth/register  → register()
 *   POST /api/auth/login     → login()
 *   POST /api/auth/logout    → logout()
 *   POST /api/auth/google    → google()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/SessionModel.php';
require_once __DIR__ . '/../models/LoginAttemptModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/google_auth.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/email.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../config/database.php';

class AuthController {

    private UserModel         $userModel;
    private SessionModel      $sessionModel;
    private LoginAttemptModel $loginAttemptModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;

    public function __construct() {
        $this->userModel         = new UserModel();
        $this->sessionModel      = new SessionModel();
        $this->loginAttemptModel = new LoginAttemptModel();
        $this->notificationModel = new NotificationModel();
        $this->reportModel       = new ReportModel();
    }

    /**
     * POST /api/auth/register
     *
     * Accepts: { name, email, password, confirm_password, phone?, city? }
     * Creates a Customer account with status 'pending'. An Administrator must
     * approve it before the member can log in (Phase 1 §3.3.1).
     */
    public function register(): void {
        $body = getRequestBody();

        // ── Validate inputs ───────────────────────────────────────────────────
        $errors = [];
        validateRequired(['name', 'email', 'password', 'confirm_password'], $body, $errors);

        $name  = sanitizeString($body['name'] ?? '');
        $email = strtolower(sanitizeString($body['email'] ?? ''));
        $phone = sanitizeString($body['phone'] ?? '');
        $city  = sanitizeString($body['city'] ?? '');

        if (empty($errors)) {
            validateEmail($email, $errors);
            validateMaxLength('email', $email, 255, $errors);
            validateMaxLength('name', $name, 100, $errors);
            validatePassword((string) $body['password'], $errors);
            validatePasswordMatch((string) $body['password'], (string) $body['confirm_password'], $errors);
            if ($name === '') {
                $errors['name'] = 'name is required.';
            }
        }
        validatePhone('phone', $phone, $errors);
        validateMaxLength('city', $city, 100, $errors);

        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        // ── Check for duplicate email ─────────────────────────────────────────
        if ($this->userModel->findByEmail($email) !== null) {
            sendError('An account with that email address already exists.', 409);
        }

        // ── Create the user ───────────────────────────────────────────────────
        $newUserId = $this->userModel->create([
            'name'          => $name,
            'email'         => $email,
            'phone'         => $phone,
            'password_hash' => hashPassword((string) $body['password']),
            'city'          => $city,
        ]);

        // Send a "registration received, pending approval" email.
        sendEmail_registrationPending($email, $name);

        sendSuccess(
            ['user_id' => $newUserId],
            'Registration successful. Your account is pending Administrator approval.',
            201
        );
    }

    /**
     * POST /api/auth/login
     *
     * Accepts: { email, password }
     * Opens a session and returns a signed JWT. Rejects accounts that are not active.
     */
    public function login(): void {
        $body = getRequestBody();

        // ── Validate inputs ───────────────────────────────────────────────────
        $errors = [];
        validateRequired(['email', 'password'], $body, $errors);
        if (!empty($errors)) {
            sendError('Email and password are required.', 422, $errors);
        }

        if (!jwtSecretConfigured()) {
            sendError('Sign-in is unavailable: the server has no JWT secret configured.', 500);
        }

        $email     = strtolower(sanitizeString($body['email']));
        $ipAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

        // ── Throttle repeated failures ────────────────────────────────────────
        // Checked before the password, so guessing stops working even when a
        // guess happens to be right.
        $retryAfter = $this->loginAttemptModel->secondsUntilAllowed($email, $ipAddress);
        if ($retryAfter > 0) {
            header('Retry-After: ' . $retryAfter);
            sendError('Too many failed sign-in attempts. Please try again in ' . (int) ceil($retryAfter / 60) . ' minute(s).', 429);
        }

        // ── Look up the user ──────────────────────────────────────────────────
        $user = $this->userModel->findByEmail($email);

        // One message for both cases, so the response never reveals whether an email is registered.
        if ($user === null || !verifyPassword((string) $body['password'], $user['password_hash'])) {
            $this->loginAttemptModel->record($email, $ipAddress, false);
            sendError('Invalid email or password.', 401);
        }

        // ── Check account status ──────────────────────────────────────────────
        if ($user['status'] === ACCOUNT_PENDING) {
            sendError('Your account is pending Administrator approval. Please check back later.', 403);
        }

        if ($user['status'] !== ACCOUNT_ACTIVE) {
            sendError('Your account has been deactivated. Please contact support.', 403);
        }

        // ── Open a session and issue the JWT ──────────────────────────────────
        $tokenId   = newTokenId();
        $expiresAt = time() + JWT_EXPIRY_SECS;

        $this->sessionModel->create(
            (int) $user['id'],
            $tokenId,
            $expiresAt,
            $ipAddress,
            (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')
        );
        $this->loginAttemptModel->record($email, $ipAddress, true);

        $token = generateJWT((int) $user['id'], $user['role'], $tokenId, $expiresAt);

        sendSuccess([
            'token'      => $token,
            'expires_at' => date(DATE_ATOM, $expiresAt),
            'user'       => [
                'id'   => (int) $user['id'],
                'name' => $user['name'],
                'role' => $user['role'],
            ],
        ], 'Login successful.');
    }

    /**
     * POST /api/auth/logout
     *
     * Revokes the current session on the server. The same token is rejected
     * from this point on, even though it has not expired.
     */
    public function logout(): void {
        $authUser = requireAuth();

        $this->sessionModel->revoke($authUser['jti']);

        sendSuccess(null, 'Logged out. This session has been ended on the server.');
    }

    // ── Google Sign-in ────────────────────────────────────────────────────────

    /**
     * POST /api/auth/google
     *
     * Accepts: { credential } — the ID token from Google Identity Services.
     *
     *   Google account already linked      → sign in
     *   Email matches an unlinked account  → link it, then sign in
     *   New email                          → create a pending account (201); an Administrator approves it
     */
    public function google(): void {
        if (GOOGLE_CLIENT_ID === '') {
            sendError('Google sign-in is not configured on this server.', 503);
        }
        if (!jwtSecretConfigured()) {
            sendError('Sign-in is unavailable: the server has no JWT secret configured.', 500);
        }

        $body       = getRequestBody();
        $credential = $body['credential'] ?? null;
        if (!is_string($credential) || $credential === '' || strlen($credential) > 4096) {
            sendError('Validation failed.', 422, ['credential' => 'credential is required.']);
        }

        $google = verifyGoogleIdToken($credential);
        if ($google === null) {
            sendError('Google sign-in failed: the credential is invalid or has expired.', 401);
        }

        $user = $this->userModel->findByGoogleId($google['sub']);

        if ($user === null) {
            $existing = $this->userModel->findByEmail($google['email']);

            if ($existing === null) {
                $this->registerFromGoogle($google);
                return;
            }
            if ($existing['google_sub'] !== null) {
                sendError('This email address is already linked to a different Google account.', 409);
            }

            $this->userModel->linkGoogle((int) $existing['id'], $google['sub']);
            $this->reportModel->logActivity((int) $existing['id'], 'user', (int) $existing['id'], 'google_linked', '');
            $user = $this->userModel->findByEmail($google['email']);
        }

        if ($user['status'] === ACCOUNT_PENDING) {
            sendError('Your account is pending Administrator approval. Please check back later.', 403);
        }
        if ($user['status'] !== ACCOUNT_ACTIVE) {
            sendError('Your account has been deactivated. Please contact support.', 403);
        }

        $ipAddress = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $tokenId   = newTokenId();
        $expiresAt = time() + JWT_EXPIRY_SECS;

        $this->sessionModel->create(
            (int) $user['id'],
            $tokenId,
            $expiresAt,
            $ipAddress,
            (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')
        );

        $token = generateJWT((int) $user['id'], $user['role'], $tokenId, $expiresAt);

        sendSuccess([
            'token'      => $token,
            'expires_at' => date(DATE_ATOM, $expiresAt),
            'provider'   => 'google',
            'user'       => [
                'id'   => (int) $user['id'],
                'name' => $user['name'],
                'role' => $user['role'],
            ],
        ], 'Login successful.');
    }

    /**
     * Create a pending account from a verified Google identity and tell the
     * Administrators. Sends the 201 response.
     *
     * @param array $google verifyGoogleIdToken() output.
     */
    private function registerFromGoogle(array $google): void {
        $name = mb_substr(sanitizeString($google['name']), 0, 100);
        if ($name === '') {
            $name = mb_substr(strstr($google['email'], '@', true), 0, 100);
        }

        $userId = withTransaction(function () use ($google, $name) {
            $userId = $this->userModel->createFromGoogle(
                $name,
                $google['email'],
                $google['sub'],
                hashPassword(bin2hex(random_bytes(32)))
            );
            $this->reportModel->logActivity($userId, 'user', $userId, 'registered_with_google', '');
            return $userId;
        });

        $this->notificationModel->notifyMany(
            $this->userModel->getActiveIdsByRole(ROLE_ADMIN),
            'account_pending_review',
            "$name ({$google['email']}) signed up with Google and is waiting for approval.",
            'user',
            $userId
        );

        sendSuccess(
            ['user_id' => $userId, 'status' => ACCOUNT_PENDING],
            'Google account registered. Your account is pending Administrator approval.',
            201
        );
    }
}
