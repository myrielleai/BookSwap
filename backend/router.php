<?php

/**
 * router.php — Development router for PHP's built-in web server
 * Usage: php -S 127.0.0.1:8765 backend/router.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH));

// Serve static assets from uploads/ directory if requested
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false;
}

// Ensure SCRIPT_NAME points to index.php so base path resolution matches
$_SERVER['SCRIPT_NAME'] = '/index.php';

// Dispatch through index.php
require_once __DIR__ . '/index.php';
