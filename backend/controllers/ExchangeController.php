<?php

/**
 * ExchangeController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the Customer side of the exchange request workflow.
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
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class ExchangeController {

    private ExchangeModel     $exchangeModel;
    private ListingModel      $listingModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;

    public function __construct() {
        $this->exchangeModel     = new ExchangeModel();
        $this->listingModel      = new ListingModel();
        $this->notificationModel = new NotificationModel();
        $this->reportModel       = new ReportModel();
    }

    /**
     * POST /api/exchanges
     * A Customer sends an exchange request on a listing.
     * Accepts: { target_listing_id, offered_listing_id, message? }
     *
     * Business rules enforced here:
     *   - Both listings must be in LISTING_AVAILABLE status.
     *   - The requester must own the offered listing.
     *   - A user can have at most MAX_ACTIVE_REQUESTS (1) active request per target.
     *   - A user cannot request their own listing.
     */
    public function sendRequest(): void {
        $authUser = requireAuth(ROLE_CUSTOMER);
        $userId   = $authUser['sub'];

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['target_listing_id', 'offered_listing_id'], $body, $errors);
        if (!empty($errors)) sendError('Validation failed.', 422, $errors);

        $targetId  = (int) $body['target_listing_id'];
        $offeredId = (int) $body['offered_listing_id'];

        // Cannot request your own listing.
        $targetListing = $this->listingModel->findById($targetId);
        if ($targetListing === null) sendNotFound('Target listing not found.');
        if ((int) $targetListing['user_id'] === $userId) {
            sendError('You cannot send an exchange request on your own listing.', 422);
        }

        // Target must be available.
        if ($targetListing['status'] !== LISTING_AVAILABLE) {
            sendError('The selected listing is not currently available for exchange.', 409);
        }

        // Offered listing must belong to the requester and be available.
        $offeredListing = $this->listingModel->findById($offeredId);
        if ($offeredListing === null) sendNotFound('Offered listing not found.');
        if ((int) $offeredListing['user_id'] !== $userId) {
            sendForbidden('You may only offer your own listings.');
        }
        if ($offeredListing['status'] !== LISTING_AVAILABLE) {
            sendError('Your offered listing is not available (it may already be part of an active exchange).', 409);
        }

        // Enforce one-active-request-per-target rule.
        if ($this->exchangeModel->hasActiveRequest($userId, $targetId)) {
            sendError('You already have an active request on this listing.', 409);
        }

        $requestId = $this->exchangeModel->create([
            'requester_id'      => $userId,
            'target_listing_id' => $targetId,
            'offered_listing_id'=> $offeredId,
            'message'           => sanitizeString($body['message'] ?? ''),
        ]);

        // Notify the listing owner that they have an incoming request.
        $this->notificationModel->create(
            (int) $targetListing['user_id'],
            'new_exchange_request',
            "Someone wants to exchange for your listing \"{$targetListing['title']}\".",
            'request',
            $requestId
        );

        $this->reportModel->logActivity($userId, 'request', $requestId, 'submitted', '');

        sendSuccess(['request_id' => $requestId], 'Exchange request submitted.', 201);
    }

    /**
     * GET /api/exchanges/{id}
     * Returns details of a single exchange request.
     * Only the requester, the listing owner, or Staff/Admin may view.
     *
     * @param int $id
     */
    public function show(int $id): void {
        $authUser = requireAuth();

        $request = $this->exchangeModel->findById($id);
        if ($request === null) sendNotFound('Exchange request not found.');

        $targetListing = $this->listingModel->findById((int) $request['target_listing_id']);
        $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($request['target_owner_id'] ?? 0);

        // Permission: must be requester, target owner, or Staff/Admin.
        $isParty = in_array((int) $authUser['sub'], [(int) $request['requester_id'], $ownerId], true);
        $isStaff = in_array($authUser['role'], [ROLE_STAFF, ROLE_ADMIN], true);

        if (!$isParty && !$isStaff) {
            sendForbidden('You do not have permission to view this request.');
        }

        sendSuccess($request, 'Exchange request retrieved.');
    }

    /**
     * PUT /api/exchanges/{id}/accept
     * The listing owner accepts an endorsed request.
     * The request must be in REQUEST_ENDORSED status (Staff has already reviewed it).
     *
     * @param int $id
     */
    public function acceptRequest(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $request = $this->exchangeModel->findById($id);
        if ($request === null) sendNotFound('Exchange request not found.');

        // Only the listing owner can accept.
        $targetListing = $this->listingModel->findById((int) $request['target_listing_id']);
        $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($request['target_owner_id'] ?? 0);
        if ($ownerId !== (int) $authUser['sub']) {
            sendForbidden('Only the listing owner can accept this exchange request.');
        }

        if ($request['status'] !== REQUEST_ENDORSED) {
            sendError('This request has not been endorsed by a moderator yet and cannot be accepted.', 409);
        }

        $this->exchangeModel->updateStatus($id, REQUEST_ACCEPTED);

        // Notify the requester.
        $this->notificationModel->create(
            (int) $request['requester_id'],
            'request_accepted',
            'Your exchange request was accepted by the listing owner. A moderator will now schedule your handover.',
            'request',
            $id
        );

        $this->reportModel->logActivity($authUser['sub'], 'request', $id, 'accepted', '');

        sendSuccess(null, 'Request accepted. A moderator will schedule the handover.');
    }

    /**
     * PUT /api/exchanges/{id}/decline
     * The listing owner declines a request.
     * Accepts: { reason: string } — a selectable reason is shown to the requester.
     *
     * @param int $id
     */
    public function declineRequest(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['reason'], $body, $errors);
        if (!empty($errors)) sendError('A decline reason is required.', 422, $errors);

        $request = $this->exchangeModel->findById($id);
        if ($request === null) sendNotFound('Exchange request not found.');

        // Only the listing owner may decline.
        $targetListing = $this->listingModel->findById((int) $request['target_listing_id']);
        $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($request['target_owner_id'] ?? 0);
        if ($ownerId !== (int) $authUser['sub']) {
            sendForbidden('Only the listing owner can decline this exchange request.');
        }

        if (!in_array($request['status'], [REQUEST_PENDING, REQUEST_ENDORSED], true)) {
            sendError('This request cannot be declined in its current state.', 409);
        }

        $reason = sanitizeString($body['reason']);
        $this->exchangeModel->updateStatus($id, REQUEST_DECLINED, $reason);

        // Notify the requester with the reason.
        $this->notificationModel->create(
            (int) $request['requester_id'],
            'request_declined',
            "Your exchange request was declined. Reason: $reason",
            'request',
            $id
        );

        $this->reportModel->logActivity($authUser['sub'], 'request', $id, 'declined', $reason);

        sendSuccess(null, 'Request declined.');
    }

    /**
     * PUT /api/exchanges/{id}/withdraw
     * The requester withdraws their own pending request before Staff endorsement.
     *
     * @param int $id
     */
    public function withdrawRequest(int $id): void {
        $authUser = requireAuth(ROLE_CUSTOMER);

        $request = $this->exchangeModel->findById($id);
        if ($request === null) sendNotFound('Exchange request not found.');

        // Only the requester may withdraw.
        if ((int) $request['requester_id'] !== $authUser['sub']) {
            sendForbidden('You may only withdraw your own requests.');
        }

        // Can only withdraw before Staff endorsement.
        if ($request['status'] !== REQUEST_PENDING) {
            sendError('This request can no longer be withdrawn (it has already been endorsed or processed).', 409);
        }

        $this->exchangeModel->updateStatus($id, REQUEST_WITHDRAWN);
        $this->reportModel->logActivity($authUser['sub'], 'request', $id, 'withdrawn', '');

        sendSuccess(null, 'Exchange request withdrawn.');
    }
}
