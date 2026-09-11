<?php

/**
 * CategoryController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles taxonomy management (categories, condition grades, meetup locations).
 * Write operations are Admin-only. Read operations are public.
 *
 * Endpoints (defined in routes/api.php):
 *   GET    /api/categories               → listCategories()
 *   POST   /api/admin/categories         → createCategory()
 *   PUT    /api/admin/categories/{id}/retire → retireCategory()
 *   GET    /api/conditions               → listConditions()
 *   POST   /api/admin/conditions         → createCondition()
 *   PUT    /api/admin/conditions/{id}/retire → retireCondition()
 *   GET    /api/meetup-locations         → listMeetupLocations()
 *   POST   /api/admin/meetup-locations   → createMeetupLocation()
 *   PUT    /api/admin/meetup-locations/{id}/retire → retireMeetupLocation()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/CategoryModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class CategoryController {

    private CategoryModel $categoryModel;

    public function __construct() {
        $this->categoryModel = new CategoryModel();
    }

    // ── Categories ────────────────────────────────────────────────────────────

    /** GET /api/categories — public, no auth needed. Accepts ?type=genre|age|format */
    public function listCategories(): void {
        $type       = $_GET['type'] ?? null;
        $categories = $this->categoryModel->getCategories($type);
        sendSuccess($categories, 'Categories retrieved.');
    }

    /** POST /api/admin/categories — Admin only. Accepts: { name, type } */
    public function createCategory(): void {
        requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['name', 'type'], $body, $errors);
        if (!empty($errors)) sendError('Name and type are required.', 422, $errors);

        validateInList('type', $body['type'], ['genre', 'age', 'format'], $errors);
        if (!empty($errors)) sendError('Invalid type. Must be genre, age, or format.', 422, $errors);

        $id = $this->categoryModel->createCategory(
            sanitizeString($body['name']),
            sanitizeString($body['type'])
        );

        sendSuccess(['category_id' => $id], 'Category created.', 201);
    }

    /** PUT /api/admin/categories/{id}/retire — Admin only. Marks inactive. */
    public function retireCategory(int $id): void {
        requireAuth(ROLE_ADMIN);
        $success = $this->categoryModel->retireCategory($id);
        if (!$success) sendNotFound('Category not found.');
        sendSuccess(null, 'Category retired. Historical listings are unaffected.');
    }

    // ── Condition Grades ──────────────────────────────────────────────────────

    /** GET /api/conditions — public. */
    public function listConditions(): void {
        sendSuccess($this->categoryModel->getConditions(), 'Condition grades retrieved.');
    }

    /** POST /api/admin/conditions — Admin only. Accepts: { label, description } */
    public function createCondition(): void {
        requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['label', 'description'], $body, $errors);
        if (!empty($errors)) sendError('Label and description are required.', 422, $errors);

        $id = $this->categoryModel->createCondition(
            sanitizeString($body['label']),
            sanitizeString($body['description'])
        );

        sendSuccess(['condition_id' => $id], 'Condition grade created.', 201);
    }

    /** PUT /api/admin/conditions/{id}/retire — Admin only. */
    public function retireCondition(int $id): void {
        requireAuth(ROLE_ADMIN);
        $success = $this->categoryModel->retireCondition($id);
        if (!$success) sendNotFound('Condition grade not found.');
        sendSuccess(null, 'Condition grade retired.');
    }

    // ── Meetup Locations ──────────────────────────────────────────────────────

    /** GET /api/meetup-locations — public (Staff needs this when scheduling). */
    public function listMeetupLocations(): void {
        sendSuccess($this->categoryModel->getMeetupLocations(), 'Meetup locations retrieved.');
    }

    /** POST /api/admin/meetup-locations — Admin only. Accepts: { name, address } */
    public function createMeetupLocation(): void {
        requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['name', 'address'], $body, $errors);
        if (!empty($errors)) sendError('Name and address are required.', 422, $errors);

        $id = $this->categoryModel->createMeetupLocation(
            sanitizeString($body['name']),
            sanitizeString($body['address'])
        );

        sendSuccess(['location_id' => $id], 'Meetup location added.', 201);
    }

    /** PUT /api/admin/meetup-locations/{id}/retire — Admin only. */
    public function retireMeetupLocation(int $id): void {
        requireAuth(ROLE_ADMIN);
        $success = $this->categoryModel->retireMeetupLocation($id);
        if (!$success) sendNotFound('Location not found.');
        sendSuccess(null, 'Meetup location retired.');
    }
}
