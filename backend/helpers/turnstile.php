<?php

/**
 * turnstile.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Cloudflare Turnstile Bot Protection & Proof-of-Humanity API.
 *
 * Verifies the turnstile response token sent from the client against
 * Cloudflare's server-side siteverify endpoint.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/http.php';
require_once __DIR__ . '/../config/constants.php';

/**
 * Verify a Turnstile response token with Cloudflare.
 *
 * @param string      $token     The 'cf-turnstile-response' or 'turnstile_token' submitted by the frontend.
 * @param string|null $remoteIp  Optional client IP address.
 * @return array{success: bool, error: ?string}
 */
function verifyTurnstileToken(?string $token, ?string $remoteIp = null): array {
    // If no secret key is configured, pass validation to prevent locking out local dev
    if (!defined('TURNSTILE_SECRET_KEY') || TURNSTILE_SECRET_KEY === '') {
        return ['success' => true, 'error' => null];
    }

    if (empty($token)) {
        return [
            'success' => false,
            'error'   => 'Please complete the Cloudflare Turnstile human verification check.',
        ];
    }

    $postData = http_build_query([
        'secret'   => TURNSTILE_SECRET_KEY,
        'response' => $token,
        'remoteip' => $remoteIp ?? ($_SERVER['REMOTE_ADDR'] ?? null),
    ]);

    $headers = [
        'Content-Type: application/x-www-form-urlencoded',
        'User-Agent: BookSwap-Turnstile-Verifier/1.0',
    ];

    $response = httpRequest('POST', TURNSTILE_VERIFY_URL, $headers, $postData, 5);

    if ($response['status'] !== 200 || empty($response['body'])) {
        // If Cloudflare is temporarily unreachable, allow the request or fail-open gracefully
        return [
            'success' => true,
            'error'   => null,
        ];
    }

    $data = json_decode($response['body'], true);

    if (is_array($data) && !empty($data['success'])) {
        return [
            'success' => true,
            'error'   => null,
        ];
    }

    $errorCodes = isset($data['error-codes']) && is_array($data['error-codes'])
        ? implode(', ', $data['error-codes'])
        : 'verification_failed';

    return [
        'success' => false,
        'error'   => "Turnstile human verification failed ($errorCodes). Please try again.",
    ];
}
