<?php

/**
 * response.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardized JSON response helpers.
 *
 * Every controller uses these functions so every API response has the same
 * shape. The frontend (React/Axios) can always expect:
 *   { "success": bool, "message": string, "data": mixed }
 * List endpoints add:
 *   "meta": { "page", "per_page", "total", "total_pages" }
 * ─────────────────────────────────────────────────────────────────────────────
 */

// HTML-significant characters are written as <, &, and so on, so a
// stored value such as "<script>" can never be read as markup even by a client
// that mishandles the response. This is the output half of XSS protection;
// sanitizeString() on input is the other half.
const JSON_OUTPUT_FLAGS = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
                        | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE;

/**
 * Thrown wherever a request must stop with a specific HTTP status.
 *
 * Most useful inside withTransaction(): calling sendError() there would exit
 * before the rollback runs, whereas an exception unwinds through it. The
 * global handler in helpers/errors.php turns it into a normal error response.
 */
class ApiException extends RuntimeException {

    private int $status;
    private ?array $errors;

    public function __construct(string $message, int $status = 400, ?array $errors = null) {
        parent::__construct($message);
        $this->status = $status;
        $this->errors = $errors;
    }

    public function getStatus(): int {
        return $this->status;
    }

    public function getErrors(): ?array {
        return $this->errors;
    }
}

/**
 * Write a JSON body with the given status and stop execution.
 *
 * @param int   $status HTTP status code.
 * @param array $body   Response body.
 */
function sendJson(int $status, array $body): void {
    // Headers can only be set before output starts; a late failure still gets a body.
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($body, JSON_OUTPUT_FLAGS);
    exit;
}

/**
 * Send a successful JSON response and stop execution.
 *
 * @param mixed  $data    The payload to return (array, object, or null).
 * @param string $message Human-readable success message.
 * @param int    $status  HTTP status code (default 200).
 */
function sendSuccess($data = null, string $message = 'OK', int $status = 200): void {
    sendJson($status, [
        'success' => true,
        'message' => $message,
        'data'    => $data,
    ]);
}

/**
 * Send one page of a list and stop execution.
 *
 * @param array  $rows    The rows on this page.
 * @param array  $meta    Output of paginationMeta().
 * @param string $message Human-readable success message.
 */
function sendPaginated(array $rows, array $meta, string $message = 'OK'): void {
    sendJson(200, [
        'success' => true,
        'message' => $message,
        'data'    => $rows,
        'meta'    => $meta,
    ]);
}

/**
 * Send an error JSON response and stop execution.
 *
 * @param string $message Human-readable error message.
 * @param int    $status  HTTP status code (default 400).
 * @param mixed  $errors  Optional field-level validation errors.
 */
function sendError(string $message = 'Bad Request', int $status = 400, $errors = null): void {
    $body = [
        'success' => false,
        'message' => $message,
    ];
    if ($errors !== null) {
        $body['errors'] = $errors;
    }
    sendJson($status, $body);
}

/**
 * Shortcut for 401 Unauthorized — called by middleware when auth fails.
 *
 * @param string $message Reason for rejection.
 */
function sendUnauthorized(string $message = 'Unauthorized'): void {
    sendError($message, 401);
}

/**
 * Shortcut for 403 Forbidden — called when a user's role is insufficient.
 *
 * @param string $message Reason for rejection.
 */
function sendForbidden(string $message = 'Forbidden: insufficient permissions'): void {
    sendError($message, 403);
}

/**
 * Shortcut for 404 Not Found.
 *
 * @param string $message What was not found.
 */
function sendNotFound(string $message = 'Resource not found'): void {
    sendError($message, 404);
}
