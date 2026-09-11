<?php

/**
 * ListingController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles book listing CRUD for Customers and catalog browsing for all users.
 *
 * Endpoints (defined in routes/api.php):
 *   GET    /api/listings              → index()      — public catalog
 *   GET    /api/listings/{id}         → show()       — single listing
 *   POST   /api/listings              → create()     — Customer submits a listing
 *   PUT    /api/listings/{id}         → update()     — Customer edits their listing
 *   DELETE /api/listings/{id}         → withdraw()   — Customer withdraws their listing
 *   POST   /api/listings/{id}/watchlist → addToWatchlist()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/upload.php';
require_once __DIR__ . '/../config/constants.php';

class ListingController {

    private ListingModel $listingModel;

    public function __construct() {
        $this->listingModel = new ListingModel();
    }

    /**
     * GET /api/listings
     * Public catalog — no authentication required.
     * Accepts query params: keyword, genre_id, condition_id, sort (date|relevance)
     */
    public function index(): void {
        $filters = [
            'keyword'      => sanitizeString($_GET['keyword']      ?? ''),
            'genre_id'     => (int) ($_GET['genre_id']     ?? 0) ?: null,
            'condition_id' => (int) ($_GET['condition_id'] ?? 0) ?: null,
            'sort'         => $_GET['sort'] ?? 'date',
        ];

        $listings = $this->listingModel->getAvailable($filters);
        sendSuccess($listings, 'Listings retrieved.');
    }

    /**
     * GET /api/listings/{id}
     * Returns a single listing's full detail. Public — no auth required.
     *
     * @param int $id
     */
    public function show(int $id): void {
        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');
        if ($listing['status'] !== LISTING_AVAILABLE) sendNotFound('This listing is not currently available.');

        sendSuccess($listing, 'Listing retrieved.');
    }

    /**
     * POST /api/listings
     * Submit a new book listing. Customer only.
     * Accepts multipart/form-data: title, author, edition, publisher,
     *   genre_id, condition_id, preferred_return?, is_open_offer, photo (file)
     */
    public function create(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        // Validate text fields (sent as form fields in multipart request).
        $errors = [];
        $body   = $_POST; // multipart form data
        validateRequired(['title', 'author', 'genre_id', 'condition_id'], $body, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        validateMaxLength('title',  $body['title'],  255, $errors);
        validateMaxLength('author', $body['author'], 255, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        // Handle the required book photo upload.
        $photoPath = saveBookPhoto('photo'); // returns 'uploads/books/filename.jpg'

        $listingId = $this->listingModel->create([
            'user_id'          => $authUser['sub'],
            'title'            => sanitizeString($body['title']),
            'author'           => sanitizeString($body['author']),
            'edition'          => sanitizeString($body['edition']    ?? ''),
            'publisher'        => sanitizeString($body['publisher']  ?? ''),
            'genre_id'         => (int) $body['genre_id'],
            'condition_id'     => (int) $body['condition_id'],
            'preferred_return' => sanitizeString($body['preferred_return'] ?? ''),
            'is_open_offer'    => !empty($body['is_open_offer']) ? 1 : 0,
            'photo_path'       => $photoPath,
        ]);

        sendSuccess(['listing_id' => $listingId], 'Listing submitted successfully. It will appear in the catalog after Staff verification.', 201);
    }

    /**
     * PUT /api/listings/{id}
     * Edit a listing. Only allowed while status = 'unverified' or 'returned'.
     * Only the listing owner may edit.
     * Accepts JSON body with the same fields as create (photo update is optional).
     *
     * @param int $id
     */
    public function update(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');

        // Ownership check.
        if ((int) $listing['user_id'] !== (int) $authUser['sub']) {
            sendForbidden('You may only edit your own listings.');
        }

        // Editability check — locked/archived listings cannot be changed.
        $editableStatuses = [LISTING_UNVERIFIED, LISTING_RETURNED];
        if (!in_array($listing['status'], $editableStatuses, true)) {
            sendError('This listing cannot be edited in its current state (' . $listing['status'] . ').', 409);
        }

        $body   = getRequestBody();
        $errors = [];
        if (!empty($body['title']))  validateMaxLength('title',  $body['title'],  255, $errors);
        if (!empty($body['author'])) validateMaxLength('author', $body['author'], 255, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        // Photo update is optional on edit — only re-process if a new file is sent.
        $photoPath = $listing['photo_path'];
        if (!empty($_FILES['photo'])) {
            deleteBookPhoto($listing['photo_path']); // remove old photo
            $photoPath = saveBookPhoto('photo');
        }

        $this->listingModel->update($id, [
            'title'            => sanitizeString($body['title']   ?? $listing['title']),
            'author'           => sanitizeString($body['author']  ?? $listing['author']),
            'edition'          => sanitizeString($body['edition'] ?? $listing['edition']),
            'publisher'        => sanitizeString($body['publisher'] ?? $listing['publisher']),
            'genre_id'         => (int) ($body['genre_id']     ?? $listing['genre_id']),
            'condition_id'     => (int) ($body['condition_id'] ?? $listing['condition_id']),
            'preferred_return' => sanitizeString($body['preferred_return'] ?? $listing['preferred_return']),
            'is_open_offer'    => isset($body['is_open_offer']) ? (int) $body['is_open_offer'] : $listing['is_open_offer'],
            'photo_path'       => $photoPath,
        ]);

        // Reset to 'unverified' so Staff re-reviews the edited listing.
        $this->listingModel->updateStatus($id, LISTING_UNVERIFIED);

        sendSuccess(null, 'Listing updated. It will be re-reviewed by a moderator.');
    }

    /**
     * DELETE /api/listings/{id}
     * Withdraw (soft-delete) a listing. Only the owner can do this,
     * and only while the listing is 'unverified' or 'available'.
     *
     * @param int $id
     */
    public function withdraw(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');
        if ((int) $listing['user_id'] !== (int) $authUser['sub']) sendForbidden('You may only withdraw your own listings.');

        $withdrawable = [LISTING_UNVERIFIED, LISTING_AVAILABLE, LISTING_RETURNED];
        if (!in_array($listing['status'], $withdrawable, true)) {
            sendError('This listing cannot be withdrawn in its current state.', 409);
        }

        $this->listingModel->withdraw($id);

        sendSuccess(null, 'Listing withdrawn successfully.');
    }

    /**
     * POST /api/listings/{id}/watchlist
     * Add a listing to the authenticated user's watchlist.
     * Sends a notification when the listing becomes available.
     *
     * TODO (DB): This requires a `watchlist` table: (user_id, listing_id, created_at).
     * Add WatchlistModel when the DB is integrated.
     *
     * @param int $id
     */
    public function addToWatchlist(int $id): void {
        requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');

        // TODO (DB): INSERT INTO watchlist (user_id, listing_id, created_at) VALUES (..., NOW())
        //            Handle duplicate key gracefully.

        sendSuccess(null, 'Listing added to your watchlist. You will be notified when it becomes available.');
    }
}
