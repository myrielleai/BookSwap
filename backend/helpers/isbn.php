<?php

/**
 * isbn.php
 * ─────────────────────────────────────────────────────────────────────────────
 * ISBN validation for the book lookup.
 *
 * Checking the check digit here catches typos before any request is made to
 * Open Library, and gives each book one cache key however it was typed
 * ("978-0-441-01359-3" and "9780441013593" are the same book).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Normalise an ISBN-10 or ISBN-13 and verify its check digit.
 *
 * @param string $value As typed; spaces and hyphens are ignored.
 * @return string|null Digits only (with a final X allowed for ISBN-10), or null if invalid.
 */
function normalizeIsbn(string $value): ?string {
    $isbn = strtoupper(str_replace([' ', '-'], '', trim($value)));

    if (preg_match('/^\d{9}[\dX]$/', $isbn)) {
        $sum = 0;
        for ($i = 0; $i < 10; $i++) {
            $digit = $isbn[$i] === 'X' ? 10 : (int) $isbn[$i];
            $sum  += (10 - $i) * $digit;
        }
        return $sum % 11 === 0 ? $isbn : null;
    }

    if (preg_match('/^97[89]\d{10}$/', $isbn)) {
        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $isbn[$i] * ($i % 2 === 0 ? 1 : 3);
        }
        return (10 - $sum % 10) % 10 === (int) $isbn[12] ? $isbn : null;
    }

    return null;
}
