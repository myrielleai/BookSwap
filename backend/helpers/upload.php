<?php

/**
 * upload.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Book photo uploads for BookSwap.
 *
 * A listing needs at least one photograph of the actual copy (Phase 1 §3.3.2)
 * and may have up to MAX_LISTING_PHOTOS. Each saved file becomes one row in
 * listing_photos holding the relative path returned here.
 *
 * Photos may be sent as a multi-file field (photos[]) or a single field (photo).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/response.php';

// The stored extension is chosen from the detected MIME type, never taken from
// the client's filename, so "shell.php" renamed to "cover.jpg" cannot keep a
// dangerous extension.
const PHOTO_EXTENSIONS = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

/**
 * Collect uploaded photos from photos[] and/or photo, in the order sent.
 * Empty file inputs (nothing chosen) are skipped.
 *
 * @return array List of $_FILES-style entries.
 */
function collectUploadedPhotos(): array {
    $files = [];

    if (isset($_FILES['photos']) && is_array($_FILES['photos']['name'])) {
        foreach ($_FILES['photos']['name'] as $i => $name) {
            $files[] = [
                'name'     => $name,
                'tmp_name' => $_FILES['photos']['tmp_name'][$i],
                'size'     => $_FILES['photos']['size'][$i],
                'error'    => $_FILES['photos']['error'][$i],
            ];
        }
    }

    if (isset($_FILES['photo']) && !is_array($_FILES['photo']['name'])) {
        $files[] = $_FILES['photo'];
    }

    return array_values(array_filter($files, fn(array $f): bool => $f['error'] !== UPLOAD_ERR_NO_FILE));
}

/**
 * Validate every uploaded photo, then store them all.
 *
 * All files are checked before any is moved, so a bad third photo does not
 * leave the first two orphaned on disk. Sends 422 and exits on the first problem.
 *
 * @return string[] Relative paths such as "uploads/books/book_3f9a....jpg".
 */
function saveBookPhotos(): array {
    $files = collectUploadedPhotos();

    if (count($files) === 0) {
        sendError('At least one clear photo of the book is required.', 422, ['photos' => 'At least one photo is required.']);
    }
    if (count($files) > MAX_LISTING_PHOTOS) {
        sendError('A listing may have at most ' . MAX_LISTING_PHOTOS . ' photos.', 422, ['photos' => 'Too many photos.']);
    }

    $maxBytes = UPLOAD_MAX_MB * 1024 * 1024;
    $finfo    = new finfo(FILEINFO_MIME_TYPE);
    $checked  = [];

    foreach ($files as $i => $file) {
        $label = 'Photo ' . ($i + 1);

        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            sendError("$label could not be uploaded.", 422, ['photos' => "$label failed to upload."]);
        }
        if ($file['size'] > $maxBytes) {
            sendError("$label must not exceed " . UPLOAD_MAX_MB . ' MB.', 422, ['photos' => "$label is too large."]);
        }

        // finfo reads the file's actual bytes; the browser-supplied type is not trusted.
        $mime = $finfo->file($file['tmp_name']);
        if (!is_string($mime) || !array_key_exists($mime, PHOTO_EXTENSIONS)) {
            sendError("$label must be a JPEG, PNG, or WebP image.", 422, ['photos' => "$label has an unsupported type."]);
        }

        $checked[] = ['tmp' => $file['tmp_name'], 'ext' => PHOTO_EXTENSIONS[$mime]];
    }

    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }

    $paths = [];
    foreach ($checked as $photo) {
        $name = 'book_' . bin2hex(random_bytes(12)) . '.' . $photo['ext'];
        if (!move_uploaded_file($photo['tmp'], UPLOAD_DIR . $name)) {
            deleteBookPhotos($paths);
            sendError('Failed to save the photos. Please try again.', 500);
        }
        $paths[] = 'uploads/books/' . $name;
    }

    return $paths;
}

/**
 * Delete stored photos, for example when the database insert that would have
 * referenced them fails.
 *
 * @param string[] $relativePaths Paths as returned by saveBookPhotos().
 */
function deleteBookPhotos(array $relativePaths): void {
    foreach ($relativePaths as $path) {
        // backend/helpers → project root is two levels up.
        $absolutePath = __DIR__ . '/../../' . $path;
        if (is_file($absolutePath)) {
            unlink($absolutePath);
        }
    }
}
