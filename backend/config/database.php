<?php

/**
 * database.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Database connection for BookSwap.
 *
 * Credentials come from config/local.php when it defines them; otherwise the
 * XAMPP defaults below apply.
 *
 * Every model calls getDBConnection(), so all models in one request share a
 * single PDO connection. That shared connection is what lets withTransaction()
 * wrap work spanning several models (accepting a request touches requests,
 * transactions, and listings) in one all-or-nothing unit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/../helpers/response.php';

// ── Credentials ──────────────────────────────────────────────────────────────
defined('DB_HOST')    || define('DB_HOST', 'localhost');
defined('DB_NAME')    || define('DB_NAME', 'bookswap');
defined('DB_USER')    || define('DB_USER', 'root');
defined('DB_PASS')    || define('DB_PASS', '');
defined('DB_CHARSET') || define('DB_CHARSET', 'utf8mb4');

// ── Connection ────────────────────────────────────────────────────────────────
/**
 * Returns the shared PDO connection, opening it on first use.
 *
 * Emulated prepares are off, so placeholders are bound by the database server
 * and user input is never spliced into SQL text.
 */
function getDBConnection(): PDO {
    static $pdo = null;

    if ($pdo !== null) {
        return $pdo; // reuse the existing connection
    }

    try {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);

        // Match NOW() and CURDATE() to PHP's APP_TIMEZONE.
        $offset = (new DateTime('now', new DateTimeZone(APP_TIMEZONE)))->format('P');
        $pdo->exec("SET time_zone = '$offset'");
    } catch (PDOException $e) {
        // Fallback to local SQLite if MySQL daemon is not running
        try {
            $sqliteFile = __DIR__ . '/../database/bookswap.sqlite';
            $isNew = !file_exists($sqliteFile) || filesize($sqliteFile) === 0;
            $pdo = new PDO('sqlite:' . $sqliteFile, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);

            if ($isNew) {
                initSqliteDatabase($pdo);
            }
        } catch (PDOException $sqle) {
            error_log('[BookSwap DB Error] MySQL: ' . $e->getMessage() . ' | SQLite: ' . $sqle->getMessage());
            sendError('Database connection failed.', 500);
        }
    }

    return $pdo;
}

