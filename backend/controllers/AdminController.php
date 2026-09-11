<?php

/**
 * AdminController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all Administrator-only actions.
 *
 * Every method starts with requireAuth(ROLE_ADMIN) — if the caller is not
 * an Admin, the middleware returns 403 and execution stops there.
 *
 * Endpoints (defined in routes/api.php):
 *   GET    /api/admin/users               → listUsers()
 *   PUT    /api/admin/users/{id}/status   → updateUserStatus()
 *   PUT    /api/admin/users/{id}/role     → updateUserRole()
 *   POST   /api/admin/users/{id}/reset-password → resetPassword()
 *   GET    /api/admin/reports/summary     → reportSummary()
 *   GET    /api/admin/reports/genres      → reportTopGenres()
 *   GET    /api/admin/reports/cities      → reportByCity()
 *   GET    /api/admin/activity-log        → activityLog()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../config/constants.php';

class AdminController {

    private UserModel   $userModel;
    private ReportModel $reportModel;

    public function __construct() {
        $this->userModel   = new UserModel();
        $this->reportModel = new ReportModel();
    }

    // ── User Management ───────────────────────────────────────────────────────

    /**
     * GET /api/admin/users
     * List all users. Accepts optional ?status= and ?role= query params.
     */
    public function listUsers(): void {
        requireAuth(ROLE_ADMIN);

        $status = $_GET['status'] ?? null;
        $role   = $_GET['role']   ?? null;

        $users = $this->userModel->getAll($status, $role);

        sendSuccess($users, 'Users retrieved successfully.');
    }

    /**
     * PUT /api/admin/users/{id}/status
     * Approve, deactivate, or reactivate an account.
     * Accepts: { status: 'active'|'inactive'|'suspended' }
     *
     * @param int $id Target user's primary key (passed from the router).
     */
    public function updateUserStatus(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['status'], $body, $errors);
        if (!empty($errors)) {
            sendError('Status is required.', 422, $errors);
        }

        $allowed = [ACCOUNT_ACTIVE, ACCOUNT_INACTIVE, ACCOUNT_SUSPENDED];
        validateInList('status', $body['status'], $allowed, $errors);
        if (!empty($errors)) {
            sendError('Invalid status value.', 422, $errors);
        }

        // Guard: prevent the Admin from deactivating themselves if they are the
        // only active Admin (enforces the "at least one active Admin" rule).
        // TODO: Add a check here — query COUNT of active admins before deactivating.

        $success = $this->userModel->updateStatus($id, $body['status']);
        if (!$success) {
            sendError('Failed to update user status. User may not exist.', 404);
        }

        // Write to the activity log so changes are traceable.
        $this->reportModel->logActivity(
            $admin['sub'],
            'user',
            $id,
            'status_changed',
            "Status set to {$body['status']}"
        );

        sendSuccess(null, "User status updated to {$body['status']}.");
    }

    /**
     * PUT /api/admin/users/{id}/role
     * Promote a Customer to Staff or revoke Staff back to Customer.
     * Accepts: { role: 'staff'|'customer' }
     *
     * @param int $id
     */
    public function updateUserRole(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['role'], $body, $errors);
        if (!empty($errors)) {
            sendError('Role is required.', 422, $errors);
        }

        // Admins may only assign staff or customer — not another admin.
        validateInList('role', $body['role'], [ROLE_STAFF, ROLE_CUSTOMER], $errors);
        if (!empty($errors)) {
            sendError('Invalid role. Assignable roles are: staff, customer.', 422, $errors);
        }

        $success = $this->userModel->updateRole($id, $body['role']);
        if (!$success) {
            sendError('Failed to update role. User may not exist.', 404);
        }

        $this->reportModel->logActivity(
            $admin['sub'],
            'user',
            $id,
            'role_changed',
            "Role set to {$body['role']}"
        );

        sendSuccess(null, "User role updated to {$body['role']}.");
    }

    /**
     * POST /api/admin/users/{id}/reset-password
     * Issue a password reset for a locked account.
     * Accepts: { new_password, confirm_password }
     *
     * NOTE: In production, this should send a reset link via email instead of
     * accepting a new password directly. See docs/DB_API_GUIDE.md for the email API.
     *
     * @param int $id
     */
    public function resetPassword(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['new_password', 'confirm_password'], $body, $errors);

        if (empty($errors)) {
            validatePassword($body['new_password'], $errors);
            validatePasswordMatch($body['new_password'], $body['confirm_password'], $errors);
        }

        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $hash    = hashPassword($body['new_password']);
        $success = $this->userModel->updatePassword($id, $hash);
        if (!$success) {
            sendError('Failed to reset password. User may not exist.', 404);
        }

        $this->reportModel->logActivity($admin['sub'], 'user', $id, 'password_reset', '');

        sendSuccess(null, 'Password reset successfully.');
    }

    // ── Reporting ─────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Returns counts of listings posted, exchanges completed, and cancellation rate.
     */
    public function reportSummary(): void {
        requireAuth(ROLE_ADMIN);

        $from = $_GET['from'] ?? date('Y-m-01');   // default: start of current month
        $to   = $_GET['to']   ?? date('Y-m-d');     // default: today

        $data = $this->reportModel->getSummary($from, $to);
        sendSuccess($data, 'Summary report generated.');
    }

    /**
     * GET /api/admin/reports/genres?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
     * Returns the most requested genres within the date range.
     */
    public function reportTopGenres(): void {
        requireAuth(ROLE_ADMIN);

        $from  = $_GET['from']  ?? date('Y-m-01');
        $to    = $_GET['to']    ?? date('Y-m-d');
        $limit = (int) ($_GET['limit'] ?? 10);

        $data = $this->reportModel->getTopGenres($from, $to, $limit);
        sendSuccess($data, 'Top genres report generated.');
    }

    /**
     * GET /api/admin/reports/cities?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Returns participation breakdown by city.
     */
    public function reportByCity(): void {
        requireAuth(ROLE_ADMIN);

        $from = $_GET['from'] ?? date('Y-m-01');
        $to   = $_GET['to']   ?? date('Y-m-d');

        $data = $this->reportModel->getParticipationByCity($from, $to);
        sendSuccess($data, 'City participation report generated.');
    }

    /**
     * GET /api/admin/activity-log?record_type=listing&record_id=5
     * Returns the audit trail. Supports optional filters.
     */
    public function activityLog(): void {
        requireAuth(ROLE_ADMIN);

        $recordId   = isset($_GET['record_id'])   ? (int) $_GET['record_id']        : null;
        $recordType = $_GET['record_type'] ?? null;

        $data = $this->reportModel->getActivityLog($recordId, $recordType);
        sendSuccess($data, 'Activity log retrieved.');
    }
}
