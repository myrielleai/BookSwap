<?php

/**
 * upload.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Book photo upload helper for BookSwap.
 *
 * Handles validation and saving of uploaded book photographs.
 * The returned file path is what gets stored in the `listings.photo_path` column.
 *
 * TODO (DB): When saving a listing, pass the returned path into ListingModel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/response.php';

/**
 * Validate and save an uploaded book photo.
 *
 * Expects the file to be in $_FILES under the given field name.
 * Returns the relative path to the saved file on success,
 * or calls sendError() and exits on failure.
 *
 * @param string $fieldName  The name attribute of the <input type="file"> field.
 * @return string            Relative path to the stored file (e.g., "uploads/books/abc123.jpg").
 */
function saveBookPhoto(string $fieldName = 'photo'): string {
    // Check that a file was actually uploaded.
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
        sendError('A valid book photo is required.', 422);
    }

    $file     = $_FILES[$fieldName];
    $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;

    // Validate file size.
    if ($file['size'] > $maxBytes) {
        sendError("Photo must not exceed " . UPLOAD_MAX_MB . " MB.", 422);
    }

    // Validate MIME type using finfo (more reliable than the client-provided type).
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    if (!in_array($mimeType, UPLOAD_ALLOWED, true)) {
        sendError('Only JPEG, PNG, and WebP photos are accepted.', 422);
    }

    // Build a unique filename to avoid collisions.
    $extension    = pathinfo($file['name'], PATHINFO_EXTENSION);
    $uniqueName   = uniqid('book_', true) . '.' . strtolower($extension);
    $uploadDir    = UPLOAD_DIR;
    $absolutePath = $uploadDir . $uniqueName;

    // Create the upload directory if it does not exist yet.
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Move the file from the temp location to permanent storage.
    if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
        sendError('Failed to save the photo. Please try again.', 500);
    }

    // Return a relative path suitable for storing in the database.
    return 'uploads/books/' . $uniqueName;
}

/**
 * Delete a previously uploaded book photo from the filesystem.
 * Called when a listing is withdrawn or a photo is replaced.
 *
 * @param string $relativePath The relative path stored in the database.
 */
function deleteBookPhoto(string $relativePath): void {
    // Resolve to an absolute path (backend/ is two levels up from helpers/).
    $absolutePath = __DIR__ . '/../../' . $relativePath;

    if (file_exists($absolutePath)) {
        unlink($absolutePath);
    }
}
