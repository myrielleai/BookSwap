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
 *   GET    /api/admin/users                     → listUsers()
 *   PUT    /api/admin/users/{id}/status         → updateUserStatus()
 *   PUT    /api/admin/users/{id}/role           → updateUserRole()
 *   POST   /api/admin/users/{id}/reset-password → resetPassword()
 *   GET    /api/admin/dashboard                 → dashboard()
 *   GET    /api/admin/reports/summary           → reportSummary()
 *   GET    /api/admin/reports/genres            → reportTopGenres()
 *   GET    /api/admin/reports/cities            → reportByCity()
 *   GET    /api/admin/reports/age-groups        → reportByAgeGroup()
 *   GET    /api/admin/activity-log              → activityLog()
 *
 * Escalated member reports are handled through the staff report endpoints,
 * which Administrators can also use (GET /api/staff/reports?status=escalated).
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/SessionModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../config/constants.php';

class AdminController {

    // Record types written to the activity log; ?record_type= must be one of these.
    private const ACTIVITY_RECORD_TYPES = [
        'user', 'listing', 'request', 'transaction', 'report',
        'slot', 'genre', 'format', 'age_category', 'condition', 'meetup_location',
    ];

    private UserModel    $userModel;
    private SessionModel $sessionModel;
    private ReportModel  $reportModel;

    public function __construct() {
        $this->userModel    = new UserModel();
        $this->sessionModel = new SessionModel();
        $this->reportModel  = new ReportModel();
    }

    // ── User Management ───────────────────────────────────────────────────────

    /**
     * GET /api/admin/users
     * Query: keyword, status, role, date_from, date_to, sort (newest|oldest|name), page, per_page
     */
    public function listUsers(): void {
        requireAuth(ROLE_ADMIN);

        $query = readListQuery(
            ['newest', 'oldest', 'name'],
            'newest',
            [ACCOUNT_PENDING, ACCOUNT_ACTIVE, ACCOUNT_INACTIVE, ACCOUNT_SUSPENDED]
        );

        $role = $_GET['role'] ?? '';
        if ($role !== '') {
            $errors = [];
            validateInList('role', $role, [ROLE_ADMIN, ROLE_STAFF, ROLE_CUSTOMER], $errors);
            if (!empty($errors)) {
                sendError('Invalid query parameters.', 422, $errors);
            }
        }

        $page = $this->userModel->search($query, $role !== '' ? $role : null);

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Users retrieved successfully.');
    }

    /**
     * PUT /api/admin/users/{id}/status
     * Approve, deactivate, suspend, or reactivate an account.
     * Accepts: { status: 'active'|'inactive'|'suspended' }
     *
     * @param int $id Target user's primary key (passed from the router).
     */
    public function updateUserStatus(int $id): void {
        $admin = requireAuth(ROLE_ADMIN);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['status'], $body, $errors);
        if (empty($errors)) {
            validateInList('status', $body['status'], [ACCOUNT_ACTIVE, ACCOUNT_INACTIVE, ACCOUNT_SUSPENDED], $errors);
        }
        if (!empty($errors)) {
            sendError('Invalid status value.', 422, $errors);
        }

        $user   = $this->findUserOr404($id);
        $status = $body['status'];

        // Phase 1 §3.1.2: at least one active Administrator at all times. This
        // guards every administrator account, not only the one making the change.
        if (
            $user['role'] === ROLE_ADMIN
            && $user['status'] === ACCOUNT_ACTIVE
            && $status !== ACCOUNT_ACTIVE
            && $this->userModel->countActiveAdmins() <= 1
        ) {
            sendError('Cannot deactivate the only active administrator on the platform.', 409);
        }

        $this->userModel->updateStatus($id, $status);

        // A deactivated or suspended account is signed out everywhere immediately.
        $sessionsEnded = $status !== ACCOUNT_ACTIVE ? $this->sessionModel->revokeAllForUser($id) : 0;

        $this->reportModel->logActivity($admin['sub'], 'user', $id, 'status_changed', "Status set to $status");

        sendSuccess(['sessions_ended' => $sessionsEnded], "User status updated to $status.");
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
        if (empty($errors)) {
            // Admins may only assign staff or customer — not another admin.
            validateInList('role', $body['role'], [ROLE_STAFF, ROLE_CUSTOMER], $errors);
        }
        if (!empty($errors)) {
            sendError('Invalid role. Assignable roles are: staff, customer.', 422, $errors);
        }

        $user = $this->findUserOr404($id);
        if ($user['role'] === ROLE_ADMIN) {
            sendError('Administrator accounts cannot be reassigned through this endpoint.', 409);
        }

        $this->userModel->updateRole($id, $body['role']);

        // The old role travels in existing sessions' history, so end them all.
        $sessionsEnded = $this->sessionModel->revokeAllForUser($id);

        $this->reportModel->logActivity($admin['sub'], 'user', $id, 'role_changed', "Role set to {$body['role']}");

