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
 *   Header    → {"alg":"HS256","typ":"JWT"}
 *   Payload   → {"sub": userId, "role": role, "jti": tokenId, "iat": issued_at, "exp": expires_at}
 *   Signature → HMAC-SHA256 of header.payload using JWT_SECRET
 *
 * A valid signature alone is not enough to get in: the token's jti must also
 * match an unrevoked row in user_sessions (see middleware/auth_middleware.php).
 * That is what lets logout, deactivation, and role changes end a session at once.
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

// ── Token Identity ────────────────────────────────────────────────────────────

/**
 * True once a real secret has been configured in config/local.php.
 *
 * The placeholder is public in this repository, so tokens signed with it
 * could be forged by anyone. They are neither issued nor accepted.
 */
function jwtSecretConfigured(): bool {
    return JWT_SECRET !== JWT_SECRET_PLACEHOLDER && strlen(JWT_SECRET) >= 32;
}

/**
 * Generate a random token ID (the JWT "jti" claim).
 *
 * @return string 64 hex characters.
 */
function newTokenId(): string {
    return bin2hex(random_bytes(32));
}

/**
 * Hash a token ID for storage. Only this hash is written to user_sessions,
 * so a leaked database dump cannot be turned back into working tokens.
 *
 * @param string $tokenId
 * @return string SHA-256 hex digest.
 */
function hashTokenId(string $tokenId): string {
    return hash('sha256', $tokenId);
}

// ── JWT Functions ─────────────────────────────────────────────────────────────

/**
 * Generate a signed JWT for the given user.
 *
 * @param int    $userId    The authenticated user's primary key.
 * @param string $role      One of ROLE_ADMIN | ROLE_STAFF | ROLE_CUSTOMER.
 * @param string $tokenId   Random ID linking the token to its user_sessions row.
 * @param int    $expiresAt Unix timestamp; must match the session's expires_at.
 * @return string           Signed JWT string.
 */
function generateJWT(int $userId, string $role, string $tokenId, int $expiresAt): string {
    if (!jwtSecretConfigured()) {
        throw new RuntimeException('JWT_SECRET is not configured. Copy config/local.example.php to config/local.php.');
    }

    $header = base64UrlEncode(json_encode([
        'alg' => 'HS256',
        'typ' => 'JWT',
    ]));

    $payload = base64UrlEncode(json_encode([
        'sub'  => $userId,
        'role' => $role,
        'jti'  => $tokenId,
        'iat'  => time(),
        'exp'  => $expiresAt,
    ]));

    $signature = base64UrlEncode(
        hash_hmac('sha256', "$header.$payload", JWT_SECRET, true)
    );

    return "$header.$payload.$signature";
}

/**
 * Validate and decode a JWT.
 *
 * Returns the decoded payload on success, or null if the token is malformed,
 * altered, expired, missing a required claim, or signed while no real secret
 * is configured. This checks the token only; the session is checked separately.
 *
 * @param string $token Raw JWT string (without "Bearer " prefix).
 * @return array|null   Decoded payload or null on failure.
 */
function validateJWT(string $token): ?array {
    if (!jwtSecretConfigured()) {
        return null;
    }

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

    if (!is_array($data) || !isset($data['exp'], $data['sub'], $data['jti']) || !is_string($data['jti'])) {
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
