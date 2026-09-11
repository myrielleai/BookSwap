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
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class TransactionController {

    private TransactionModel  $transactionModel;
    private UserModel         $userModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;

    public function __construct() {
        $this->transactionModel  = new TransactionModel();
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
            // TODO: Verify that $authUser['sub'] is one of the two parties
            //       by checking the exchange_request's requester_id and target listing owner.
            //       If not a party, call sendForbidden().
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
        $userId   = $authUser['sub'];

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');
        if ($tx['status'] !== TX_SCHEDULED) {
            sendError('Receipt can only be confirmed for transactions in Scheduled status.', 409);
        }

        // TODO: Determine if the confirming user is Party A (listing owner) or Party B (requester).
        // Fetch the exchange_request to compare requester_id and target listing's user_id.
        // $isPartyA = ($userId === $targetListingOwnerId);
        $isPartyA = true; // stub — replace with real check

        $this->transactionModel->confirmReceipt($id, $isPartyA);

        // If both parties have now confirmed, complete the transaction.
        if ($this->transactionModel->bothPartiesConfirmed($id)) {
            $this->transactionModel->updateStatus($id, TX_COMPLETED);

            // Increment the exchange count on both users' profiles.
            // TODO: Fetch both user IDs from the exchange_request record.
            // $this->userModel->incrementExchangeCount($requesterId);
            // $this->userModel->incrementExchangeCount($ownerId);

            // Notify both parties of completion.
            $this->notificationModel->create(
                $userId,
                'exchange_completed',
                'Your exchange has been marked as completed. Thank you for using BookSwap!',
                'transaction',
                $id
            );

            $this->reportModel->logActivity($userId, 'transaction', $id, 'completed', 'Both parties confirmed.');
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

        // TODO (DB): Optionally create a dedicated `disputes` table and insert here.

        // Notify all Staff members that a dispute was filed.
        // TODO: Query for all active Staff user IDs and notify each one.
        // foreach ($staffUsers as $staff) {
        //     $this->notificationModel->create(
        //         $staff['id'],
        //         'dispute_filed',
        //         "A dispute was filed on transaction #$id. Reason: $reason",
        //         'transaction',
        //         $id
        //     );
        // }

        sendSuccess(null, 'Dispute filed. A moderator will review it and contact you.');
    }
}