        sendSuccess(['sessions_ended' => $sessionsEnded], "User role updated to {$body['role']}.");
    }

    /**
     * POST /api/admin/users/{id}/reset-password
     * Issue a password reset for a locked account (Phase 1 §3.1.1).
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
            validatePassword((string) $body['new_password'], $errors);
            validatePasswordMatch((string) $body['new_password'], (string) $body['confirm_password'], $errors);
        }

        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $this->findUserOr404($id);

        $this->userModel->updatePassword($id, hashPassword((string) $body['new_password']));

        // Anyone signed in with the old password is signed out.
        $sessionsEnded = $this->sessionModel->revokeAllForUser($id);

        $this->reportModel->logActivity($admin['sub'], 'user', $id, 'password_reset', '');

        sendSuccess(['sessions_ended' => $sessionsEnded], 'Password reset successfully.');
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/dashboard
     * Totals, 12 months of transactions, most requested genres, and recent activity.
     */
    public function dashboard(): void {
        requireAuth(ROLE_ADMIN);

        sendSuccess([
            'totals'                => $this->reportModel->getStatusTotals(),
            'monthly_transactions'  => $this->reportModel->getMonthlyTransactions(12),
            'most_requested_genres' => $this->reportModel->getTopGenres(date('Y-m-d', strtotime('-12 months')), date('Y-m-d'), 5),
            'recent_activity'       => $this->reportModel->getRecentActivity(10),
        ], 'Dashboard data retrieved.');
    }

    // ── Reporting ─────────────────────────────────────────────────────────────

    /**
     * GET /api/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Listings posted, requests sent, exchanges completed, cancellations, cancellation rate.
     * The range defaults to the last REPORT_DEFAULT_DAYS days.
     */
    public function reportSummary(): void {
        requireAuth(ROLE_ADMIN);
        [$from, $to] = readReportRange();

        sendSuccess(['from' => $from, 'to' => $to] + $this->reportModel->getSummary($from, $to), 'Summary report generated.');
    }

    /**
     * GET /api/admin/reports/genres?from=&to=&limit=10
     * The most requested genres within the range.
     */
    public function reportTopGenres(): void {
        requireAuth(ROLE_ADMIN);
        [$from, $to] = readReportRange();

        $errors = [];
        $limit  = readPositiveInt($_GET, 'limit', $errors) ?? 10;
        if (!isset($errors['limit']) && $limit > PAGE_SIZE_MAX) {
            $errors['limit'] = 'limit must be between 1 and ' . PAGE_SIZE_MAX . '.';
        }
        if (!empty($errors)) {
            sendError('Invalid query parameters.', 422, $errors);
        }

        sendSuccess(
            ['from' => $from, 'to' => $to, 'rows' => $this->reportModel->getTopGenres($from, $to, $limit)],
            'Top genres report generated.'
        );
    }

    /**
     * GET /api/admin/reports/cities?from=&to=
     * Participation by city.
     */
    public function reportByCity(): void {
        requireAuth(ROLE_ADMIN);
        [$from, $to] = readReportRange();

        sendSuccess(
            ['from' => $from, 'to' => $to, 'rows' => $this->reportModel->getParticipationByCity($from, $to)],
            'City participation report generated.'
        );
    }

    /**
     * GET /api/admin/reports/age-groups?from=&to=
     * Participation by age group (the age category of exchanged books).
     */
    public function reportByAgeGroup(): void {
        requireAuth(ROLE_ADMIN);
        [$from, $to] = readReportRange();

        sendSuccess(
            ['from' => $from, 'to' => $to, 'rows' => $this->reportModel->getParticipationByAgeGroup($from, $to)],
            'Age group participation report generated.'
        );
    }

    /**
     * GET /api/admin/activity-log
     * Query: record_type, record_id, action, keyword, date_from, date_to, sort (newest|oldest), page, per_page
     */
    public function activityLog(): void {
        requireAuth(ROLE_ADMIN);

        $query = readListQuery(['newest', 'oldest'], 'newest');

        $errors     = [];
        $recordType = $_GET['record_type'] ?? '';
        if ($recordType !== '') {
            validateInList('record_type', $recordType, self::ACTIVITY_RECORD_TYPES, $errors);
        }
        $recordId = readPositiveInt($_GET, 'record_id', $errors);
        $action   = sanitizeString($_GET['action'] ?? '');
        validateMaxLength('action', $action, 60, $errors);

        if (!empty($errors)) {
            sendError('Invalid query parameters.', 422, $errors);
        }

        $page = $this->reportModel->searchActivityLog(
            $query,
            $recordType !== '' ? $recordType : null,
            $recordId,
            $action !== '' ? $action : null
        );

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Activity log retrieved.');
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * @param int $id
     * @return array The user row.
     */
    private function findUserOr404(int $id): array {
        $user = $this->userModel->findById($id);
        if ($user === null) {
            sendNotFound('User not found.');
        }
        return $user;
    }
}
