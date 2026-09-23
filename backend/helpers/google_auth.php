<?php

/**
 * google_auth.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Google sign-in (Phase 1 Figure 1: OAuth 2.0 authentication).
 *
 * The frontend uses Google Identity Services, which returns an ID token (a JWT
 * signed by Google). The frontend sends it to POST /api/auth/google, and the
 * backend verifies it here before trusting anything inside:
 *   - the signature is RS256 and matches one of Google's published keys;
 *   - it was issued by Google, for this app's client ID, and has not expired;
 *   - Google has verified the email address.
 *
 * Google's public keys are cached in STORAGE_DIR for as long as Google's
 * Cache-Control header allows, and refetched when a token names a new key.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/http.php';

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * Verify a Google ID token.
 *
 * @param string $idToken
 * @return array|null Keys: sub, email (lower-cased), name. Null if the token is not valid.
 * @throws ApiException 502 when Google's keys cannot be fetched.
 */
function verifyGoogleIdToken(string $idToken): ?array {
    $parts = explode('.', $idToken);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerPart, $payloadPart, $signaturePart] = $parts;

    $header    = json_decode((string) googleBase64UrlDecode($headerPart), true);
    $claims    = json_decode((string) googleBase64UrlDecode($payloadPart), true);
    $signature = googleBase64UrlDecode($signaturePart);

    // Only RS256. Accepting "none" or HS256 would let anyone mint a token.
    if (!is_array($header) || !is_array($claims) || $signature === null
        || ($header['alg'] ?? null) !== 'RS256' || !is_string($header['kid'] ?? null)) {
        return null;
    }

    $publicKey = googlePublicKey($header['kid']);
    if ($publicKey === null || openssl_verify("$headerPart.$payloadPart", $signature, $publicKey, OPENSSL_ALGO_SHA256) !== 1) {
        return null;
    }

    $now = time();
    $audience = $claims['aud'] ?? null;
    $audienceOk = is_array($audience) ? in_array(GOOGLE_CLIENT_ID, $audience, true) : $audience === GOOGLE_CLIENT_ID;

    if (
        !in_array($claims['iss'] ?? null, GOOGLE_ISSUERS, true)
        || !$audienceOk
        || !is_int($claims['exp'] ?? null) || $claims['exp'] < $now - 60   // 60 s of clock skew
        || !is_int($claims['iat'] ?? null) || $claims['iat'] > $now + 300
        || !is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 255
        || !is_string($claims['email'] ?? null) || !filter_var($claims['email'], FILTER_VALIDATE_EMAIL)
        || !in_array($claims['email_verified'] ?? false, [true, 'true'], true)
    ) {
        return null;
    }

    return [
        'sub'   => $claims['sub'],
        'email' => strtolower($claims['email']),
        'name'  => is_string($claims['name'] ?? null) ? $claims['name'] : '',
    ];
}

/**
 * Google's public key for a key ID, as PEM.
 *
 * @param string $kid
 * @return string|null Null if Google does not publish that key.
 */
function googlePublicKey(string $kid): ?string {
    $keys = googleSigningKeys(false);
    if (!isset($keys[$kid])) {
        $keys = googleSigningKeys(true); // Google rotates keys; look again before refusing.
    }
    return $keys[$kid] ?? null;
}

/**
 * Google's current signing keys, from the cache or freshly fetched.
 *
 * @param bool $refresh Fetch even if the cache has not expired (at most once a minute).
 * @return array kid => PEM
 * @throws ApiException 502 when there are no keys at all.
 */
