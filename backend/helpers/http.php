<?php

/**
 * http.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal HTTPS client for BookSwap's external APIs (Google sign-in keys,
 * Open Library), built on cURL so it needs no Composer packages on shared
 * hosting.
 *
 * TLS certificates are always verified. PHP on Windows (XAMPP) often has no CA
 * bundle configured, so there the Windows certificate store is used instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Send an HTTP request and return the response.
 *
 * @param string      $method  GET, POST, ...
 * @param string      $url     Absolute http(s) URL.
 * @param string[]    $headers Header lines, e.g. "Content-Type: application/json".
 * @param string|null $body    Raw request body.
 * @param int         $timeout Seconds before giving up.
 * @return array Keys: status (0 when no response arrived), headers (lower-case name => value), body, error.
 */
function httpRequest(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 10): array {
    if (!function_exists('curl_init')) {
        return ['status' => 0, 'headers' => [], 'body' => '', 'error' => 'The PHP cURL extension is not available.'];
    }

    $curl = curl_init($url);
    $options = [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER         => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => min(5, $timeout),
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_USERAGENT      => 'BookSwap/1.0 (ITS122P Group 3 student project)',
    ];
    if ($body !== null) {
        $options[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($curl, $options);

    // Set separately: if this libcurl build lacks the option, the rest still apply.
    if (PHP_OS_FAMILY === 'Windows' && defined('CURLSSLOPT_NATIVE_CA')) {
        curl_setopt($curl, CURLOPT_SSL_OPTIONS, CURLSSLOPT_NATIVE_CA);
    }

    $raw = curl_exec($curl);
    if ($raw === false) {
        $error = curl_error($curl);
        curl_close($curl);
        return ['status' => 0, 'headers' => [], 'body' => '', 'error' => $error];
    }

    $status     = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $headerSize = (int) curl_getinfo($curl, CURLINFO_HEADER_SIZE);
    curl_close($curl);

    $responseHeaders = [];
    foreach (explode("\r\n", substr($raw, 0, $headerSize)) as $line) {
        if (strpos($line, ':') !== false) {
            [$name, $value] = explode(':', $line, 2);
            $responseHeaders[strtolower(trim($name))] = trim($value);
        }
    }

    return [
        'status'  => $status,
        'headers' => $responseHeaders,
        'body'    => (string) substr($raw, $headerSize),
        'error'   => null,
    ];
}
