<?php

/**
 * index.php — BookSwap Backend Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * Every HTTP request to the backend passes through this single file.
 * Apache rewrites all requests to here via the .htaccess file in this directory.
 *
 * EXECUTION ORDER:
 *   1. Register global error handling, so every failure is a JSON response.
 *   2. Send security headers and, for allowed origins, CORS headers.
 *   3. Answer the OPTIONS preflight.
 *   4. Load the router and dispatch the request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/config/constants.php';
require_once __DIR__ . '/helpers/errors.php';

// ── Error Handling ────────────────────────────────────────────────────────────
// Exceptions, warnings, and fatal errors all become JSON error responses.
// Details are included only when APP_DEBUG is true in config/local.php.
registerErrorHandlers();

// ── Security Headers ──────────────────────────────────────────────────────────
// This backend only ever returns JSON, so nothing it sends should be sniffed
// as HTML, framed by another site, or allowed to load resources.
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Content-Type: application/json; charset=utf-8');

// ── CORS Headers ──────────────────────────────────────────────────────────────
// Only origins listed in CORS_ORIGINS (config/local.php) may call the API from
// a browser: the React dev server locally, the Vercel site in production.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, CORS_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 600');
}
header('Vary: Origin');

// ── Preflight Request ──────────────────────────────────────────────────────────
// Browsers send an OPTIONS request before the real request when using custom headers.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Load and Dispatch ─────────────────────────────────────────────────────────
require_once __DIR__ . '/routes/api.php';

// This single call handles the entire request lifecycle:
//   parse method + path → find matching route → call controller method → send JSON response.
routeRequest();
