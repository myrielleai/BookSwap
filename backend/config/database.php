<?php

/**
 * database.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Database connection configuration for BookSwap.
 *
 * HOW TO USE (for the groupmate handling the DB):
 *  1. Fill in your actual DB credentials below.
 *  2. Uncomment the PDO block.
 *  3. Every model receives $db via its constructor — no changes needed there.
 *
 * See docs/DB_API_GUIDE.md for the full integration walkthrough.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Credentials ──────────────────────────────────────────────────────────────
// TODO (DB): Replace these values with your actual database credentials.
define('DB_HOST', 'localhost');
define('DB_NAME', 'bookswap');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// ── Connection ────────────────────────────────────────────────────────────────
/**
 * Returns a singleton PDO connection.
 * Models call getDBConnection() in their constructors.
 *
 * TODO (DB): Uncomment the PDO block below once credentials are set.
 */
function getDBConnection(): ?PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo; // reuse the existing connection
    }

    try {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        // Log the error but never expose DB details to the client.
        error_log('[BookSwap DB Error] ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
        exit;
    }

    return $pdo;
}