function googleSigningKeys(bool $refresh): array {
    $cacheFile = STORAGE_DIR . 'google-certs-' . substr(sha1(GOOGLE_CERTS_URL), 0, 12) . '.json';

    $cache = is_file($cacheFile) ? json_decode((string) file_get_contents($cacheFile), true) : null;
    $cache = is_array($cache) && is_array($cache['keys'] ?? null) ? $cache : null;

    if ($cache !== null) {
        $fresh       = $cache['expires_at'] > time();
        $recentFetch = $cache['fetched_at'] > time() - 60;
        if (($fresh && !$refresh) || ($refresh && $recentFetch)) {
            return $cache['keys'];
        }
    }

    $response = httpRequest('GET', GOOGLE_CERTS_URL, ['Accept: application/json'], null, 10);
    $data     = $response['status'] === 200 ? json_decode($response['body'], true) : null;

    $keys = [];
    foreach ((is_array($data) && is_array($data['keys'] ?? null)) ? $data['keys'] : [] as $jwk) {
        if (is_array($jwk) && ($jwk['kty'] ?? '') === 'RSA' && is_string($jwk['kid'] ?? null)
            && is_string($jwk['n'] ?? null) && is_string($jwk['e'] ?? null)) {
            $pem = rsaJwkToPem($jwk['n'], $jwk['e']);
            if ($pem !== null) {
                $keys[$jwk['kid']] = $pem;
            }
        }
    }

    if (!$keys) {
        error_log('[BookSwap Google] could not load signing keys: HTTP ' . $response['status'] . ' ' . ($response['error'] ?? ''));
        if ($cache !== null) {
            return $cache['keys']; // Keep working on the last known keys during an outage.
        }
        throw new ApiException('Google sign-in is temporarily unavailable. Please try again later.', 502);
    }

    $maxAge = preg_match('/max-age=(\d+)/', $response['headers']['cache-control'] ?? '', $match) ? (int) $match[1] : 3600;
    $maxAge = max(60, min($maxAge, 86400));

    if (!is_dir(STORAGE_DIR)) {
        mkdir(STORAGE_DIR, 0755, true);
    }
    file_put_contents($cacheFile, json_encode([
        'fetched_at' => time(),
        'expires_at' => time() + $maxAge,
        'keys'       => $keys,
    ]), LOCK_EX);

    return $keys;
}

/**
 * Strict base64url decoding. Returns null (never false or a TypeError) on bad input.
 *
 * @param string $value
 * @return string|null
 */
function googleBase64UrlDecode(string $value): ?string {
    if ($value === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $value)) {
        return null;
    }
    $padded  = strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4);
    $decoded = base64_decode($padded, true);
    return $decoded === false ? null : $decoded;
}

/**
 * Convert an RSA JSON Web Key (modulus n, exponent e) into a PEM public key
 * that openssl_verify() accepts.
 *
 * @param string $n base64url modulus
 * @param string $e base64url exponent
 * @return string|null
 */
function rsaJwkToPem(string $n, string $e): ?string {
    $modulus  = googleBase64UrlDecode($n);
    $exponent = googleBase64UrlDecode($e);
    if ($modulus === null || $exponent === null) {
        return null;
    }

    $rsaPublicKey = derSequence(derInteger($modulus) . derInteger($exponent));
    $algorithm    = hex2bin('300d06092a864886f70d0101010500'); // rsaEncryption OID + NULL
    $bitString    = "\x03" . derLength(strlen($rsaPublicKey) + 1) . "\x00" . $rsaPublicKey;
    $der          = derSequence($algorithm . $bitString);

    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

function derLength(int $length): string {
    if ($length < 0x80) {
        return chr($length);
    }
    $bytes = ltrim(pack('N', $length), "\x00");
    return chr(0x80 | strlen($bytes)) . $bytes;
}

function derInteger(string $bytes): string {
    $bytes = ltrim($bytes, "\x00");
    if ($bytes === '' || ord($bytes[0]) > 0x7f) {
        $bytes = "\x00" . $bytes; // keep the integer positive
    }
    return "\x02" . derLength(strlen($bytes)) . $bytes;
}

function derSequence(string $contents): string {
    return "\x30" . derLength(strlen($contents)) . $contents;
}
