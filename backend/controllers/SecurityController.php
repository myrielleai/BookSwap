<?php

/**
 * SecurityController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * External Security API endpoints for BookSwap.
 *
 * Exposes:
 *   - POST /api/security/check-password : Validates candidate password against
 *     HaveIBeenPwned Pwned Passwords API using k-Anonymity.
 *   - GET  /api/security/status         : Summarizes active security features and
 *     external security API integrations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/security_pwned.php';
require_once __DIR__ . '/../config/constants.php';

class SecurityController {

    /**
     * POST /api/security/check-password
     *
     * Accepts: { password: "..." }
     * Returns: { breached: bool, count: int, safe: bool, message: string }
     */
    public function checkPassword(): void {
        $body = getRequestBody();
        $password = (string) ($body['password'] ?? '');

        if ($password === '') {
            sendError('Password is required for security check.', 422, ['password' => 'Password is required.']);
        }

        $result = checkPasswordBreach($password);

        if ($result['breached']) {
            $countFormatted = number_format($result['count']);
            sendSuccess([
                'safe'     => false,
                'breached' => true,
                'count'    => $result['count'],
                'message'  => "This password was found in {$countFormatted} public data breaches (verified via HaveIBeenPwned API).",
            ], 'Password compromised in data breaches.');
        } else {
            sendSuccess([
                'safe'     => true,
                'breached' => false,
                'count'    => 0,
                'message'  => 'Password was not found in any known public data breaches.',
            ], 'Password passed breach verification.');
        }
    }

    /**
     * GET /api/security/status
     *
     * Provides metadata on security features and active external security APIs.
     */
    public function status(): void {
        sendSuccess([
            'external_apis' => [
                [
                    'name'        => 'HaveIBeenPwned (HIBP) Pwned Passwords API',
                    'endpoint'    => HIBP_PWNED_API_URL,
                    'purpose'     => 'Breach detection on user registration and password updates',
                    'technique'   => 'k-Anonymity model (SHA-1 5-character prefix matching)',
                    'privacy'     => 'Raw passwords never transmitted over the network',
                ],
                [
                    'name'        => 'Google Identity / OAuth 2.0 Certificates API',
                    'endpoint'    => GOOGLE_CERTS_URL,
                    'purpose'     => 'Validates cryptographic signatures on Google ID tokens',
                    'technique'   => 'RS256 JWT public key verification',
                    'privacy'     => 'Zero Google user passwords stored locally',
                ],
                [
                    'name'        => 'Open Library Books API',
                    'endpoint'    => OPEN_LIBRARY_BASE_URL,
                    'purpose'     => 'Book metadata and cover lookup proxy',
                    'technique'   => 'ISBN / Work ID catalog query',
                    'privacy'     => 'Public catalog metadata',
                ],
            ],
            'internal_security' => [
                'password_hashing' => 'Bcrypt (cost 12)',
                'token_auth'       => 'HMAC-SHA256 Stateful JWT with SHA-256 session token hashing',
                'rbac'             => 'Three tiers: Customer, Staff, Admin with real-time DB verification',
                'sql_protection'   => 'PDO Prepared Statements with emulated prepares disabled',
                'cors'             => 'Restricted origin whitelist',
            ],
        ], 'Security status and API catalog retrieved successfully.');
    }
}
