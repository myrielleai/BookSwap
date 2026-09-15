<?php

/**
 * validator.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Input validation utilities for BookSwap.
 *
 * Usage pattern in controllers:
 *   $errors = [];
 *   validateRequired(['title', 'author'], $body, $errors);
 *   validateEmail($body['email'] ?? '', $errors);
 *   if (!empty($errors)) sendError('Validation failed', 422, $errors);
 *
 * List endpoints call readListQuery(), which validates paging, sorting,
 * status and date filters in one place and stops with 422 on bad input.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/response.php';

// ── Field Validation ──────────────────────────────────────────────────────────

/**
 * Ensure that all required fields are present, non-empty, and single values.
 *
 * Arrays are rejected here so that later string functions never receive one
 * (a JSON body can send {"title": ["a", "b"]}).
 *
 * @param array  $fields  List of required field names.
 * @param array  $input   Associative array of submitted data.
 * @param array  &$errors Errors array to append to on failure.
 */
function validateRequired(array $fields, array $input, array &$errors): void {
    foreach ($fields as $field) {
        $value = $input[$field] ?? null;
        if (is_array($value) || is_object($value)) {
            $errors[$field] = "$field must be a single value.";
        } elseif ($value === null || trim((string) $value) === '') {
            $errors[$field] = "$field is required.";
        }
    }
}

/**
 * Validate an email address format.
 *
 * @param string $email   Email string to check.
 * @param array  &$errors Errors array to append to on failure.
 */
function validateEmail(string $email, array &$errors): void {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'A valid email address is required.';
    }
}

/**
 * Validate that a string does not exceed a maximum character length.
 *
 * @param string $field   Field name (used in the error key).
 * @param string $value   The value to check.
 * @param int    $max     Maximum allowed character count.
 * @param array  &$errors Errors array to append to on failure.
 */
function validateMaxLength(string $field, string $value, int $max, array &$errors): void {
    if (mb_strlen($value) > $max) {
        $errors[$field] = "$field must not exceed $max characters.";
    }
}

/**
 * Validate that a value is one of a defined set of allowed values.
 * Used to enforce enums like roles, statuses, and sort keys.
 *
 * @param string $field   Field name (used in the error key).
 * @param mixed  $value   The value to check.
 * @param array  $allowed List of valid values.
 * @param array  &$errors Errors array to append to on failure.
 */
function validateInList(string $field, $value, array $allowed, array &$errors): void {
    if (!in_array($value, $allowed, true)) {
        $list = implode(', ', $allowed);
        $errors[$field] = "$field must be one of: $list.";
    }
}

/**
 * Validate that a password meets minimum security requirements.
 * Rule: at least 8 characters, at least one letter and one number.
 *
 * @param string $password The plain-text password from the form.
 * @param array  &$errors  Errors array to append to on failure.
 */
function validatePassword(string $password, array &$errors): void {
    if (strlen($password) < 8) {
        $errors['password'] = 'Password must be at least 8 characters.';
        return;
    }
    if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
        $errors['password'] = 'Password must contain at least one letter and one number.';
    }
}

/**
 * Validate that two password fields match (used in registration and reset forms).
 *
 * @param string $password        The new password.
 * @param string $confirmPassword The confirmation field.
 * @param array  &$errors         Errors array to append to on failure.
 */
function validatePasswordMatch(string $password, string $confirmPassword, array &$errors): void {
    if ($password !== $confirmPassword) {
        $errors['confirm_password'] = 'Passwords do not match.';
    }
}

/**
 * Validate an optional phone number: digits with an optional leading +,
 * spaces or dashes allowed, 7 to 20 characters. An empty value passes.
 *
 * @param string $field   Field name (used in the error key).
 * @param string $value   The value to check.
 * @param array  &$errors Errors array to append to on failure.
 */
function validatePhone(string $field, string $value, array &$errors): void {
    if ($value !== '' && !preg_match('/^\+?[0-9][0-9\s-]{6,19}$/', $value)) {
        $errors[$field] = "$field must be a valid phone number.";
    }
}

/**
 * True for a real calendar date in YYYY-MM-DD form (rejects 2026-02-30).
 *
 * @param string $value
 * @return bool
 */
function isValidDate(string $value): bool {
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value;
}

/**
 * Normalize a 24-hour time given as HH:MM or HH:MM:SS.
 *
 * @param string $value
 * @return string|null The time as HH:MM:SS, or null if it is not a valid time.
 */
function normalizeTime(string $value): ?string {
    if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/', $value, $m)) {
        return null;
    }
    return sprintf('%s:%s:%s', $m[1], $m[2], $m[3] ?? '00');
}

/**
 * Read an optional positive integer (usually an ID) from input.
 *
 * @param array  $input   Query string or request body.
 * @param string $field   Field name.
 * @param array  &$errors Errors array to append to when the value is invalid.
 * @return int|null The value, or null when absent or invalid.
 */
function readPositiveInt(array $input, string $field, array &$errors): ?int {
    if (!array_key_exists($field, $input) || $input[$field] === '' || $input[$field] === null) {
        return null;
    }
    $value = $input[$field];
    if (is_int($value) && $value > 0) {
        return $value;
    }
    if (is_string($value) && ctype_digit($value) && (int) $value > 0) {
        return (int) $value;
    }
    $errors[$field] = "$field must be a positive whole number.";
    return null;
}

