<?php

/**
 * AuthController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles user registration, login, and logout.
 *
 * Login opens a server-side session (user_sessions) and returns a JWT tied to
 * it. Logout revokes that session, so the token stops working at once instead
 * of staying valid until it expires.
 *
 * Endpoints (defined in routes/api.php):
 *   POST /api/auth/register  → register()
 *   POST /api/auth/login     → login()
 *   POST /api/auth/logout    → logout()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/SessionModel.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class AuthController {

    private UserModel    $userModel;
    private SessionModel $sessionModel;

    public function __construct() {
        $this->userModel    = new UserModel();
        $this->sessionModel = new SessionModel();
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

        // TODO (API - Email): Send a "registration received, pending approval" email here.

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

        // ── Look up the user ──────────────────────────────────────────────────
        $user = $this->userModel->findByEmail(strtolower(sanitizeString($body['email'])));

        // One message for both cases, so the response never reveals whether an email is registered.
        if ($user === null || !verifyPassword((string) $body['password'], $user['password_hash'])) {
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
            (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
            (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')
        );

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
}
