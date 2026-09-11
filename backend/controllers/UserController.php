<?php

/**
 * UserController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Customer (Reader) profile and dashboard actions.
 *
 * Endpoints (defined in routes/api.php):
 *   GET  /api/user/profile           → getProfile()
 *   PUT  /api/user/profile           → updateProfile()
 *   GET  /api/user/dashboard         → dashboard()
 *   GET  /api/user/notifications     → getNotifications()
 *   PUT  /api/user/notifications/{id}/read → markNotificationRead()
 *   PUT  /api/user/notifications/read-all  → markAllNotificationsRead()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class UserController {

    private UserModel         $userModel;
    private ListingModel      $listingModel;
    private ExchangeModel     $exchangeModel;
    private TransactionModel  $transactionModel;
    private NotificationModel $notificationModel;

    public function __construct() {
        $this->userModel         = new UserModel();
        $this->listingModel      = new ListingModel();
        $this->exchangeModel     = new ExchangeModel();
        $this->transactionModel  = new TransactionModel();
        $this->notificationModel = new NotificationModel();
    }

    /**
     * GET /api/user/profile
     * Returns the currently authenticated user's profile.
     */
    public function getProfile(): void {
        $authUser = requireAuth();

        $user = $this->userModel->findById($authUser['sub']);
        if ($user === null) sendNotFound('User not found.');

        // Never expose the password hash to the client.
        unset($user['password_hash']);

        sendSuccess($user, 'Profile retrieved.');
    }

    /**
     * PUT /api/user/profile
     * Update the authenticated user's editable fields.
     * Accepts: { name?, phone?, city?, favorite_genres? }
     */
    public function updateProfile(): void {
        $authUser = requireAuth();

        $body   = getRequestBody();
        $errors = [];

        if (!empty($body['name'])) {
            validateMaxLength('name', $body['name'], 100, $errors);
        }

        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        $success = $this->userModel->updateProfile($authUser['sub'], [
            'name'             => sanitizeString($body['name']  ?? ''),
            'phone'            => sanitizeString($body['phone'] ?? ''),
            'city'             => sanitizeString($body['city']  ?? ''),
            'favorite_genres'  => $body['favorite_genres'] ?? null,
        ]);

        if (!$success) sendError('Failed to update profile.', 500);

        sendSuccess(null, 'Profile updated successfully.');
    }

    /**
     * GET /api/user/dashboard
     * Returns all data for the Customer's personal dashboard:
     *   - their listings
     *   - sent exchange requests
     *   - received exchange requests (on their listings)
     *   - their transactions
     */
    public function dashboard(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $listings     = $this->listingModel->getByUserId($userId);
        $sentRequests = $this->exchangeModel->getByRequester($userId);
        $transactions = $this->transactionModel->getByUserId($userId);

        // Collect incoming requests across all of the user's listings.
        $incomingRequests = [];
        foreach ($listings as $listing) {
            $incoming         = $this->exchangeModel->getByTargetListing((int) $listing['id']);
            $incomingRequests = array_merge($incomingRequests, $incoming);
        }

        sendSuccess([
            'listings'          => $listings,
            'sent_requests'     => $sentRequests,
            'incoming_requests' => $incomingRequests,
            'transactions'      => $transactions,
        ], 'Dashboard data retrieved.');
    }

    /**
     * GET /api/user/notifications
     * Returns unread notifications for the authenticated user.
     * Add ?all=1 to retrieve the full notification history.
     */
    public function getNotifications(): void {
        $authUser = requireAuth();
        $userId   = $authUser['sub'];

        $all           = ($_GET['all'] ?? '0') === '1';
        $notifications = $all
            ? $this->notificationModel->getAll($userId)
            : $this->notificationModel->getUnread($userId);

        sendSuccess($notifications, 'Notifications retrieved.');
    }

    /**
     * PUT /api/user/notifications/{id}/read
     * Mark a single notification as read.
     *
     * @param int $id Notification primary key.
     */
    public function markNotificationRead(int $id): void {
        $authUser = requireAuth();

        $success = $this->notificationModel->markRead($id, $authUser['sub']);
        if (!$success) sendNotFound('Notification not found or already read.');

        sendSuccess(null, 'Notification marked as read.');
    }

    /**
     * PUT /api/user/notifications/read-all
     * Mark all of the user's unread notifications as read.
     */
    public function markAllNotificationsRead(): void {
        $authUser = requireAuth();
        $this->notificationModel->markAllRead($authUser['sub']);
        sendSuccess(null, 'All notifications marked as read.');
    }
}
