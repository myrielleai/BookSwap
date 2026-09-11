<?php

/**
 * TransactionController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Customer-facing transaction actions (receipt confirmation and dispute filing).
 * Staff actions (status changes, scheduling) are in StaffController.
 *
 * Endpoints (defined in routes/api.php):
 *   GET /api/transactions/{id}           → show()
 *   PUT /api/transactions/{id}/confirm   → confirmReceipt()
 *   POST /api/transactions/{id}/dispute  → fileDispute()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class TransactionController {

    private TransactionModel  $transactionModel;
    private ExchangeModel     $exchangeModel;
    private ListingModel      $listingModel;
    private UserModel         $userModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;

    public function __construct() {
        $this->transactionModel  = new TransactionModel();
        $this->exchangeModel     = new ExchangeModel();
        $this->listingModel      = new ListingModel();
        $this->userModel         = new UserModel();
        $this->notificationModel = new NotificationModel();
        $this->reportModel       = new ReportModel();
    }

    /**
     * GET /api/transactions/{id}
     * Return full detail of a transaction.
     * Only parties in the transaction or Staff/Admin may view.
     *
     * @param int $id
     */
    public function show(int $id): void {
        $authUser = requireAuth();

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');

        // Permission check: Staff/Admin see all; Customers see only their own.
        if ($authUser['role'] === ROLE_CUSTOMER) {
            $exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
            $targetListing = $exchangeReq ? $this->listingModel->findById((int) $exchangeReq['target_listing_id']) : null;
            $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($exchangeReq['target_owner_id'] ?? 0);
            $requesterId = $exchangeReq ? (int) $exchangeReq['requester_id'] : 0;

            if ($authUser['sub'] !== $ownerId && $authUser['sub'] !== $requesterId) {
                sendForbidden('You are not authorized to view this transaction.');
            }
        }

        sendSuccess($tx, 'Transaction retrieved.');
    }

    /**
     * PUT /api/transactions/{id}/confirm
     * Customer confirms receipt of the book after the physical handover.
     * When both parties confirm, the transaction is marked TX_COMPLETED and
     * the exchange counts on both user profiles are incremented.
     *
     * @param int $id
     */
    public function confirmReceipt(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = (int) $authUser['sub'];

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');
        if ($tx['status'] !== TX_SCHEDULED) {
            sendError('Receipt can only be confirmed for transactions in Scheduled status.', 409);
        }

        $exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
        if (!$exchangeReq) sendNotFound('Exchange request associated with transaction not found.');

        $targetListing = $this->listingModel->findById((int) $exchangeReq['target_listing_id']);
        $ownerId       = $targetListing ? (int) $targetListing['user_id'] : (int) ($exchangeReq['target_owner_id'] ?? 0);
        $requesterId   = (int) $exchangeReq['requester_id'];

        if ($userId !== $ownerId && $userId !== $requesterId) {
            sendForbidden('You are not a participant in this transaction.');
        }

        // Party A = target listing owner; Party B = requester
        $isPartyA = ($userId === $ownerId);

        $this->transactionModel->confirmReceipt($id, $isPartyA);

        // If both parties have now confirmed, complete the transaction.
        if ($this->transactionModel->bothPartiesConfirmed($id)) {
            $this->transactionModel->updateStatus($id, TX_COMPLETED);

            // Increment the exchange count on both users' profiles.
            $this->userModel->incrementExchangeCount($requesterId);
            $this->userModel->incrementExchangeCount($ownerId);

            // Mark both listings as completed/archived or exchanged
            $this->listingModel->updateStatus((int) $exchangeReq['target_listing_id'], LISTING_ARCHIVED);
            $this->listingModel->updateStatus((int) $exchangeReq['offered_listing_id'], LISTING_ARCHIVED);

            // Notify both parties of completion.
            $this->notificationModel->create(
                $requesterId,
                'exchange_completed',
                'Your book exchange has been completed successfully! Thank you for using BookSwap.',
                'transaction',
                $id
            );
            $this->notificationModel->create(
                $ownerId,
                'exchange_completed',
                'Your book exchange has been completed successfully! Thank you for using BookSwap.',
                'transaction',
                $id
            );

            $this->reportModel->logActivity($userId, 'transaction', $id, 'completed', 'Both parties confirmed receipt.');
        }

        sendSuccess(null, 'Receipt confirmed. Waiting for the other party to confirm.');
    }

    /**
     * POST /api/transactions/{id}/dispute
     * Customer files a dispute (misdescribed condition, no-show, etc.).
     * Accepts: { reason, details }
     * The dispute is logged and visible to Staff for resolution.
     *
     * @param int $id
     */
    public function fileDispute(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['reason', 'details'], $body, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');

        // A dispute can be filed on a Scheduled or Completed transaction.
        $disputableStatuses = [TX_SCHEDULED, TX_COMPLETED];
        if (!in_array($tx['status'], $disputableStatuses, true)) {
            sendError('A dispute cannot be filed on this transaction in its current state.', 409);
        }

        $reason  = sanitizeString($body['reason']);
        $details = sanitizeString($body['details']);

        // Log the dispute in the activity log so Staff can find and resolve it.
        $this->reportModel->logActivity(
            $authUser['sub'],
            'transaction',
            $id,
            'dispute_filed',
            "Reason: $reason | Details: $details"
        );

        // Notify all active Staff and Admin members that a dispute was filed.
        $staffUsers = $this->userModel->getAll(ACCOUNT_ACTIVE, ROLE_STAFF);
        foreach ($staffUsers as $staff) {
            $this->notificationModel->create(
                (int) $staff['id'],
                'dispute_filed',
                "A dispute was filed on transaction #$id. Reason: $reason",
                'transaction',
                $id
            );
        }

        sendSuccess(null, 'Dispute filed. A moderator will review it and contact you.');
    }
}
