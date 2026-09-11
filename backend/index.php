<?php

/**
 * index.php — BookSwap Backend Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * Every HTTP request to the backend passes through this single file.
 * Apache rewrites all requests to here via the .htaccess file in this directory.
 *
 * EXECUTION ORDER:
 *   1. Set response headers (CORS, content type).
 *   2. Handle the OPTIONS preflight (required by browsers before cross-origin requests).
 *   3. Load the router and dispatch the request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── CORS Headers ──────────────────────────────────────────────────────────────
// Allow the React frontend (running on Vercel or localhost) to call this API.
// TODO (API): In production, replace '*' with the actual Vercel frontend URL.
//             Example: header('Access-Control-Allow-Origin: https://bookswap.vercel.app');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// ── Preflight Request ──────────────────────────────────────────────────────────
// Browsers send an OPTIONS request before the real request when using custom headers.
// We respond 200 OK immediately so the browser proceeds with the real request.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Error Reporting ────────────────────────────────────────────────────────────
// Show all errors during development. Disable in production.
// TODO (API): Set these to 0 before deploying to InfinityFree.
ini_set('display_errors', 1);
error_reporting(E_ALL);

// ── Load and Dispatch ─────────────────────────────────────────────────────────
require_once __DIR__ . '/routes/api.php';

// This single call handles the entire request lifecycle:
//   parse method + path → find matching route → call controller method → send JSON response.
routeRequest();
