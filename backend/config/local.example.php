<?php

/**
 * local.example.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Template for machine-specific settings.
 *
 * Copy this file to local.php in the same folder and fill in real values.
 * local.php is ignored by git, so the JWT secret and the database password
 * never reach the repository.
 *
 * Generate a secret with:
 *   php -r "echo bin2hex(random_bytes(32));"
 *
 * Login is refused while JWT_SECRET is still the placeholder below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Include exception details in 500 responses. Keep false anywhere but your own machine.
define('APP_DEBUG', false);

// At least 32 characters of random data.
define('JWT_SECRET', 'REPLACE_WITH_A_STRONG_SECRET_KEY');

// Time zone shared by PHP and the database. Defaults to Asia/Manila if omitted.
define('APP_TIMEZONE', 'Asia/Manila');

// Browser origins allowed to call the API (the React dev server, the Vercel site).
define('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:3000',
]);

// Database credentials. Omit these to use the XAMPP defaults in database.php.
define('DB_HOST', 'localhost');
define('DB_NAME', 'bookswap');
define('DB_USER', 'root');
define('DB_PASS', '');
