<?php

/**
 * UserController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles a member's own profile, dashboard, notifications, account, and reports.
 *
 * Endpoints (defined in routes/api.php):
 *   GET  /api/user/profile                  → getProfile()
 *   PUT  /api/user/profile                  → updateProfile()
 *   GET  /api/user/dashboard                → dashboard()
 *   PUT  /api/user/deactivate               → deactivateAccount()
 *   GET  /api/user/notifications            → getNotifications()
 *   PUT  /api/user/notifications/{id}/read  → markNotificationRead()
 *   PUT  /api/user/notifications/read-all   → markAllNotificationsRead()
 *   POST /api/reports                       → fileReport()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/SessionModel.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/CategoryModel.php';
require_once __DIR__ . '/../models/IncidentReportModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class UserController {

    // Each report type is about one kind of record (Phase 1 §3.2.5 and §3.2.2).
    private const REPORT_SUBJECTS = [
        REPORT_MISDESCRIBED  => 'transaction_id',
        REPORT_NO_SHOW       => 'transaction_id',
        REPORT_INAPPROPRIATE => 'listing_id',
        REPORT_SPAM_REQUEST  => 'request_id',
    ];

    private UserModel           $userModel;
    private SessionModel        $sessionModel;
    private ListingModel        $listingModel;
    private ExchangeModel       $exchangeModel;
    private TransactionModel    $transactionModel;
    private NotificationModel   $notificationModel;
    private CategoryModel       $categoryModel;
    private IncidentReportModel $incidentReportModel;
    private ReportModel         $reportModel;

    public function __construct() {
        $this->userModel           = new UserModel();
        $this->sessionModel        = new SessionModel();
        $this->listingModel        = new ListingModel();
        $this->exchangeModel       = new ExchangeModel();
        $this->transactionModel    = new TransactionModel();
        $this->notificationModel   = new NotificationModel();
        $this->categoryModel       = new CategoryModel();
        $this->incidentReportModel = new IncidentReportModel();
        $this->reportModel         = new ReportModel();
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    /**
     * GET /api/user/profile
     * The signed-in user's profile, with favourite genres as a list of IDs and
     * their completed-exchange count.
     */
    public function getProfile(): void {
        $authUser = requireAuth();

        $user = $this->userModel->findById($authUser['sub']);
        if ($user === null) {
            sendNotFound('User not found.');
        }

        sendSuccess($this->formatProfile($user), 'Profile retrieved.');
    }

    /**
     * PUT /api/user/profile
     * Update the signed-in user's own fields. Only fields present in the body change.
     * Accepts: { name?, phone?, city?, favorite_genres?: int[] }
     */
    public function updateProfile(): void {
        $authUser = requireAuth();

        $user = $this->userModel->findById($authUser['sub']);
        if ($user === null) {
            sendNotFound('User not found.');
        }

        $body   = getRequestBody();
        $errors = [];

        $name  = array_key_exists('name', $body)  ? sanitizeString($body['name'])  : $user['name'];
        $phone = array_key_exists('phone', $body) ? sanitizeString($body['phone']) : (string) $user['phone'];
        $city  = array_key_exists('city', $body)  ? sanitizeString($body['city'])  : (string) $user['city'];

        if ($name === '') {
            $errors['name'] = 'name is required.';
        }
        validateMaxLength('name', $name, 100, $errors);
        validatePhone('phone', $phone, $errors);
        validateMaxLength('city', $city, 100, $errors);

        $favoriteGenres = $user['favorite_genres'];
        if (array_key_exists('favorite_genres', $body)) {
            $favoriteGenres = $this->readFavoriteGenres($body['favorite_genres'], $errors);
        }

        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $this->userModel->updateProfile($authUser['sub'], [
            'name'            => $name,
            'phone'           => $phone,
            'city'            => $city,
            'favorite_genres' => $favoriteGenres,
        ]);

        sendSuccess($this->formatProfile($this->userModel->findById($authUser['sub'])), 'Profile updated successfully.');
    }

    /**
     * GET /api/user/dashboard
     * Phase 1 §3.3.6: listings, sent and received requests, and transactions
     * in one place.
     */
    public function dashboard(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $user = $this->userModel->findById($userId);

        sendSuccess([
            'completed_exchanges' => (int) $user['completed_exchanges'],
            'listings'            => $this->listingModel->getByUserId($userId),
            'sent_requests'       => $this->exchangeModel->getByRequester($userId),
            'incoming_requests'   => $this->exchangeModel->getIncomingForOwner($userId),
            'transactions'        => $this->transactionModel->getByUserId($userId),
        ], 'Dashboard data retrieved.');
    }

    // ── Account ───────────────────────────────────────────────────────────────

    /**
     * PUT /api/user/deactivate
     * A member deactivates their own account (Phase 1 §4.3).
     * Accepts: { password }
     *
     * Refused while an exchange is accepted or scheduled. Otherwise the
     * member's listings leave the catalog, their pending requests are closed,
     * and every session ends.
     */
    public function deactivateAccount(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['password'], $body, $errors);
        if (!empty($errors)) {
            sendError('Your password is required to deactivate your account.', 422, $errors);
        }

        $user = $this->userModel->findById($userId);
        if (!verifyPassword((string) $body['password'], $user['password_hash'])) {
            sendError('Password is incorrect.', 422, ['password' => 'Password is incorrect.']);
        }

        if ($this->userModel->hasActiveTransaction($userId)) {
            sendError('You cannot deactivate your account while one of your exchanges is accepted or scheduled.', 409);
        }

        $declined = withTransaction(function () use ($userId) {
            $declined = [];
            foreach ($this->listingModel->getWithdrawableIdsForOwner($userId) as $listingId) {
                $declined = array_merge(
                    $declined,
                    $this->exchangeModel->closePendingForListing($listingId, 'The owner deactivated their account.')
                );
                $this->listingModel->withdraw($listingId);
            }
            $this->exchangeModel->withdrawPendingByRequester($userId);
            $this->userModel->updateStatus($userId, ACCOUNT_INACTIVE);
            $this->sessionModel->revokeAllForUser($userId);
            $this->reportModel->logActivity($userId, 'user', $userId, 'self_deactivated', '');
            return $declined;
        });

        foreach ($declined as $request) {
            $this->notificationModel->create(
                (int) $request['requester_id'],
                'request_declined',
                "Your exchange request for \"{$request['target_title']}\" was closed because the owner deactivated their account.",
                'request',
                (int) $request['id']
            );
        }

        sendSuccess(null, 'Your account has been deactivated and you have been signed out.');
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    /**
     * GET /api/user/notifications
     * Unread notifications. Add ?all=1 for the full history.
     */
    public function getNotifications(): void {
        $authUser = requireAuth();

        $notifications = ($_GET['all'] ?? '0') === '1'
            ? $this->notificationModel->getAll($authUser['sub'])
            : $this->notificationModel->getUnread($authUser['sub']);

        sendSuccess($notifications, 'Notifications retrieved.');
    }

    /**
     * PUT /api/user/notifications/{id}/read
     *
     * @param int $id Notification primary key.
     */
    public function markNotificationRead(int $id): void {
        $authUser = requireAuth();

        if (!$this->notificationModel->markRead($id, $authUser['sub'])) {
            sendNotFound('Notification not found or already read.');
        }

        sendSuccess(null, 'Notification marked as read.');
    }

    /**
     * PUT /api/user/notifications/read-all
     */
    public function markAllNotificationsRead(): void {
        $authUser = requireAuth();
        $count    = $this->notificationModel->markAllRead($authUser['sub']);
        sendSuccess(['marked' => $count], 'All notifications marked as read.');
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    /**
     * POST /api/reports
     * A member reports a problem (Phase 1 §3.2.5, §3.3.6).
     * Accepts: { report_type, description, transaction_id | listing_id | request_id }
     *
     *   misdescribed_condition, no_show → transaction_id (a member of that exchange)
     *   inappropriate_listing           → listing_id     (not your own listing)
     *   spam_request                    → request_id     (a request you received)
     */
    public function fileReport(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['report_type', 'description'], $body, $errors);
        if (empty($errors)) {
            validateInList('report_type', $body['report_type'], array_keys(self::REPORT_SUBJECTS), $errors);
        }
        $description = sanitizeString($body['description'] ?? '');
        validateMaxLength('description', $description, 2000, $errors);
        if (!isset($errors['description']) && $description === '') {
            $errors['description'] = 'description is required.';
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $type          = $body['report_type'];
        $subjectColumn = self::REPORT_SUBJECTS[$type];
        $subjectId     = readPositiveInt($body, $subjectColumn, $errors);
        if ($subjectId === null && !isset($errors[$subjectColumn])) {
            $errors[$subjectColumn] = "$subjectColumn is required for a $type report.";
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $subjectLabel = $this->checkReportSubject($type, $subjectId, $userId);

        if ($this->incidentReportModel->hasOpenReport($userId, $type, $subjectColumn, $subjectId)) {
            sendError('You already have an open report about this.', 409);
        }

        $reportId = withTransaction(function () use ($userId, $type, $subjectColumn, $subjectId, $description) {
            $reportId = $this->incidentReportModel->create([
                'reporter_id'    => $userId,
                'transaction_id' => $subjectColumn === 'transaction_id' ? $subjectId : null,
                'listing_id'     => $subjectColumn === 'listing_id' ? $subjectId : null,
                'request_id'     => $subjectColumn === 'request_id' ? $subjectId : null,
                'handled_by'     => null,
                'report_type'    => $type,
                'description'    => $description,
                'resolution'     => null,
                'status'         => REPORT_OPEN,
            ]);
            $this->reportModel->logActivity($userId, 'report', $reportId, 'filed', $type);
            return $reportId;
        });

        $this->notificationModel->notifyMany(
            $this->userModel->getActiveIdsByRole(ROLE_STAFF),
            'report_filed',
            "A new $type report was filed about $subjectLabel.",
            'report',
            $reportId
        );

        sendSuccess(['report_id' => $reportId], 'Report filed. A moderator will review it.', 201);
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * Shape a user row for the client: no password hash, favourite genres as
     * a list of integers, the completed count as an integer.
     *
     * @param array $user
     * @return array
     */
    private function formatProfile(array $user): array {
        unset($user['password_hash']);
        $user['favorite_genres']     = $user['favorite_genres'] ? array_map('intval', explode(',', $user['favorite_genres'])) : [];
        $user['completed_exchanges'] = (int) $user['completed_exchanges'];
        return $user;
    }

    /**
     * Validate favorite_genres: a list of up to 10 active genre IDs.
     *
     * @param mixed $value
     * @param array &$errors
     * @return string|null The IDs as the CSV stored in users.favorite_genres.
     */
    private function readFavoriteGenres($value, array &$errors): ?string {
        if (!is_array($value) || count($value) > 10) {
            $errors['favorite_genres'] = 'favorite_genres must be a list of up to 10 genre IDs.';
            return null;
        }

        $ids = [];
        foreach ($value as $genreId) {
            if (!is_int($genreId) || $genreId <= 0 || !$this->categoryModel->isActiveTaxonomy('genre', $genreId)) {
                $errors['favorite_genres'] = 'favorite_genres contains an unknown or retired genre.';
                return null;
            }
            $ids[$genreId] = $genreId;
        }

        sort($ids);
        return $ids ? implode(',', $ids) : null;
    }

    /**
     * Confirm the member may report this record, stopping the request if not.
     *
     * @param string $type
     * @param int    $subjectId
     * @param int    $userId
     * @return string Short label for the staff notification.
     */
    private function checkReportSubject(string $type, int $subjectId, int $userId): string {
        if ($type === REPORT_INAPPROPRIATE) {
            $listing = $this->listingModel->findById($subjectId);
            if ($listing === null || $listing['status'] === LISTING_WITHDRAWN) {
                sendNotFound('Listing not found.');
            }
            if ((int) $listing['user_id'] === $userId) {
                sendError('You cannot report your own listing.', 422);
            }
            return "listing \"{$listing['title']}\"";
        }

        if ($type === REPORT_SPAM_REQUEST) {
            $request = $this->exchangeModel->findById($subjectId);
            if ($request === null) {
                sendNotFound('Exchange request not found.');
            }
            if ((int) $request['target_owner_id'] !== $userId) {
                sendForbidden('Only the member who received a request can report it.');
            }
            return "exchange request #$subjectId";
        }

        $tx = $this->transactionModel->findById($subjectId);
        if ($tx === null) {
            sendNotFound('Transaction not found.');
        }
        if (!in_array($userId, [(int) $tx['owner_id'], (int) $tx['requester_id']], true)) {
            sendForbidden('Only members of this exchange can report it.');
        }
        if ($tx['status'] === TX_ACCEPTED) {
            sendError('An exchange can be reported once its handover has been scheduled.', 409);
        }
        return "transaction #$subjectId";
    }
}