/**
 * Read an optional YYYY-MM-DD date from input.
 *
 * @param array  $input   Query string or request body.
 * @param string $field   Field name.
 * @param array  &$errors Errors array to append to when the value is invalid.
 * @return string|null The date, or null when absent or invalid.
 */
function readDate(array $input, string $field, array &$errors): ?string {
    if (!isset($input[$field]) || $input[$field] === '') {
        return null;
    }
    if (!is_string($input[$field]) || !isValidDate($input[$field])) {
        $errors[$field] = "$field must be a valid date in YYYY-MM-DD format.";
        return null;
    }
    return $input[$field];
}

// ── Sanitization ──────────────────────────────────────────────────────────────

/**
 * Sanitize a plain string by stripping HTML tags and trimming whitespace.
 * Use before storing any free-text input (titles, messages, reasons, etc.).
 *
 * Non-scalar input (an array sent where a string was expected) becomes an
 * empty string instead of raising a type error.
 *
 * @param mixed $value The raw input value.
 * @return string      Sanitized string.
 */
function sanitizeString($value): string {
    if (!is_scalar($value)) {
        return '';
    }
    return trim(strip_tags((string) $value));
}

/**
 * Parse and return the JSON request body as an associative array.
 * Returns an empty array if the body is missing or malformed.
 *
 * Controllers call this at the top to get POST/PUT data from JSON requests.
 *
 * @return array Decoded request body.
 */
function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ── Lists: Search, Filter, Sort, Paginate ─────────────────────────────────────

/**
 * Parse and validate the common list parameters from the query string:
 *   page, per_page, sort, status, date_from, date_to, keyword.
 *
 * Sort and status must come from the caller's whitelist and dates must be real
 * YYYY-MM-DD dates with date_from on or before date_to. Anything invalid stops
 * the request with 422 before a query is built, so only whitelisted sort keys
 * can ever reach an ORDER BY clause.
 *
 * @param array  $sortOptions   Allowed values for ?sort=.
 * @param string $defaultSort   Used when ?sort= is absent.
 * @param array  $statusOptions Allowed values for ?status= (empty means no status filter).
 * @return array Keys: page, per_page, offset, sort, status, date_from, date_to, keyword.
 */
function readListQuery(array $sortOptions, string $defaultSort, array $statusOptions = []): array {
    $query  = $_GET;
    $errors = [];

    $page    = readPositiveInt($query, 'page', $errors) ?? 1;
    $perPage = readPositiveInt($query, 'per_page', $errors) ?? PAGE_SIZE_DEFAULT;
    if (!isset($errors['per_page']) && $perPage > PAGE_SIZE_MAX) {
        $errors['per_page'] = 'per_page must be between 1 and ' . PAGE_SIZE_MAX . '.';
    }

    $sort = (isset($query['sort']) && $query['sort'] !== '') ? $query['sort'] : $defaultSort;
    validateInList('sort', $sort, $sortOptions, $errors);

    $status = null;
    if ($statusOptions && isset($query['status']) && $query['status'] !== '') {
        $status = $query['status'];
        validateInList('status', $status, $statusOptions, $errors);
    }

    $dateFrom = readDate($query, 'date_from', $errors);
    $dateTo   = readDate($query, 'date_to', $errors);
    if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
        $errors['date_to'] = 'date_to must be on or after date_from.';
    }

    $keyword = sanitizeString($query['keyword'] ?? '');
    validateMaxLength('keyword', $keyword, 100, $errors);

    if (!empty($errors)) {
        sendError('Invalid query parameters.', 422, $errors);
    }

    return [
        'page'      => $page,
        'per_page'  => $perPage,
        'offset'    => ($page - 1) * $perPage,
        'sort'      => $sort,
        'status'    => $status,
        'date_from' => $dateFrom,
        'date_to'   => $dateTo,
        'keyword'   => $keyword,
    ];
}

/**
 * Build the "meta" block for a paginated response.
 *
 * @param int   $total Total rows matching the filters, across all pages.
 * @param array $query Output of readListQuery().
 * @return array
 */
function paginationMeta(int $total, array $query): array {
    return [
        'page'        => $query['page'],
        'per_page'    => $query['per_page'],
        'total'       => $total,
        'total_pages' => (int) ceil($total / $query['per_page']),
    ];
}

/**
 * Read and validate a report date range from ?from= and ?to=.
 * Defaults to the last REPORT_DEFAULT_DAYS days, ending today.
 *
 * @return array [from, to] as YYYY-MM-DD strings.
 */
function readReportRange(): array {
    $errors = [];
    $from = readDate($_GET, 'from', $errors) ?? date('Y-m-d', strtotime('-' . REPORT_DEFAULT_DAYS . ' days'));
    $to   = readDate($_GET, 'to', $errors)   ?? date('Y-m-d');

    if (empty($errors) && $from > $to) {
        $errors['to'] = 'to must be on or after from.';
    }
    if (!empty($errors)) {
        sendError('Invalid report range.', 422, $errors);
    }
    return [$from, $to];
}
