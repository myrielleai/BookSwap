<?php

/**
 * response.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardized JSON response helpers.
 *
 * Every controller uses these functions so every API response has the same
 * shape. The frontend (React/Axios) can always expect:
 *   { "success": bool, "message": string, "data": mixed }
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Send a successful JSON response and stop execution.
 *
 * @param mixed  $data    The payload to return (array, object, or null).
 * @param string $message Human-readable success message.
 * @param int    $status  HTTP status code (default 200).
 */
function sendSuccess($data = null, string $message = 'OK', int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data'    => $data,
    ]);
    exit;
}

/**
 * Send an error JSON response and stop execution.
 *
 * @param string $message Human-readable error message.
 * @param int    $status  HTTP status code (default 400).
 * @param mixed  $errors  Optional field-level validation errors.
 */
function sendError(string $message = 'Bad Request', int $status = 400, $errors = null): void {
    http_response_code($status);
    header('Content-Type: application/json');
    $body = [
        'success' => false,
        'message' => $message,
    ];
    if ($errors !== null) {
        $body['errors'] = $errors;
    }
    echo json_encode($body);
    exit;
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
