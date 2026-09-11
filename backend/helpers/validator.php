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
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Ensure that all required fields are present and non-empty in the input array.
 *
 * @param array  $fields List of required field names.
 * @param array  $input  Associative array of submitted data.
 * @param array  &$errors Errors array to append to on failure.
 */
function validateRequired(array $fields, array $input, array &$errors): void {
    foreach ($fields as $field) {
        if (!isset($input[$field]) || trim((string) $input[$field]) === '') {
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
 * Used to enforce enums like roles, statuses, and condition grades.
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
 * Sanitize a plain string by stripping HTML tags and trimming whitespace.
 * Use before storing any free-text input (titles, messages, reasons, etc.).
 *
 * @param string $value The raw input string.
 * @return string       Sanitized string.
 */
function sanitizeString(string $value): string {
    return trim(strip_tags($value));
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
