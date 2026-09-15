<?php

/**
 * ListingController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles book listing CRUD for members and catalog browsing for everyone.
 *
 * Endpoints (defined in routes/api.php):
 *   GET    /api/listings                  → index()      — public catalog
 *   GET    /api/listings/{id}             → show()       — single listing
 *   POST   /api/listings                  → create()     — member submits a listing
 *   PUT    /api/listings/{id}             → update()     — member edits their listing
 *   DELETE /api/listings/{id}             → withdraw()   — member withdraws their listing
 *   POST   /api/listings/{id}/watchlist   → addToWatchlist()
 *   DELETE /api/listings/{id}/watchlist   → removeFromWatchlist()
 *   GET    /api/user/watchlist            → getWatchlist()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/WatchlistModel.php';
require_once __DIR__ . '/../models/CategoryModel.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/upload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class ListingController {

    private ListingModel      $listingModel;
    private WatchlistModel    $watchlistModel;
    private CategoryModel     $categoryModel;
    private ExchangeModel     $exchangeModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;
    private UserModel         $userModel;

    public function __construct() {
        $this->listingModel      = new ListingModel();
        $this->watchlistModel    = new WatchlistModel();
        $this->categoryModel     = new CategoryModel();
        $this->exchangeModel     = new ExchangeModel();
        $this->notificationModel = new NotificationModel();
        $this->reportModel       = new ReportModel();
        $this->userModel         = new UserModel();
    }

    /**
     * GET /api/listings
     * Public catalog — no authentication required.
     * Query: keyword, genre_id, format_id, age_category_id, condition_id,
     *        date_from, date_to, sort (newest|oldest|title|relevance), page, per_page
     *
     * sort=relevance puts the signed-in member's favourite genres first.
     */
    public function index(): void {
        $authUser = optionalAuth();
        $query    = readListQuery(['newest', 'oldest', 'title', 'relevance'], 'newest');

        $errors  = [];
        $filters = [];
        foreach (['genre_id', 'format_id', 'age_category_id', 'condition_id'] as $field) {
            $filters[$field] = readPositiveInt($_GET, $field, $errors);
        }
        if (!empty($errors)) {
            sendError('Invalid query parameters.', 422, $errors);
        }

        $favoriteGenres = null;
        if ($query['sort'] === 'relevance' && $authUser !== null) {
            $favoriteGenres = $this->userModel->findById($authUser['sub'])['favorite_genres'] ?? null;
        }

        $page = $this->listingModel->searchCatalogue($query, $filters, $favoriteGenres);

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Listings retrieved.');
    }

    /**
     * GET /api/listings/{id}
     * A listing's full detail with all photos. The public sees only available
     * listings; the owner and Staff/Admin can also see it in any other state.
     *
     * @param int $id
     */
    public function show(int $id): void {
        $authUser = optionalAuth();

        $listing = $this->listingModel->findById($id);
        if ($listing === null) {
            sendNotFound('Listing not found.');
        }

        $canSeeAnyStatus = $authUser !== null && (
            $authUser['sub'] === (int) $listing['user_id']
            || in_array($authUser['role'], [ROLE_STAFF, ROLE_ADMIN], true)
        );
        if ($listing['status'] !== LISTING_AVAILABLE && !$canSeeAnyStatus) {
            sendNotFound('This listing is not currently available.');
        }

        $listing['photos'] = $this->listingModel->getPhotos($id);

        sendSuccess($listing, 'Listing retrieved.');
    }

    /**
     * POST /api/listings
     * A member submits a new book for exchange (Phase 1 §3.3.2).
     * Accepts multipart/form-data: title, author, edition, publisher, genre_id,
     *   format_id, age_category_id, condition_id, preferred_return, is_open_offer,
     *   photos[] (1 to MAX_LISTING_PHOTOS) or photo.
     */
    public function create(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        [$data, $errors] = $this->readListingInput($_POST);
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        // Photos are validated and stored only after the text fields pass.
        $photos = saveBookPhotos();

        try {
            $listingId = withTransaction(function () use ($authUser, $data, $photos) {
                $listingId = $this->listingModel->create(['user_id' => $authUser['sub']] + $data);
                foreach ($photos as $path) {
                    $this->listingModel->addPhoto($listingId, $path);
                }
                $this->reportModel->logActivity($authUser['sub'], 'listing', $listingId, 'submitted', '');
                return $listingId;
            });
        } catch (Throwable $e) {
            // The database insert failed, so the stored files would be orphaned.
            deleteBookPhotos($photos);
            throw $e;
        }

        sendSuccess(['listing_id' => $listingId, 'photos' => count($photos)], 'Listing submitted for staff verification.', 201);
    }

    /**
     * PUT /api/listings/{id}
     * A member edits their listing, only while it is unverified or returned
     * for revision. A returned listing goes back into the verification queue.
     * Accepts JSON with the same fields as create(), except photos.
     *
     * @param int $id
     */
    public function update(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) {
            sendNotFound('Listing not found.');
        }
        if ((int) $listing['user_id'] !== $authUser['sub']) {
            sendForbidden('You may only edit your own listings.');
        }
        if (!in_array($listing['status'], [LISTING_UNVERIFIED, LISTING_RETURNED], true)) {
            sendError('Listings can only be edited while pending verification or returned for revision.', 409);
        }

        [$data, $errors] = $this->readListingInput(getRequestBody());
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $wasReturned = $listing['status'] === LISTING_RETURNED;

        withTransaction(function () use ($id, $data, $wasReturned, $authUser) {
            $this->listingModel->update($id, $data);
            if ($wasReturned) {
                $this->listingModel->updateStatus($id, LISTING_UNVERIFIED);
            }
            $this->reportModel->logActivity($authUser['sub'], 'listing', $id, $wasReturned ? 'resubmitted' : 'edited', '');
        });

        sendSuccess(null, $wasReturned ? 'Listing updated and resubmitted for verification.' : 'Listing updated successfully.');
    }

    /**
     * DELETE /api/listings/{id}
     * A member withdraws their listing. Allowed while unverified, available, or
     * returned. Pending requests for the book are declined; requests offering it
     * are withdrawn.
     *
     * @param int $id
     */
    public function withdraw(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) {
            sendNotFound('Listing not found.');
        }
        if ((int) $listing['user_id'] !== $authUser['sub']) {
            sendForbidden('You may only withdraw your own listings.');
        }
        if (!in_array($listing['status'], [LISTING_UNVERIFIED, LISTING_AVAILABLE, LISTING_RETURNED], true)) {
            sendError('This listing cannot be withdrawn in its current state.', 409);
        }

        $declined = withTransaction(function () use ($id, $authUser) {
            $declined = $this->exchangeModel->closePendingForListing($id, 'The owner withdrew this listing.');
            $this->listingModel->withdraw($id);
            $this->reportModel->logActivity($authUser['sub'], 'listing', $id, 'withdrawn', '');
            return $declined;
        });

        foreach ($declined as $request) {
            $this->notificationModel->create(
                (int) $request['requester_id'],
                'request_declined',
                "Your exchange request for \"{$request['target_title']}\" was closed because the owner withdrew the listing.",
                'request',
                (int) $request['id']
            );
        }

        sendSuccess(null, 'Listing withdrawn successfully.');
    }

    /**
     * POST /api/listings/{id}/watchlist
     * Watch a book to be notified when it becomes available (Phase 1 §3.3.3).
     *
     * @param int $id
     */
    public function addToWatchlist(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $listing = $this->listingModel->findById($id);
        if ($listing === null) {
            sendNotFound('Listing not found.');
        }
        if ((int) $listing['user_id'] === $authUser['sub']) {
            sendError('You cannot watch your own listing.', 422);
        }
        if (!in_array($listing['status'], [LISTING_AVAILABLE, LISTING_LOCKED], true)) {
            sendError('Only books in the catalog or in an active exchange can be watched.', 409);
        }

        $this->watchlistModel->add($authUser['sub'], $id);

        sendSuccess(null, 'Listing added to your watchlist. You will be notified when it becomes available.');
    }

    /**
     * DELETE /api/listings/{id}/watchlist
     *
     * @param int $id
     */
    public function removeFromWatchlist(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $this->watchlistModel->remove($authUser['sub'], $id);

        sendSuccess(null, 'Listing removed from your watchlist.');
    }

    /**
     * GET /api/user/watchlist
     */
    public function getWatchlist(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        sendSuccess($this->watchlistModel->getByUserId($authUser['sub']), 'Watchlist retrieved.');
    }

    /**
     * Validate listing fields from a form (create) or JSON body (update).
     *
     * Every reference must point at an entry the Administrator still offers, so
     * a retired genre or condition cannot be attached to a new listing.
     *
     * @param array $input
     * @return array [data, errors]
     */
    private function readListingInput(array $input): array {
        $errors = [];
        validateRequired(['title', 'author', 'genre_id', 'condition_id'], $input, $errors);

        $data = [
            'title'            => sanitizeString($input['title'] ?? ''),
            'author'           => sanitizeString($input['author'] ?? ''),
            'edition'          => sanitizeString($input['edition'] ?? ''),
            'publisher'        => sanitizeString($input['publisher'] ?? ''),
            'preferred_return' => sanitizeString($input['preferred_return'] ?? ''),
            'is_open_offer'    => filter_var($input['is_open_offer'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'genre_id'         => readPositiveInt($input, 'genre_id', $errors),
            'format_id'        => readPositiveInt($input, 'format_id', $errors),
            'age_category_id'  => readPositiveInt($input, 'age_category_id', $errors),
            'condition_id'     => readPositiveInt($input, 'condition_id', $errors),
        ];

        foreach (['title' => 255, 'author' => 255, 'edition' => 100, 'publisher' => 150, 'preferred_return' => 255] as $field => $max) {
            validateMaxLength($field, $data[$field], $max, $errors);
        }
        foreach (['title', 'author'] as $field) {
            if (!isset($errors[$field]) && $data[$field] === '') {
                $errors[$field] = "$field is required.";
            }
        }

        foreach (['genre_id' => 'genre', 'format_id' => 'format', 'age_category_id' => 'age_category'] as $field => $taxonomy) {
            if ($data[$field] !== null && !$this->categoryModel->isActiveTaxonomy($taxonomy, $data[$field])) {
                $errors[$field] = "$field does not match an active $taxonomy.";
            }
        }
        if ($data['condition_id'] !== null && !$this->categoryModel->isActiveCondition($data['condition_id'])) {
            $errors['condition_id'] = 'condition_id does not match an active condition grade.';
        }

        return [$data, $errors];
    }
}
