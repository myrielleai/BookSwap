<?php

/**
 * security_pwned.php
 * ─────────────────────────────────────────────────────────────────────────────
 * External Security API Integration: HaveIBeenPwned (HIBP) Pwned Passwords API.
 *
 * Implements password breach checking using the k-Anonymity mathematical model:
 *   1. SHA-1 hash is computed locally for the input password (e.g., 40 hex chars).
 *   2. The first 5 characters (prefix) are sent to api.pwnedpasswords.com/range/{prefix}.
 *   3. The API returns a list of hash suffixes and occurrence counts matching that prefix.
 *   4. The remaining 35 characters (suffix) are matched locally against the response.
 *
 * The raw password is NEVER sent over the internet, preserving full privacy.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/http.php';
require_once __DIR__ . '/../config/constants.php';

/**
 * Check if a password has been compromised in known data breaches.
 *
 * @param string $password Plaintext candidate password.
 * @return array{breached: bool, count: int, error: ?string}
 */
function checkPasswordBreach(string $password): array {
    if ($password === '') {
        return ['breached' => false, 'count' => 0, 'error' => null];
    }

    $sha1 = strtoupper(sha1($password));
    $prefix = substr($sha1, 0, 5);
    $suffix = substr($sha1, 5);

    $url = (defined('HIBP_PWNED_API_URL') ? HIBP_PWNED_API_URL : 'https://api.pwnedpasswords.com/range/') . $prefix;

    // Send request with Add-Padding to guard against response-size side-channel leaks
    $headers = [
        'Add-Padding: true',
        'User-Agent: BookSwap-Security-Validator/1.0 (ITS122P Group 3 student project)',
    ];

    $response = httpRequest('GET', $url, $headers, null, 4);

    // Fail-open gracefully if the external API is unreachable
    if ($response['status'] !== 200 || empty($response['body'])) {
        return [
            'breached' => false,
            'count'    => 0,
            'error'    => $response['error'] ?? 'Security API currently unreachable.',
        ];
    }

    $lines = preg_split("/\r\n|\n|\r/", trim($response['body']));
    foreach ($lines as $line) {
        $parts = explode(':', trim($line));
        if (count($parts) === 2 && strtoupper($parts[0]) === $suffix) {
            $count = (int) $parts[1];
            return [
                'breached' => $count > 0,
                'count'    => $count,
                'error'    => null,
            ];
        }
    }

    return [
        'breached' => false,
        'count'    => 0,
        'error'    => null,
    ];
}
