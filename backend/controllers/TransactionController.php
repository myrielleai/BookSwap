<?php

/**
 * TransactionController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Member-facing transaction actions: viewing an exchange and confirming receipt.
 *
 * Phase 1 §4.2: members cannot change a transaction's state. Confirming
 * receipt only records their side; a moderator then records completion
 * (StaffController::updateTransactionStatus). Reports about an exchange are
 * filed through POST /api/reports.
 *
 * Endpoints (defined in routes/api.php):
 *   GET /api/transactions/{id}           → show()
 *   PUT /api/transactions/{id}/confirm   → confirmReceipt()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/database.php';
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
     * Full detail of an exchange. Only its two members or Staff/Admin may view.
     *
     * Contact numbers follow Phase 1 §4.2 and §4.3: each member sees only the
     * other member's number (the request has been accepted, or no transaction
     * would exist). A moderator sees numbers only for exchanges they handle;
     * Administrators always do.
     *
     * @param int $id
     */
    public function show(int $id): void {
        $authUser = requireAuth();

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) {
            sendNotFound('Transaction not found.');
        }

        $isOwner     = $authUser['sub'] === (int) $tx['owner_id'];
        $isRequester = $authUser['sub'] === (int) $tx['requester_id'];
        $isStaff     = in_array($authUser['role'], [ROLE_STAFF, ROLE_ADMIN], true);

        if (!$isOwner && !$isRequester && !$isStaff) {
            sendForbidden('You are not authorized to view this transaction.');
        }

        if ($isOwner || $isRequester) {
            $tx['your_role']   = $isOwner ? 'owner' : 'requester';
            $tx['counterpart'] = $isOwner
                ? ['name' => $tx['requester_name'], 'phone' => $tx['requester_phone']]
                : ['name' => $tx['owner_name'], 'phone' => $tx['owner_phone']];
            unset($tx['requester_phone'], $tx['owner_phone']);
        } elseif ($authUser['role'] !== ROLE_ADMIN && (int) $tx['handled_by'] !== $authUser['sub']) {
            unset($tx['requester_phone'], $tx['owner_phone']);
        }

        sendSuccess($tx, 'Transaction retrieved.');
    }

    /**
     * PUT /api/transactions/{id}/confirm
     * A member confirms they received their book after the handover.
     * When both have confirmed, the handling moderator is told the exchange is
     * ready to be recorded as completed.
     *
     * @param int $id
     */
    public function confirmReceipt(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) {
            sendNotFound('Transaction not found.');
        }

        $isOwner = $userId === (int) $tx['owner_id'];
        if (!$isOwner && $userId !== (int) $tx['requester_id']) {
            sendForbidden('You are not a participant in this transaction.');
        }
        if ($tx['status'] !== TX_SCHEDULED) {
            sendError('Receipt can only be confirmed for a scheduled handover.', 409);
        }
        if ((int) $tx[$isOwner ? 'owner_confirmed' : 'requester_confirmed'] === 1) {
            sendError('You have already confirmed receipt for this exchange.', 409);
        }

        withTransaction(function () use ($id, $isOwner, $userId) {
            $this->transactionModel->confirmReceipt($id, $isOwner);
            $this->reportModel->logActivity($userId, 'transaction', $id, 'receipt_confirmed', $isOwner ? 'owner' : 'requester');
        });

        $requesterConfirmed = $isOwner ? (int) $tx['requester_confirmed'] === 1 : true;
        $ownerConfirmed     = $isOwner ? true : (int) $tx['owner_confirmed'] === 1;
        $bothConfirmed      = $requesterConfirmed && $ownerConfirmed;

        if ($bothConfirmed) {
            $staffIds = $tx['handled_by'] !== null
                ? [(int) $tx['handled_by']]
                : $this->userModel->getActiveIdsByRole(ROLE_STAFF);

            $this->notificationModel->notifyMany(
                $staffIds,
                'exchange_ready_to_complete',
                "Both members confirmed receipt for transaction #$id. It is ready to be marked completed.",
                'transaction',
                $id
            );
        }

        sendSuccess(
            ['requester_confirmed' => $requesterConfirmed, 'owner_confirmed' => $ownerConfirmed],
            $bothConfirmed
                ? 'Receipt confirmed. Both members have confirmed; a moderator will record the exchange as completed.'
                : 'Receipt confirmed. Waiting for the other member to confirm.'
        );
    }
}
