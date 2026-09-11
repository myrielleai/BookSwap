<?php

/**
 * AuthController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles user registration, login, and logout.
 *
 * Endpoints (defined in routes/api.php):
 *   POST /api/auth/register  → register()
 *   POST /api/auth/login     → login()
 *   POST /api/auth/logout    → logout()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class AuthController {

    private UserModel $userModel;

    public function __construct() {
        $this->userModel = new UserModel();
    }

    /**
     * POST /api/auth/register
     *
     * Accepts: { name, email, password, confirm_password, phone?, city? }
     * Creates a new Customer account with status = 'pending'.
     * Admin must approve before the account becomes active.
     */
    public function register(): void {
        $body = getRequestBody();

        // ── Validate inputs ───────────────────────────────────────────────────
        $errors = [];
        validateRequired(['name', 'email', 'password', 'confirm_password'], $body, $errors);

        if (empty($errors)) {
            validateEmail($body['email'], $errors);
            validatePassword($body['password'], $errors);
            validatePasswordMatch($body['password'], $body['confirm_password'], $errors);
            validateMaxLength('name', $body['name'], 100, $errors);
        }

        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        // ── Check for duplicate email ─────────────────────────────────────────
        $existing = $this->userModel->findByEmail(sanitizeString($body['email']));
        if ($existing !== null) {
            sendError('An account with that email address already exists.', 409);
        }

        // ── Create the user ───────────────────────────────────────────────────
        $newUserId = $this->userModel->create([
            'name'          => sanitizeString($body['name']),
            'email'         => sanitizeString($body['email']),
            'phone'         => sanitizeString($body['phone'] ?? ''),
            'password_hash' => hashPassword($body['password']),
            'city'          => sanitizeString($body['city'] ?? ''),
        ]);

        // TODO (API - Email): Send a "registration received, pending approval" email here.
        // Example: sendRegistrationEmail($body['email'], $body['name']);

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
     * Returns a signed JWT on success.
     * Rejects if account is not in ACCOUNT_ACTIVE status.
     */
    public function login(): void {
        $body = getRequestBody();

        // ── Validate inputs ───────────────────────────────────────────────────
        $errors = [];
        validateRequired(['email', 'password'], $body, $errors);
        if (!empty($errors)) {
            sendError('Email and password are required.', 422, $errors);
        }

        // ── Look up the user ──────────────────────────────────────────────────
        $user = $this->userModel->findByEmail(sanitizeString($body['email']));

        // Use a generic message so we don't leak whether the email exists.
        if ($user === null || !verifyPassword($body['password'], $user['password_hash'] ?? '')) {
            sendError('Invalid email or password.', 401);
        }

        // ── Check account status ──────────────────────────────────────────────
        if ($user['status'] === ACCOUNT_PENDING) {
            sendError('Your account is pending Administrator approval. Please check back later.', 403);
        }

        if ($user['status'] !== ACCOUNT_ACTIVE) {
            sendError('Your account has been deactivated. Please contact support.', 403);
        }

        // ── Issue JWT ─────────────────────────────────────────────────────────
        $token = generateJWT((int) $user['id'], $user['role']);

        sendSuccess([
            'token' => $token,
            'user'  => [
                'id'   => $user['id'],
                'name' => $user['name'],
                'role' => $user['role'],
            ],
        ], 'Login successful.');
    }

    /**
     * POST /api/auth/logout
     *
     * JWT is stateless, so logout is handled client-side by discarding the token.
     * This endpoint exists as a clean API contract for the frontend.
     *
     * TODO (API): If implementing token blacklisting (for immediate invalidation),
     * store the JTI (JWT ID) in a `revoked_tokens` table here.
     */
    public function logout(): void {
        // Instruct the frontend to clear its stored token.
        sendSuccess(null, 'Logged out successfully. Please remove the token from client storage.');
    }
}
