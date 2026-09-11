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
 *   POST   /api/listings/{id}/watchlist   → addToWatchlist()
 *   DELETE /api/listings/{id}/watchlist   → removeFromWatchlist()
 *   GET    /api/user/watchlist            → getWatchlist()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/WatchlistModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/upload.php';
require_once __DIR__ . '/../config/constants.php';

class ListingController {

    private ListingModel   $listingModel;
    private WatchlistModel $watchlistModel;

    public function __construct() {
        $this->listingModel   = new ListingModel();
        $this->watchlistModel = new WatchlistModel();
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
     * Customer submits a new book for exchange.
     * Accepts multipart/form-data: title, author, edition, publisher,
     *                               genre_id, condition_id, preferred_return,
     *                               is_open_offer, photo
     */
    public function create(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $errors = [];
        validateRequired(['title', 'author', 'genre_id', 'condition_id'], $_POST, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        // Photo upload is mandatory.
        if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            sendError('A clear photo of the book is required.', 422, ['photo' => 'Photo is required.']);
        }

        $photoResult = handlePhotoUpload($_FILES['photo']);
        if (!$photoResult['success']) {
            sendError($photoResult['message'], 422);
        }

        $newId = $this->listingModel->create([
            'user_id'          => (int) $authUser['sub'],
            'title'            => sanitizeString($_POST['title']),
            'author'           => sanitizeString($_POST['author']),
            'edition'          => sanitizeString($_POST['edition']          ?? ''),
            'publisher'        => sanitizeString($_POST['publisher']        ?? ''),
            'genre_id'         => (int) $_POST['genre_id'],
            'condition_id'     => (int) $_POST['condition_id'],
            'preferred_return' => sanitizeString($_POST['preferred_return'] ?? ''),
            'is_open_offer'    => !empty($_POST['is_open_offer']),
            'photo_path'       => $photoResult['path'],
        ]);

        sendSuccess(['listing_id' => $newId], 'Listing submitted for staff verification.', 201);
    }

    /**
     * PUT /api/listings/{id}
     * Customer edits their listing.
     * Only permitted while status = 'unverified' or 'returned' (revision requested).
     *
     * @param int $id
     */
    public function update(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');
        if ((int) $listing['user_id'] !== (int) $authUser['sub']) sendForbidden('You may only edit your own listings.');

        // Editing is locked once a listing is approved into the catalog.
        $editableStatuses = [LISTING_UNVERIFIED, LISTING_RETURNED];
        if (!in_array($listing['status'], $editableStatuses, true)) {
            sendError('Listings can only be edited while pending verification or returned for revision.', 409);
        }

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['title', 'author', 'genre_id', 'condition_id'], $body, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        $this->listingModel->update($id, [
            'title'            => sanitizeString($body['title']),
            'author'           => sanitizeString($body['author']),
            'edition'          => sanitizeString($body['edition']          ?? ''),
            'publisher'        => sanitizeString($body['publisher']        ?? ''),
            'genre_id'         => (int) $body['genre_id'],
            'condition_id'     => (int) $body['condition_id'],
            'preferred_return' => sanitizeString($body['preferred_return'] ?? ''),
            'is_open_offer'    => !empty($body['is_open_offer']),
            'photo_path'       => sanitizeString($body['photo_path']       ?? $listing['photo_path']),
        ]);

        // If it was returned for revision, reset status to unverified so staff reviews it again.
        if ($listing['status'] === LISTING_RETURNED) {
            $this->listingModel->updateStatus($id, LISTING_UNVERIFIED, 'Resubmitted after revision.');
        }

        sendSuccess(null, 'Listing updated successfully.');
    }

    /**
     * DELETE /api/listings/{id}
     * Customer withdraws their listing from the platform.
     * Allowed only for 'unverified', 'available', or 'returned' listings.
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
     *
     * @param int $id
     */
    public function addToWatchlist(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = (int) $authUser['sub'];

        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');

        $this->watchlistModel->add($userId, $id);

        sendSuccess(null, 'Listing added to your watchlist. You will be notified of updates.');
    }

    /**
     * DELETE /api/listings/{id}/watchlist
     * Remove a listing from the authenticated user's watchlist.
     *
     * @param int $id
     */
    public function removeFromWatchlist(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = (int) $authUser['sub'];

        $this->watchlistModel->remove($userId, $id);

        sendSuccess(null, 'Listing removed from your watchlist.');
    }

    /**
     * GET /api/user/watchlist
     * Retrieve all watchlisted listings for the authenticated customer.
     */
    public function getWatchlist(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = (int) $authUser['sub'];

        $watchlist = $this->watchlistModel->getByUserId($userId);
        sendSuccess($watchlist, 'Watchlist retrieved.');
    }
}
