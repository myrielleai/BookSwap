<?php

/**
 * errors.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Global error handling for BookSwap.
 *
 * Every failure ends as a JSON error response instead of an HTML error page or
 * a blank screen:
 *   - ApiException       → its own status and message (409, 422, ...)
 *   - any other exception → 500
 *   - PHP warnings/notices → promoted to exceptions, then 500
 *   - fatal errors       → caught on shutdown, then 500
 *
 * Messages and stack locations go to the server log. The client only sees
 * them when APP_DEBUG is true, so internal paths and SQL never leak in production.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/response.php';

/**
 * Install the error, exception, and shutdown handlers. Called once from index.php.
 */
function registerErrorHandlers(): void {
    // PHP must never print errors itself: they would corrupt the JSON body.
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    error_reporting(E_ALL);

    // Promote warnings and notices to exceptions so they cannot silently
    // produce a half-correct response.
    set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
        if (!(error_reporting() & $severity)) {
            return false; // silenced with @
        }
        throw new ErrorException($message, 0, $severity, $file, $line);
    });

    set_exception_handler('handleUncaughtException');

    // Fatal errors bypass the exception handler, so check for them on shutdown.
    register_shutdown_function(function (): void {
        $error = error_get_last();
        $fatal = E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR;
        if ($error !== null && ($error['type'] & $fatal)) {
            handleUncaughtException(
                new ErrorException($error['message'], 0, $error['type'], $error['file'], $error['line'])
            );
        }
    });
}

/**
 * Turn any uncaught throwable into a JSON error response.
 *
 * @param Throwable $e
 */
function handleUncaughtException(Throwable $e): void {
    if ($e instanceof ApiException) {
        sendError($e->getMessage(), $e->getStatus(), $e->getErrors());
    }

    error_log(sprintf(
        '[BookSwap] %s: %s in %s:%d',
        get_class($e),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine()
    ));

    $debug = APP_DEBUG
        ? [
            'exception' => get_class($e),
            'detail'    => $e->getMessage(),
            'at'        => basename($e->getFile()) . ':' . $e->getLine(),
        ]
        : null;

    sendError('An unexpected server error occurred.', 500, $debug);
}