function initSqliteDatabase(PDO $pdo): void {
    $schemaFile = __DIR__ . '/../database/schema.sql';
    $seedFile   = __DIR__ . '/../database/seed.sql';

    if (!file_exists($schemaFile)) return;

    $schema = file_get_contents($schemaFile);
    $schema = preg_replace('/--.*$/m', '', $schema); // Strip SQL comments
    $schema = preg_replace('/USE\s+bookswap;/i', '', $schema);
    $schema = preg_replace('/DROP DATABASE IF EXISTS\s+bookswap;/i', '', $schema);
    $schema = preg_replace('/CREATE DATABASE\s+[^;]+;/i', '', $schema);
    $schema = preg_replace('/ENGINE=InnoDB/i', '', $schema);
    $schema = preg_replace('/CHARACTER SET [^\s]+/i', '', $schema);
    $schema = preg_replace('/COLLATE [^\s]+/i', '', $schema);
    $schema = preg_replace('/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $schema);
    $schema = preg_replace('/INT\s+AUTO_INCREMENT/i', 'INTEGER PRIMARY KEY AUTOINCREMENT', $schema);
    $schema = preg_replace('/ON UPDATE CURRENT_TIMESTAMP/i', '', $schema);
    $schema = preg_replace('/ENUM\([^)]+\)/i', 'TEXT', $schema);

    // Split statements and execute individually
    $statements = array_filter(array_map('trim', explode(';', $schema)));
    foreach ($statements as $stmt) {
        if (empty($stmt)) continue;
        // Strip inline INDEX definitions if any
        $stmt = preg_replace('/,\s*INDEX\s+[^\s]+\s+\([^)]+\)/i', '', $stmt);
        try {
            $pdo->exec($stmt);
        } catch (Throwable $t) {
            error_log('[SQLite Statement Error] ' . $t->getMessage() . ' | SQL: ' . substr($stmt, 0, 100));
        }
    }

    if (file_exists($seedFile)) {
        $seed = file_get_contents($seedFile);
        $seed = preg_replace('/--.*$/m', '', $seed); // Strip SQL comments
        $seed = preg_replace('/USE\s+bookswap;/i', '', $seed);
        $seed = preg_replace('/SET time_zone\s*=[^;]+;/i', '', $seed);
        $seed = preg_replace('/NOW\(\)\s*-\s*INTERVAL\s*(\d+)\s*DAY/i', "datetime('now', '-\$1 days')", $seed);
        $seed = preg_replace('/CURDATE\(\)\s*-\s*INTERVAL\s*(\d+)\s*DAY/i', "date('now', '-\$1 days')", $seed);
        $seed = preg_replace('/CURDATE\(\)\s*\+\s*INTERVAL\s*(\d+)\s*DAY/i', "date('now', '+\$1 days')", $seed);

        $seedStmts = array_filter(array_map('trim', explode(';', $seed)));
        foreach ($seedStmts as $sStmt) {
            if (empty($sStmt)) continue;
            try {
                $pdo->exec($sStmt);
            } catch (Throwable $t) {
                // Ignore seed errors if any
            }
        }
    }
}





// ── Transactions ──────────────────────────────────────────────────────────────
/**
 * Run $work inside one database transaction and return its result.
 *
 * Any exception rolls everything back and is rethrown, so a half-finished
 * change (a request accepted but its books left unlocked, say) is never
 * saved. Code inside $work should throw ApiException rather than call
 * sendError(), because sendError() exits before the rollback can run.
 *
 * A nested call joins the transaction that is already open instead of
 * starting a second one.
 *
 * @param callable $work Receives no arguments.
 * @return mixed Whatever $work returns.
 */
function withTransaction(callable $work) {
    $pdo = getDBConnection();

    if ($pdo->inTransaction()) {
        return $work();
    }

    $pdo->beginTransaction();
    try {
        $result = $work();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

// ── Query Helpers ─────────────────────────────────────────────────────────────
/**
 * Prepare and run a statement on the shared connection.
 *
 * Integers are bound as integers. Native prepared statements need that for
 * LIMIT, OFFSET, and INTERVAL, which reject a quoted '10'.
 *
 * @param string $sql    SQL with named placeholders.
 * @param array  $params Placeholder => value. Each name may appear once in $sql.
 * @return PDOStatement  The executed statement.
 */
function runQuery(string $sql, array $params = []): PDOStatement {
    $pdo = getDBConnection();
    if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        $sql = preg_replace('/NOW\(\)\s*-\s*INTERVAL\s*(\d+)\s*DAY/i', "datetime('now', '-\$1 days')", $sql);
        $sql = preg_replace('/NOW\(\)\s*\+\s*INTERVAL\s*(\d+)\s*DAY/i', "datetime('now', '+\$1 days')", $sql);
        $sql = preg_replace('/NOW\(\)\s*-\s*INTERVAL\s*(\d+)\s*MINUTE/i', "datetime('now', '-\$1 minutes')", $sql);
        $sql = preg_replace('/\bNOW\(\)/i', "datetime('now')", $sql);
        $sql = preg_replace('/\bCURDATE\(\)/i', "date('now')", $sql);
    }
    $stmt = $pdo->prepare($sql);
    foreach ($params as $name => $value) {
        if (is_bool($value)) {
            $value = (int) $value;
        }
        $type = is_int($value) ? PDO::PARAM_INT : ($value === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->bindValue($name, $value, $type);
    }
    $stmt->execute();
    return $stmt;
}



/**
 * Fetch one page of rows plus the total number of matching rows.
 *
 * @param string $selectSql   SELECT ... ORDER BY ..., without LIMIT.
 * @param string $countSql    SELECT COUNT(*) with the same FROM and WHERE.
 * @param array  $params      Placeholders used by both statements.
 * @param array  $query       Output of readListQuery() (per_page and offset are used).
 * @param array  $orderParams Placeholders that appear only in $selectSql's ORDER BY.
 * @return array ['rows' => array, 'total' => int]
 */
function fetchPage(string $selectSql, string $countSql, array $params, array $query, array $orderParams = []): array {
    $total = (int) runQuery($countSql, $params)->fetchColumn();
    $rows  = runQuery(
        $selectSql . ' LIMIT :limit OFFSET :offset',
        $params + $orderParams + [':limit' => $query['per_page'], ':offset' => $query['offset']]
    )->fetchAll();

    return ['rows' => $rows, 'total' => $total];
}

/**
 * Build named placeholders for an SQL IN (...) list of integer IDs.
 * The caller must pass at least one ID.
 *
 * @param string $prefix Placeholder prefix, unique within the statement.
 * @param array  $ids    Integer IDs.
 * @return array [":p0, :p1", [":p0" => 1, ":p1" => 2]]
 */
function bindInList(string $prefix, array $ids): array {
    $placeholders = [];
    $params       = [];
    foreach (array_values($ids) as $i => $id) {
        $name           = ':' . $prefix . $i;
        $placeholders[] = $name;
        $params[$name]  = (int) $id;
    }
    return [implode(', ', $placeholders), $params];
}

/**
 * Turn search text into a LIKE pattern that matches it anywhere, with any
 * % or _ in the text treated literally instead of as wildcards.
 *
 * @param string $text
 * @return string
 */
function likeContains(string $text): string {
    return '%' . addcslashes($text, '%_\\') . '%';
}
