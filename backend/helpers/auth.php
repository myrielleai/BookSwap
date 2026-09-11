<?php

/**
 * auth.php
 * ─────────────────────────────────────────────────────────────────────────────
 * JWT and password helpers for BookSwap.
 *
 * JWT is implemented manually (no library dependency) so the project runs on
 * a bare PHP environment such as InfinityFree without Composer.
 *
 * TOKEN STRUCTURE:
 *   Header  → {"alg":"HS256","typ":"JWT"}
 *   Payload → {"sub": userId, "role": role, "iat": issued_at, "exp": expires_at}
 *   Signature → HMAC-SHA256 of header.payload using JWT_SECRET
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';

// ── Encoding Utilities ────────────────────────────────────────────────────────

/**
 * Base64 URL-safe encode (removes padding, replaces +/ with -_).
 */
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64 URL-safe decode.
 */
function base64UrlDecode(string $data): string {
    $padded = strtr($data, '-_', '+/');
    $padded .= str_repeat('=', (4 - strlen($padded) % 4) % 4);
    return base64_decode($padded);
}

// ── JWT Functions ─────────────────────────────────────────────────────────────

/**
 * Generate a signed JWT for the given user.
 *
 * @param int    $userId  The authenticated user's primary key.
 * @param string $role    One of ROLE_ADMIN | ROLE_STAFF | ROLE_CUSTOMER.
 * @return string         Signed JWT string.
 */
function generateJWT(int $userId, string $role): string {
    $header = base64UrlEncode(json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT',
    ]));

    $payload = base64UrlEncode(json_encode([
        'sub'  => $userId,
        'role' => $role,
        'iat'  => time(),
        'exp'  => time() + JWT_EXPIRY_SECS,
    ]));

    $signature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );

    return "$header.$payload.$signature";
}

/**
 * Validate and decode a JWT from the Authorization header.
 *
 * Returns the decoded payload array on success, or null if the token is
 * missing, malformed, expired, or has an invalid signature.
 *
 * @param string $token Raw JWT string (without "Bearer " prefix).
 * @return array|null   Decoded payload or null on failure.
 */
function validateJWT(string $token): ?array {
    $parts = explode('.', $token);

    if (count($parts) !== 3) {
        return null; // malformed token
    }

    [$header, $payload, $signature] = $parts;

    // Re-compute expected signature and compare.
    $expectedSignature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );

    // Use hash_equals to prevent timing attacks.
    if (!hash_equals($expectedSignature, $signature)) {
        return null; // signature mismatch
    }

    $data = json_decode(base64UrlDecode($payload), true);

    if (!$data || !isset($data['exp'])) {
        return null; // invalid payload
    }

    if (time() > $data['exp']) {
        return null; // token has expired
    }

    return $data;
}

/**
 * Extract the Bearer token from the Authorization header.
 *
 * @return string|null Raw token string or null if not present.
 */
function getBearerToken(): ?string {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (stripos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }

    // Some servers expose it as REDIRECT_HTTP_AUTHORIZATION.
    $redirect = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (stripos($redirect, 'Bearer ') === 0) {
        return trim(substr($redirect, 7));
    }

    return null;
}

// ── Password Functions ────────────────────────────────────────────────────────

/**
 * Hash a plain-text password using bcrypt.
 * Store the returned hash in the database — never store plain passwords.
 *
 * @param string $password Plain-text password from the registration form.
 * @return string          Bcrypt hash ready for storage.
 */
function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

/**
 * Verify a plain-text password against a stored bcrypt hash.
 *
 * @param string $password  Plain-text password from the login form.
 * @param string $hash      Hash retrieved from the database.
 * @return bool             True if the password matches.
 */
function verifyPassword(string $password, string $hash): bool {
    return password_verify($password, $hash);
}
