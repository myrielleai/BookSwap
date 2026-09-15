<?php

/**
 * CategoryController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Reference data: genres, formats, age categories, condition grades, meetup
 * locations, and the handover slot pool.
 * Reading the taxonomy is public; changing any of it is Admin-only.
 *
 * Endpoints (defined in routes/api.php):
 *   GET  /api/genres | /api/formats | /api/age-categories        → list*()
 *   GET  /api/conditions | /api/meetup-locations                  → list*()
 *   POST /api/admin/genres | formats | age-categories            → create*()
 *   PUT  /api/admin/genres | formats | age-categories/{id}/retire → retire*()
 *   POST /api/admin/conditions, PUT /api/admin/conditions/{id}/retire
 *   POST /api/admin/meetup-locations, PUT /api/admin/meetup-locations/{id}/retire
 *   GET  /api/staff/handover-slots                               → listAvailableSlots()
 *   GET  /api/admin/handover-slots                               → listSlots()
 *   POST /api/admin/handover-slots                               → createSlot()
 *   PUT  /api/admin/handover-slots/{id}/retire                   → retireSlot()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/CategoryModel.php';
require_once __DIR__ . '/../models/HandoverSlotModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class CategoryController {

    private CategoryModel     $categoryModel;
    private HandoverSlotModel $slotModel;
    private ReportModel       $reportModel;

    public function __construct() {
        $this->categoryModel = new CategoryModel();
        $this->slotModel     = new HandoverSlotModel();
        $this->reportModel   = new ReportModel();
    }

    // ── Genres, Formats, Age Categories ───────────────────────────────────────

    /** GET /api/genres — public. */
    public function listGenres(): void {
        sendSuccess($this->categoryModel->listTaxonomy('genre'), 'Genres retrieved.');
    }

    /** GET /api/formats — public. */
    public function listFormats(): void {
        sendSuccess($this->categoryModel->listTaxonomy('format'), 'Formats retrieved.');
    }

    /** GET /api/age-categories — public. */
    public function listAgeCategories(): void {
        sendSuccess($this->categoryModel->listTaxonomy('age_category'), 'Age categories retrieved.');
    }

    /** POST /api/admin/genres — Admin only. Accepts: { name } */
    public function createGenre(): void {
        $this->createTaxonomyEntry('genre', 'Genre');
    }

    /** POST /api/admin/formats — Admin only. Accepts: { name } */
    public function createFormat(): void {
        $this->createTaxonomyEntry('format', 'Format');
    }

    /** POST /api/admin/age-categories — Admin only. Accepts: { name } */
    public function createAgeCategory(): void {
        $this->createTaxonomyEntry('age_category', 'Age category');
    }

    /** PUT /api/admin/genres/{id}/retire — Admin only. */
    public function retireGenre(int $id): void {
        $this->retireTaxonomyEntry('genre', 'Genre', $id);
    }

    /** PUT /api/admin/formats/{id}/retire — Admin only. */
    public function retireFormat(int $id): void {
        $this->retireTaxonomyEntry('format', 'Format', $id);
    }

    /** PUT /api/admin/age-categories/{id}/retire — Admin only. */
    public function retireAgeCategory(int $id): void {
        $this->retireTaxonomyEntry('age_category', 'Age category', $id);
    }

    // ── Condition Grades ──────────────────────────────────────────────────────

    /** GET /api/conditions — public. */
    public function listConditions(): void {
        sendSuccess($this->categoryModel->getConditions(), 'Condition grades retrieved.');
    }

    /** POST /api/admin/conditions — Admin only. Accepts: { label, description } */
    public function createCondition(): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['label', 'description'], $body, $errors);
        $label       = sanitizeString($body['label'] ?? '');
        $description = sanitizeString($body['description'] ?? '');
        validateMaxLength('label', $label, 50, $errors);
        validateMaxLength('description', $description, 1000, $errors);
        if (!empty($errors)) {
            sendError('Label and description are required.', 422, $errors);
        }

        $id = $this->categoryModel->createCondition($label, $description);
        $this->reportModel->logActivity($admin['sub'], 'condition', $id, 'created', $label);

        sendSuccess(['condition_id' => $id], 'Condition grade created.', 201);
    }

    /** PUT /api/admin/conditions/{id}/retire — Admin only. */
    public function retireCondition(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        if ($this->categoryModel->findCondition($id) === null) {
            sendNotFound('Condition grade not found.');
        }

        $this->categoryModel->retireCondition($id);
        $this->reportModel->logActivity($admin['sub'], 'condition', $id, 'retired', '');

        sendSuccess(null, 'Condition grade retired. Existing listings are unaffected.');
    }

    // ── Meetup Locations ──────────────────────────────────────────────────────

    /** GET /api/meetup-locations — public. */
    public function listMeetupLocations(): void {
        sendSuccess($this->categoryModel->getMeetupLocations(), 'Meetup locations retrieved.');
    }

    /** POST /api/admin/meetup-locations — Admin only. Accepts: { name, address, city } */
    public function createMeetupLocation(): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['name', 'address', 'city'], $body, $errors);
        $name    = sanitizeString($body['name'] ?? '');
        $address = sanitizeString($body['address'] ?? '');
        $city    = sanitizeString($body['city'] ?? '');
        validateMaxLength('name', $name, 150, $errors);
        validateMaxLength('address', $address, 255, $errors);
        validateMaxLength('city', $city, 100, $errors);
        if (!empty($errors)) {
            sendError('Name, address, and city are required.', 422, $errors);
        }

        $id = $this->categoryModel->createMeetupLocation($name, $address, $city);
        $this->reportModel->logActivity($admin['sub'], 'meetup_location', $id, 'created', $name);

        sendSuccess(['location_id' => $id], 'Meetup location added.', 201);
    }

    /** PUT /api/admin/meetup-locations/{id}/retire — Admin only. */
    public function retireMeetupLocation(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        if ($this->categoryModel->findMeetupLocation($id) === null) {
            sendNotFound('Location not found.');
        }

        $this->categoryModel->retireMeetupLocation($id);
        $this->reportModel->logActivity($admin['sub'], 'meetup_location', $id, 'retired', '');

        sendSuccess(null, 'Meetup location retired. Its open slots are no longer offered for scheduling.');
    }

    // ── Handover Slot Pool ────────────────────────────────────────────────────

    /**
     * GET /api/staff/handover-slots
     * Upcoming open slots for Staff to choose from when scheduling.
     * Query: location_id, date_from, date_to
     */
    public function listAvailableSlots(): void {
        requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $errors     = [];
        $locationId = readPositiveInt($_GET, 'location_id', $errors);
        $dateFrom   = readDate($_GET, 'date_from', $errors);
        $dateTo     = readDate($_GET, 'date_to', $errors);
        if (!empty($errors)) {
            sendError('Invalid query parameters.', 422, $errors);
        }

        sendSuccess($this->slotModel->getUpcomingAvailable($locationId, $dateFrom, $dateTo), 'Available handover slots retrieved.');
    }

    /**
     * GET /api/admin/handover-slots
     * The whole pool, past and future.
     * Query: location_id, status (available|unavailable), date_from, date_to,
     *        sort (soonest|latest), page, per_page
     */
    public function listSlots(): void {
        requireAuth(ROLE_ADMIN);

        $query = readListQuery(['soonest', 'latest'], 'soonest', ['available', 'unavailable']);

        $errors     = [];
        $locationId = readPositiveInt($_GET, 'location_id', $errors);
        if (!empty($errors)) {
            sendError('Invalid query parameters.', 422, $errors);
        }

        $page = $this->slotModel->search($query, $locationId);

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Handover slots retrieved.');
    }

    /**
     * POST /api/admin/handover-slots
     * Add a slot to the pool (Phase 1 §3.1.6).
     * Accepts: { location_id, slot_date: 'YYYY-MM-DD', start_time: 'HH:MM', end_time: 'HH:MM' }
     */
    public function createSlot(): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['location_id', 'slot_date', 'start_time', 'end_time'], $body, $errors);
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $locationId = readPositiveInt($body, 'location_id', $errors);
        $slotDate   = readDate($body, 'slot_date', $errors);
        $startTime  = is_string($body['start_time']) ? normalizeTime($body['start_time']) : null;
        $endTime    = is_string($body['end_time']) ? normalizeTime($body['end_time']) : null;

        if ($startTime === null) {
            $errors['start_time'] = 'start_time must be a time in HH:MM format.';
        }
        if ($endTime === null) {
            $errors['end_time'] = 'end_time must be a time in HH:MM format.';
        }
        if ($startTime !== null && $endTime !== null && $endTime <= $startTime) {
            $errors['end_time'] = 'end_time must be later than start_time.';
        }
        if ($slotDate !== null && $slotDate < date('Y-m-d')) {
            $errors['slot_date'] = 'slot_date cannot be in the past.';
        }
        if ($locationId !== null && !$this->categoryModel->isActiveLocation($locationId)) {
            $errors['location_id'] = 'location_id does not match an active meetup location.';
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $slotId = $this->slotModel->create($locationId, $slotDate, $startTime, $endTime);
        $this->reportModel->logActivity($admin['sub'], 'slot', $slotId, 'created', "{$slotDate} {$startTime}–{$endTime}");

        sendSuccess(['slot_id' => $slotId], 'Handover slot added.', 201);
    }

    /**
     * PUT /api/admin/handover-slots/{id}/retire
     * Remove a slot from the pool. A slot booked by a scheduled handover is refused.
     *
     * @param int $id
     */
    public function retireSlot(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        if ($this->slotModel->findById($id) === null) {
            sendNotFound('Handover slot not found.');
        }

        $this->slotModel->retire($id);
        $this->reportModel->logActivity($admin['sub'], 'slot', $id, 'retired', '');

        sendSuccess(null, 'Handover slot retired.');
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * Shared body of the three taxonomy create endpoints.
     *
     * @param string $taxonomy 'genre' | 'format' | 'age_category'
     * @param string $label    Human-readable name for messages.
     */
    private function createTaxonomyEntry(string $taxonomy, string $label): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['name'], $body, $errors);
        $name = sanitizeString($body['name'] ?? '');
        validateMaxLength('name', $name, 100, $errors);
        if (!isset($errors['name']) && $name === '') {
            $errors['name'] = 'name is required.';
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $id = $this->categoryModel->createTaxonomy($taxonomy, $name);
        $this->reportModel->logActivity($admin['sub'], $taxonomy, $id, 'created', $name);

        sendSuccess(['id' => $id], "$label created.", 201);
    }

    /**
     * Shared body of the three taxonomy retire endpoints.
     *
     * @param string $taxonomy
     * @param string $label
     * @param int    $id
     */
    private function retireTaxonomyEntry(string $taxonomy, string $label, int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        if ($this->categoryModel->findTaxonomy($taxonomy, $id) === null) {
            sendNotFound("$label not found.");
        }

        $this->categoryModel->retireTaxonomy($taxonomy, $id);
        $this->reportModel->logActivity($admin['sub'], $taxonomy, $id, 'retired', '');

        sendSuccess(null, "$label retired. Existing listings are unaffected.");
    }
}
