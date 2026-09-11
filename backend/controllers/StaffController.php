<?php

/**
 * StaffController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all Exchange Moderator (Staff) actions.
 *
 * Endpoints (defined in routes/api.php):
 *   GET  /api/staff/dashboard                          → dashboard()
 *   PUT  /api/staff/listings/{id}/verify               → verifyListing()
 *   PUT  /api/staff/requests/{id}/endorse              → endorseRequest()
 *   PUT  /api/staff/transactions/{id}/status           → updateTransactionStatus()
 *   POST /api/staff/transactions/{id}/schedule         → scheduleHandover()
 *   PUT  /api/staff/transactions/{id}/reschedule       → rescheduleHandover()
 *   PUT  /api/staff/transactions/{id}/no-show          → recordNoShow()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/constants.php';

class StaffController {

    private ListingModel      $listingModel;
    private ExchangeModel     $exchangeModel;
    private TransactionModel  $transactionModel;
    private NotificationModel $notificationModel;
    private ReportModel       $reportModel;

    public function __construct() {
        $this->listingModel      = new ListingModel();
        $this->exchangeModel     = new ExchangeModel();
        $this->transactionModel  = new TransactionModel();
        $this->notificationModel = new NotificationModel();
        $this->reportModel       = new ReportModel();
    }

    /**
     * GET /api/staff/dashboard
     * Returns three counts used on the moderation dashboard:
     *   - pending_verifications: listings awaiting review
     *   - pending_requests: exchange requests awaiting endorsement
     *   - todays_handovers: transactions scheduled for today
     */
    public function dashboard(): void {
        requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $pendingListings  = $this->listingModel->getPending();
        $pendingRequests  = $this->exchangeModel->getPendingForStaff();
        $todaysHandovers  = $this->transactionModel->getScheduledToday();
        $idleListings     = $this->listingModel->getIdle();

        sendSuccess([
            'counts' => [
                'pending_verifications' => count($pendingListings),
                'pending_requests'      => count($pendingRequests),
                'todays_handovers'      => count($todaysHandovers),
                'idle_listings'         => count($idleListings),
            ],
            'pending_verifications' => $pendingListings,
            'pending_requests'      => $pendingRequests,
            'todays_handovers'      => $todaysHandovers,
        ]);
    }

    /**
     * PUT /api/staff/listings/{id}/verify
     * Approve, return, or reject a submitted listing.
     * Accepts: { action: 'approve'|'return'|'reject', note?: string }
     *
     * @param int $id Listing primary key.
     */
    public function verifyListing(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['action'], $body, $errors);
        if (!empty($errors)) sendError('Action is required.', 422, $errors);

        validateInList('action', $body['action'], ['approve', 'return', 'reject'], $errors);
        if (!empty($errors)) sendError('Invalid action. Must be approve, return, or reject.', 422, $errors);

        // A reason is mandatory when returning or rejecting.
        if (in_array($body['action'], ['return', 'reject'], true)) {
            if (empty($body['note'])) {
                sendError('A note explaining the decision is required when returning or rejecting.', 422);
            }
        }

        $listing = $this->listingModel->findById($id);
        if ($listing === null) sendNotFound('Listing not found.');

        // Staff cannot verify their own listing (role separation rule).
        blockStaffSelfTransaction($staff['sub'], [$listing['user_id']]);

        // Listing must be in 'unverified' or 'returned' state.
        if (!in_array($listing['status'], [LISTING_UNVERIFIED, LISTING_RETURNED], true)) {
            sendError('This listing is not pending verification.', 409);
        }

        // Map the action to the correct status constant.
        $statusMap = [
            'approve' => LISTING_AVAILABLE,
            'return'  => LISTING_RETURNED,
            'reject'  => LISTING_REJECTED,
        ];
        $newStatus = $statusMap[$body['action']];
        $note      = sanitizeString($body['note'] ?? '');

        $this->listingModel->updateStatus($id, $newStatus, $note);

        // Notify the listing owner of the outcome.
        $notifMessages = [
            'approve' => "Your listing \"{$listing['title']}\" has been approved and is now visible in the catalog.",
            'return'  => "Your listing \"{$listing['title']}\" needs revision: $note",
            'reject'  => "Your listing \"{$listing['title']}\" was rejected: $note",
        ];
        $this->notificationModel->create(
            (int) $listing['user_id'],
            "listing_{$body['action']}d",
            $notifMessages[$body['action']],
            'listing',
            $id
        );

        $this->reportModel->logActivity($staff['sub'], 'listing', $id, $body['action'], $note);

        sendSuccess(null, "Listing {$body['action']}d successfully.");
    }

    /**
     * PUT /api/staff/requests/{id}/endorse
     * Endorse, hold, or reject an exchange request.
     * Accepts: { action: 'endorse'|'hold'|'reject', note?: string }
     *
     * @param int $id Exchange request primary key.
     */
    public function endorseRequest(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['action'], $body, $errors);
        if (!empty($errors)) sendError('Action is required.', 422, $errors);

        validateInList('action', $body['action'], ['endorse', 'hold', 'reject'], $errors);
        if (!empty($errors)) sendError('Invalid action.', 422, $errors);

        $request = $this->exchangeModel->findById($id);
        if ($request === null) sendNotFound('Exchange request not found.');

        // Verify the request is in a processable state.
        if ($request['status'] !== REQUEST_PENDING && $request['status'] !== REQUEST_HELD) {
            sendError('This request cannot be endorsed in its current state.', 409);
        }

        // Role separation: Staff cannot endorse a request they are personally in.
        $targetListing = $this->listingModel->findById((int) $request['target_listing_id']);
        $targetListingOwnerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($request['target_owner_id'] ?? 0);
        blockStaffSelfTransaction($staff['sub'], [(int) $request['requester_id'], $targetListingOwnerId]);

        $statusMap = [
            'endorse' => REQUEST_ENDORSED,
            'hold'    => REQUEST_HELD,
            'reject'  => REQUEST_REJECTED,
        ];
        $note = sanitizeString($body['note'] ?? '');
        $this->exchangeModel->updateStatus($id, $statusMap[$body['action']], $note);

        // If endorsed, create a transaction record and notify both parties.
        if ($body['action'] === 'endorse') {
            $txId = $this->transactionModel->create($id, $staff['sub']);

            // Notify requester.
            $this->notificationModel->create(
                (int) $request['requester_id'],
                'request_endorsed',
                "Your exchange request has been endorsed by a moderator. The listing owner has been notified.",
                'transaction',
                $txId
            );

            // Notify the listing owner.
            if ($targetListingOwnerId > 0) {
                $this->notificationModel->create(
                    $targetListingOwnerId,
                    'request_endorsed_for_owner',
                    "An exchange request for your listing \"{$request['target_title']}\" has been endorsed by staff and is awaiting your review.",
                    'transaction',
                    $txId
                );
            }
        }

        $this->reportModel->logActivity($staff['sub'], 'request', $id, $body['action'], $note);

        sendSuccess(null, "Request {$body['action']}d.");
    }

    /**
     * PUT /api/staff/transactions/{id}/status
     * Advance or cancel a transaction.
     * Accepts: { status: 'approved'|'cancelled', cancel_reason?: string }
     *
     * @param int $id Transaction primary key.
     */
    public function updateTransactionStatus(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['status'], $body, $errors);
        if (!empty($errors)) sendError('Status is required.', 422, $errors);

        validateInList('status', $body['status'], [TX_APPROVED, TX_CANCELLED], $errors);
        if (!empty($errors)) sendError('Invalid status.', 422, $errors);

        // A cancel reason is mandatory for cancellations.
        if ($body['status'] === TX_CANCELLED) {
            if (empty($body['cancel_reason'])) {
                sendError('A cancellation reason is required.', 422);
            }
        }

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');

        $cancelReason = sanitizeString($body['cancel_reason'] ?? '');
        $this->transactionModel->updateStatus($id, $body['status'], $cancelReason);

        $exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);

        // If approved, lock both listings so they cannot enter another exchange.
        if ($body['status'] === TX_APPROVED && $exchangeReq) {
            $this->listingModel->updateStatus((int) $exchangeReq['target_listing_id'], LISTING_LOCKED);
            $this->listingModel->updateStatus((int) $exchangeReq['offered_listing_id'], LISTING_LOCKED);
        }

        // If cancelled, unlock the listings (return them to 'available').
        if ($body['status'] === TX_CANCELLED && $exchangeReq) {
            $this->listingModel->updateStatus((int) $exchangeReq['target_listing_id'], LISTING_AVAILABLE);
            $this->listingModel->updateStatus((int) $exchangeReq['offered_listing_id'], LISTING_AVAILABLE);
        }

        $this->reportModel->logActivity($staff['sub'], 'transaction', $id, $body['status'], $cancelReason);

        sendSuccess(null, "Transaction status updated to {$body['status']}.");
    }

    /**
     * POST /api/staff/transactions/{id}/schedule
     * Assign a handover slot to an approved transaction.
     * Accepts: { location_id, slot_date: 'YYYY-MM-DD', slot_time: 'HH:MM' }
     *
     * @param int $id Transaction primary key.
     */
    public function scheduleHandover(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['location_id', 'slot_date', 'slot_time'], $body, $errors);
        if (!empty($errors)) sendError('Location, date, and time are required.', 422, $errors);

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');
        if ($tx['status'] !== TX_APPROVED) sendError('Transaction must be in Approved status to schedule.', 409);

        $slotId = $this->transactionModel->assignHandoverSlot(
            $id,
            (int) $body['location_id'],
            sanitizeString($body['slot_date']),
            sanitizeString($body['slot_time'])
        );

        // Advance transaction to Scheduled.
        $this->transactionModel->updateStatus($id, TX_SCHEDULED);

        // Notify both parties of their handover date/time/location.
        $exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
        if ($exchangeReq) {
            $targetListing = $this->listingModel->findById((int) $exchangeReq['target_listing_id']);
            $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($exchangeReq['target_owner_id'] ?? 0);
            $date = sanitizeString($body['slot_date']);
            $time = sanitizeString($body['slot_time']);
            $msg = "A handover has been scheduled for $date at $time. Please check your transaction details for location instructions.";
            $this->notificationModel->create((int) $exchangeReq['requester_id'], 'handover_scheduled', $msg, 'transaction', $id);
            if ($ownerId > 0) {
                $this->notificationModel->create($ownerId, 'handover_scheduled', $msg, 'transaction', $id);
            }
        }

        $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'scheduled', "Slot ID: $slotId");

        sendSuccess(['handover_slot_id' => $slotId], 'Handover scheduled.');
    }

    /**
     * PUT /api/staff/transactions/{id}/reschedule
     * Reschedule a handover (limit: MAX_RESCHEDULES per transaction).
     * Accepts: { location_id, slot_date, slot_time }
     *
     * @param int $id Transaction primary key.
     */
    public function rescheduleHandover(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['location_id', 'slot_date', 'slot_time'], $body, $errors);
        if (!empty($errors)) sendError('Location, date, and time are required.', 422, $errors);

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');
        if ($tx['status'] !== TX_SCHEDULED) sendError('Transaction is not currently scheduled.', 409);

        // Enforce the one-reschedule limit.
        if ((int) ($tx['reschedule_count'] ?? 0) >= MAX_RESCHEDULES) {
            sendError('This transaction has already been rescheduled the maximum number of times (' . MAX_RESCHEDULES . ').', 409);
        }

        $this->transactionModel->rescheduleHandoverSlot(
            $id,
            (int) $body['location_id'],
            sanitizeString($body['slot_date']),
            sanitizeString($body['slot_time'])
        );

        $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'rescheduled', '');

        // Notify both parties of the updated schedule.
        $exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
        if ($exchangeReq) {
            $targetListing = $this->listingModel->findById((int) $exchangeReq['target_listing_id']);
            $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($exchangeReq['target_owner_id'] ?? 0);
            $date = sanitizeString($body['slot_date']);
            $time = sanitizeString($body['slot_time']);
            $msg = "Your handover schedule has been updated to $date at $time.";
            $this->notificationModel->create((int) $exchangeReq['requester_id'], 'handover_rescheduled', $msg, 'transaction', $id);
            if ($ownerId > 0) {
                $this->notificationModel->create($ownerId, 'handover_rescheduled', $msg, 'transaction', $id);
            }
        }

        sendSuccess(null, 'Handover rescheduled.');
    }

    /**
     * PUT /api/staff/transactions/{id}/no-show
     * Record a no-show and return both listings to available.
     *
     * @param int $id Transaction primary key.
     */
    public function recordNoShow(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $tx = $this->transactionModel->findById($id);
        if ($tx === null) sendNotFound('Transaction not found.');
        if ($tx['status'] !== TX_SCHEDULED) sendError('Transaction is not in Scheduled status.', 409);

        $this->transactionModel->recordNoShow($id);
        $this->transactionModel->updateStatus($id, TX_CANCELLED, 'No-show recorded by moderator.');

        // Return both listings to LISTING_AVAILABLE and notify both parties.
        $exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
        if ($exchangeReq) {
            $this->listingModel->updateStatus((int) $exchangeReq['target_listing_id'], LISTING_AVAILABLE);
            $this->listingModel->updateStatus((int) $exchangeReq['offered_listing_id'], LISTING_AVAILABLE);

            $targetListing = $this->listingModel->findById((int) $exchangeReq['target_listing_id']);
            $ownerId = $targetListing ? (int) $targetListing['user_id'] : (int) ($exchangeReq['target_owner_id'] ?? 0);
            $msg = "A no-show was recorded for your scheduled handover. The transaction has been cancelled and both listings returned to available.";
            $this->notificationModel->create((int) $exchangeReq['requester_id'], 'handover_noshow', $msg, 'transaction', $id);
            if ($ownerId > 0) {
                $this->notificationModel->create($ownerId, 'handover_noshow', $msg, 'transaction', $id);
            }
        }

        $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'no_show', '');

        sendSuccess(null, 'No-show recorded. Both listings have been returned to available status.');
    }
}
