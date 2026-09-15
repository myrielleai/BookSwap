<?php

/**
 * ExchangeController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the member side of the exchange request workflow.
 *
 * Phase 1 §3.3.4–§3.3.5 and §4.4: a member sends a request offering one of
 * their own verified books; the owner of the requested book accepts or
 * declines it. Staff are not involved in that decision.
 *
 * Endpoints (defined in routes/api.php):
 *   POST /api/exchanges                  → sendRequest()
 *   GET  /api/exchanges/{id}             → show()
 *   PUT  /api/exchanges/{id}/accept      → acceptRequest()
 *   PUT  /api/exchanges/{id}/decline     → declineRequest()
 *   PUT  /api/exchanges/{id}/withdraw    → withdrawRequest()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class ExchangeController {

    private ExchangeModel     $exchangeModel;
    private ListingModel      $listingModel;
    private TransactionModel  $transactionModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;
    private UserModel         $userModel;

    public function __construct() {
        $this->exchangeModel     = new ExchangeModel();
        $this->listingModel      = new ListingModel();
        $this->transactionModel  = new TransactionModel();
        $this->notificationModel = new NotificationModel();
        $this->reportModel       = new ReportModel();
        $this->userModel         = new UserModel();
    }

    /**
     * POST /api/exchanges
     * A member sends an exchange request on a listing.
     * Accepts: { target_listing_id, offered_listing_id, message? }
     *
     * Business rules enforced here:
     *   - Both listings must be in LISTING_AVAILABLE status.
     *   - The requester must own the offered listing.
     *   - A member cannot request their own listing.
     *   - At most one active (pending or accepted) request per target listing.
     */
    public function sendRequest(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $body   = getRequestBody();
        $errors = [];
        $targetId  = readPositiveInt($body, 'target_listing_id', $errors);
        $offeredId = readPositiveInt($body, 'offered_listing_id', $errors);
        foreach (['target_listing_id' => $targetId, 'offered_listing_id' => $offeredId] as $field => $value) {
            if ($value === null && !isset($errors[$field])) {
                $errors[$field] = "$field is required.";
            }
        }
        $message = sanitizeString($body['message'] ?? '');
        validateMaxLength('message', $message, 500, $errors);
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }
        if ($targetId === $offeredId) {
            sendError('The offered book must be different from the requested book.', 422);
        }

        // Cannot request your own listing.
        $targetListing = $this->listingModel->findById($targetId);
        if ($targetListing === null) {
            sendNotFound('Target listing not found.');
        }
        if ((int) $targetListing['user_id'] === $userId) {
            sendError('You cannot send an exchange request on your own listing.', 422);
        }
        if ($targetListing['status'] !== LISTING_AVAILABLE) {
            sendError('The selected listing is not currently available for exchange.', 409);
        }

        // Offered listing must belong to the requester and be available.
        $offeredListing = $this->listingModel->findById($offeredId);
        if ($offeredListing === null) {
            sendNotFound('Offered listing not found.');
        }
        if ((int) $offeredListing['user_id'] !== $userId) {
            sendForbidden('You may only offer your own listings.');
        }
        if ($offeredListing['status'] !== LISTING_AVAILABLE) {
            sendError('Your offered listing is not available (it may already be part of an active exchange).', 409);
        }

        if ($this->exchangeModel->hasActiveRequest($userId, $targetId)) {
            sendError('You already have an active request on this listing.', 409);
        }

        $requestId = withTransaction(function () use ($userId, $targetId, $offeredId, $message) {
            $requestId = $this->exchangeModel->create([
                'requester_id'       => $userId,
                'target_listing_id'  => $targetId,
                'offered_listing_id' => $offeredId,
                'message'            => $message,
            ]);
            $this->reportModel->logActivity($userId, 'request', $requestId, 'submitted', '');
            return $requestId;
        });

        $this->notificationModel->create(
            (int) $targetListing['user_id'],
            'new_exchange_request',
            "Someone wants to exchange \"{$offeredListing['title']}\" for your listing \"{$targetListing['title']}\".",
            'request',
            $requestId
        );

        sendSuccess(['request_id' => $requestId], 'Exchange request sent to the listing owner.', 201);
    }

    /**
     * GET /api/exchanges/{id}
     * Only the requester, the listing owner, or Staff/Admin may view.
     *
     * @param int $id
     */
    public function show(int $id): void {
        $authUser = requireAuth();

        $request = $this->findRequestOr404($id);

        $isParty = in_array($authUser['sub'], [(int) $request['requester_id'], (int) $request['target_owner_id']], true);
        $isStaff = in_array($authUser['role'], [ROLE_STAFF, ROLE_ADMIN], true);

        if (!$isParty && !$isStaff) {
            sendForbidden('You do not have permission to view this request.');
        }

        sendSuccess($request, 'Exchange request retrieved.');
    }

    /**
     * PUT /api/exchanges/{id}/accept
     * The listing owner accepts a pending request.
     *
     * In one database transaction (Phase 1 §3.2.3, §3.3.5):
     *   1. both books are locked, and only if both are still available;
     *   2. the request is marked accepted;
     *   3. the transaction is opened in the Accepted state;
     *   4. every other pending request involving either book is declined.
     * If any step fails, none of it is saved.
     *
     * @param int $id
     */
    public function acceptRequest(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $request = $this->findRequestOr404($id);

        if ((int) $request['target_owner_id'] !== $authUser['sub']) {
            sendForbidden('Only the listing owner can accept this exchange request.');
        }
        if ($request['status'] !== REQUEST_PENDING) {
            sendError('This request is no longer pending.', 409);
        }

        $bookIds = [(int) $request['target_listing_id'], (int) $request['offered_listing_id']];

        $result = withTransaction(function () use ($id, $bookIds, $authUser) {
            if (!$this->exchangeModel->markAccepted($id)) {
                throw new ApiException('This request is no longer pending.', 409);
            }
            if ($this->listingModel->lockAvailable($bookIds) !== count($bookIds)) {
                throw new ApiException('Both books must still be available to accept this exchange.', 409);
            }

            $transactionId = $this->transactionModel->create($id);

            $declined = $this->exchangeModel->declineCompeting(
                $id,
                $bookIds,
                'Automatically declined: one of these books was accepted in another exchange.'
            );

            $this->reportModel->logActivity($authUser['sub'], 'request', $id, 'accepted', "Transaction #$transactionId opened");

            return ['transaction_id' => $transactionId, 'declined' => $declined];
        });

        $this->notificationModel->create(
            (int) $request['requester_id'],
            'request_accepted',
            "Your exchange request for \"{$request['target_title']}\" was accepted. A moderator will schedule your handover.",
            'request',
            $id
        );

        foreach ($result['declined'] as $declined) {
            $this->notificationModel->create(
                (int) $declined['requester_id'],
                'request_declined',
                "Your exchange request for \"{$declined['target_title']}\" was declined automatically because one of the books was accepted in another exchange.",
                'request',
                (int) $declined['id']
            );
        }

        // Phase 1 §3.2.6: newly accepted exchanges appear on the moderation dashboard.
        $this->notificationModel->notifyMany(
            $this->userModel->getActiveIdsByRole(ROLE_STAFF),
            'exchange_awaiting_schedule',
            "Transaction #{$result['transaction_id']} was accepted and needs a handover slot.",
            'transaction',
            $result['transaction_id']
        );

        sendSuccess([
            'transaction_id'         => $result['transaction_id'],
            'auto_declined_requests' => count($result['declined']),
        ], 'Request accepted. A moderator will schedule the handover.');
    }

    /**
     * PUT /api/exchanges/{id}/decline
     * The listing owner declines a pending request with a selectable reason.
     * Accepts: { reason: one of DECLINE_REASONS keys, note?: string }
     * A note is required when the reason is 'other'.
     *
     * @param int $id
     */
    public function declineRequest(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['reason'], $body, $errors);
        if (empty($errors)) {
            validateInList('reason', $body['reason'], array_keys(DECLINE_REASONS), $errors);
        }
        $note = sanitizeString($body['note'] ?? '');
        validateMaxLength('note', $note, 200, $errors);
        if (($body['reason'] ?? null) === 'other' && $note === '') {
            $errors['note'] = "A note is required when the reason is 'other'.";
        }
        if (!empty($errors)) {
            sendError('A valid decline reason is required.', 422, $errors);
        }

        $request = $this->findRequestOr404($id);

        if ((int) $request['target_owner_id'] !== $authUser['sub']) {
            sendForbidden('Only the listing owner can decline this exchange request.');
        }

        $reasonText = $body['reason'] === 'other'
            ? $note
            : trim(DECLINE_REASONS[$body['reason']] . ' ' . $note);

        $declined = withTransaction(function () use ($id, $reasonText, $authUser) {
            if (!$this->exchangeModel->markDeclined($id, $reasonText)) {
                return false;
            }
            $this->reportModel->logActivity($authUser['sub'], 'request', $id, 'declined', $reasonText);
            return true;
        });

        if (!$declined) {
            sendError('This request is no longer pending.', 409);
        }

        $this->notificationModel->create(
            (int) $request['requester_id'],
            'request_declined',
            "Your exchange request for \"{$request['target_title']}\" was declined. Reason: $reasonText",
            'request',
            $id
        );

        sendSuccess(null, 'Request declined.');
    }

    /**
     * PUT /api/exchanges/{id}/withdraw
     * The requester withdraws their request before the owner responds.
     *
     * @param int $id
     */
    public function withdrawRequest(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $request = $this->findRequestOr404($id);

        if ((int) $request['requester_id'] !== $authUser['sub']) {
            sendForbidden('You may only withdraw your own requests.');
        }

        $withdrawn = withTransaction(function () use ($id, $authUser) {
            if (!$this->exchangeModel->setStatusIfPending($id, REQUEST_WITHDRAWN)) {
                return false;
            }
            $this->reportModel->logActivity($authUser['sub'], 'request', $id, 'withdrawn', '');
            return true;
        });

        if (!$withdrawn) {
            sendError('This request can no longer be withdrawn (the owner has already responded).', 409);
        }

        sendSuccess(null, 'Exchange request withdrawn.');
    }

    /**
     * @param int $id
     * @return array Request row.
     */
    private function findRequestOr404(int $id): array {
        $request = $this->exchangeModel->findById($id);
        if ($request === null) {
            sendNotFound('Exchange request not found.');
        }
        return $request;
    }
}
