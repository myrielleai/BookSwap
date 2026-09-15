<?php

/**
 * StaffController.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all Exchange Moderator (Staff) actions. Administrators may use them too.
 *
 * Phase 1 §4.2: Staff verify listings, monitor requests (without deciding
 * them), move transactions forward, schedule handovers, and handle reports.
 * A moderator can never act on a listing or exchange they are part of (§4.5).
 *
 * Endpoints (defined in routes/api.php):
 *   GET  /api/staff/dashboard                      → dashboard()
 *   PUT  /api/staff/listings/{id}/verify           → verifyListing()
 *   GET  /api/staff/requests                       → listRequests()
 *   GET  /api/staff/transactions                   → listTransactions()
 *   POST /api/staff/transactions/{id}/schedule     → scheduleHandover()
 *   PUT  /api/staff/transactions/{id}/reschedule   → rescheduleHandover()
 *   PUT  /api/staff/transactions/{id}/status       → updateTransactionStatus()
 *   PUT  /api/staff/transactions/{id}/no-show      → recordNoShow()
 *   GET  /api/staff/reports                        → listReports()
 *   PUT  /api/staff/reports/{id}                   → resolveReport()
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../middleware/auth_middleware.php';
require_once __DIR__ . '/../models/ListingModel.php';
require_once __DIR__ . '/../models/ExchangeModel.php';
require_once __DIR__ . '/../models/TransactionModel.php';
require_once __DIR__ . '/../models/NotificationModel.php';
require_once __DIR__ . '/../models/ReportModel.php';
require_once __DIR__ . '/../models/IncidentReportModel.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class StaffController {

    private const REQUEST_STATUSES = [
        REQUEST_PENDING, REQUEST_ACCEPTED, REQUEST_DECLINED,
        REQUEST_REJECTED, REQUEST_WITHDRAWN, REQUEST_CANCELLED,
    ];
    private const TX_STATUSES     = [TX_ACCEPTED, TX_SCHEDULED, TX_COMPLETED, TX_CANCELLED];
    private const REPORT_STATUSES = [REPORT_OPEN, REPORT_RESOLVED, REPORT_ESCALATED];
    private const REPORT_TYPES    = [REPORT_MISDESCRIBED, REPORT_NO_SHOW, REPORT_INAPPROPRIATE, REPORT_SPAM_REQUEST];

    private ListingModel        $listingModel;
    private ExchangeModel       $exchangeModel;
    private TransactionModel    $transactionModel;
    private NotificationModel   $notificationModel;
    private ReportModel         $reportModel;
    private IncidentReportModel $incidentReportModel;
    private UserModel           $userModel;

    public function __construct() {
        $this->listingModel        = new ListingModel();
        $this->exchangeModel       = new ExchangeModel();
        $this->transactionModel    = new TransactionModel();
        $this->notificationModel   = new NotificationModel();
        $this->reportModel         = new ReportModel();
        $this->incidentReportModel = new IncidentReportModel();
        $this->userModel           = new UserModel();
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    /**
     * GET /api/staff/dashboard
     * Phase 1 §3.2.6: pending verifications, accepted exchanges awaiting a
     * schedule, today's handovers, idle listings, open reports, and a count of
     * items the moderator has processed.
     */
    public function dashboard(): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $this->expireStaleRequests();

        $pendingVerifications = $this->listingModel->getPending();
        $awaitingSchedule     = $this->transactionModel->getAwaitingSchedule();
        $todaysHandovers      = $this->transactionModel->getScheduledToday();
        $idleListings         = $this->listingModel->getIdle();

        sendSuccess([
            'counts' => [
                'pending_verifications'  => count($pendingVerifications),
                'awaiting_schedule'      => count($awaitingSchedule),
                'todays_handovers'       => count($todaysHandovers),
                'idle_listings'          => count($idleListings),
                'open_reports'           => $this->incidentReportModel->countOpen(),
                'items_processed_by_you' => $this->reportModel->countProcessedBy($staff['sub']),
            ],
            'pending_verifications' => $pendingVerifications,
            'awaiting_schedule'     => $awaitingSchedule,
            'todays_handovers'      => $todaysHandovers,
            'idle_listings'         => $idleListings,
        ], 'Dashboard data retrieved.');
    }

    // ── Listing Verification ──────────────────────────────────────────────────

    /**
     * PUT /api/staff/listings/{id}/verify
     * Approve, return, or reject a submitted listing (Phase 1 §3.2.1).
     * Accepts: { action: 'approve'|'return'|'reject', note?: string }
     *
     * @param int $id Listing primary key.
     */
    public function verifyListing(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['action'], $body, $errors);
        if (empty($errors)) {
            validateInList('action', $body['action'], ['approve', 'return', 'reject'], $errors);
        }
        if (!empty($errors)) {
            sendError('Invalid action. Must be approve, return, or reject.', 422, $errors);
        }

        $action = $body['action'];
        $note   = sanitizeString($body['note'] ?? '');
        validateMaxLength('note', $note, 1000, $errors);
        // A reason is mandatory when returning or rejecting.
        if ($action !== 'approve' && $note === '') {
            $errors['note'] = 'A note explaining the decision is required when returning or rejecting.';
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $listing = $this->listingModel->findById($id);
        if ($listing === null) {
            sendNotFound('Listing not found.');
        }

        // Staff cannot verify their own listing (role separation rule).
        blockStaffSelfTransaction($staff['sub'], [(int) $listing['user_id']]);

        // A returned listing is back with its owner; it re-enters this queue when resubmitted.
        if ($listing['status'] !== LISTING_UNVERIFIED) {
            sendError('This listing is not pending verification.', 409);
        }

        $newStatus = [
            'approve' => LISTING_AVAILABLE,
            'return'  => LISTING_RETURNED,
            'reject'  => LISTING_REJECTED,
        ][$action];

        withTransaction(function () use ($id, $newStatus, $staff, $note, $action) {
            $this->listingModel->recordVerification($id, $newStatus, $staff['sub'], $note !== '' ? $note : null);
            $this->reportModel->logActivity($staff['sub'], 'listing', $id, $action, $note);
        });

        $title    = $listing['title'];
        $outcomes = [
            'approve' => ['listing_approved', "Your listing \"$title\" has been approved and is now visible in the catalog.", 'Listing approved.'],
            'return'  => ['listing_returned', "Your listing \"$title\" needs revision: $note", 'Listing returned for revision.'],
            'reject'  => ['listing_rejected', "Your listing \"$title\" was rejected: $note", 'Listing rejected.'],
        ];
        [$type, $message, $response] = $outcomes[$action];

        $this->notificationModel->create((int) $listing['user_id'], $type, $message, 'listing', $id);
        if ($action === 'approve') {
            $this->notificationModel->notifyWatchers($id, $title);
        }

        sendSuccess(null, $response);
    }

    // ── Monitoring Lists ──────────────────────────────────────────────────────

    /**
     * GET /api/staff/requests
     * Monitor exchange requests (Phase 1 §3.2.2). Staff do not decide them.
     * Query: status, keyword, date_from, date_to, sort (newest|oldest), page, per_page
     */
    public function listRequests(): void {
        requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $this->expireStaleRequests();

        $query = readListQuery(['newest', 'oldest'], 'newest', self::REQUEST_STATUSES);
        $page  = $this->exchangeModel->search($query);

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Exchange requests retrieved.');
    }

    /**
     * GET /api/staff/transactions
     * Query: status, keyword, date_from, date_to, sort (newest|oldest|slot), page, per_page
     */
    public function listTransactions(): void {
        requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $query = readListQuery(['newest', 'oldest', 'slot'], 'newest', self::TX_STATUSES);
        $page  = $this->transactionModel->search($query);

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Transactions retrieved.');
    }

    // ── Handover Scheduling ───────────────────────────────────────────────────

    /**
     * POST /api/staff/transactions/{id}/schedule
     * Book a slot from the Administrator's pool for an accepted exchange.
     * Accepts: { slot_id }
     *
     * @param int $id Transaction primary key.
     */
    public function scheduleHandover(int $id): void {
        $staff  = requireAuth([ROLE_STAFF, ROLE_ADMIN]);
        $slotId = $this->readSlotId();

        $tx = $this->findTransactionOr404($id);
        blockStaffSelfTransaction($staff['sub'], [$tx['owner_id'], $tx['requester_id']]);

        withTransaction(function () use ($id, $slotId, $staff) {
            $this->transactionModel->bookSlot($id, $slotId, $staff['sub'], false);
            $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'scheduled', "Slot #$slotId");
        });

        $tx = $this->transactionModel->findById($id);
        $this->notifyParties($tx, 'handover_scheduled', 'Your handover is scheduled for ' . $this->describeSlot($tx) . '.');

        sendSuccess($this->slotSummary($tx), 'Handover scheduled.');
    }

    /**
     * PUT /api/staff/transactions/{id}/reschedule
     * Move a scheduled handover to another slot, at most MAX_RESCHEDULES times.
     * Accepts: { slot_id }
     *
     * @param int $id Transaction primary key.
     */
    public function rescheduleHandover(int $id): void {
        $staff  = requireAuth([ROLE_STAFF, ROLE_ADMIN]);
        $slotId = $this->readSlotId();

        $tx = $this->findTransactionOr404($id);
        blockStaffSelfTransaction($staff['sub'], [$tx['owner_id'], $tx['requester_id']]);

        withTransaction(function () use ($id, $slotId, $staff, $tx) {
            $this->transactionModel->bookSlot($id, $slotId, $staff['sub'], true);
            $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'rescheduled', "Slot #{$tx['slot_id']} to slot #$slotId");
        });

        $tx = $this->transactionModel->findById($id);
        $this->notifyParties($tx, 'handover_rescheduled', 'Your handover has been moved to ' . $this->describeSlot($tx) . '.');

        sendSuccess($this->slotSummary($tx), 'Handover rescheduled.');
    }

    // ── Transaction Status ────────────────────────────────────────────────────

    /**
     * PUT /api/staff/transactions/{id}/status
     * Record completion or cancel an exchange (Phase 1 §3.2.3). Members only
     * confirm receipt; this is the only way a transaction reaches an end state.
     * Accepts: { status: 'completed'|'cancelled', cancel_reason?: string }
     *
     * @param int $id Transaction primary key.
     */
    public function updateTransactionStatus(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['status'], $body, $errors);
        if (empty($errors)) {
            validateInList('status', $body['status'], [TX_COMPLETED, TX_CANCELLED], $errors);
        }

        $reason = sanitizeString($body['cancel_reason'] ?? '');
        if (($body['status'] ?? null) === TX_CANCELLED) {
            // A reason is recorded for every cancellation so recurring causes show up in reports.
            if ($reason === '') {
                $errors['cancel_reason'] = 'A cancellation reason is required.';
            }
            validateMaxLength('cancel_reason', $reason, 255, $errors);
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $tx = $this->findTransactionOr404($id);
        blockStaffSelfTransaction($staff['sub'], [$tx['owner_id'], $tx['requester_id']]);

        $bookIds = [(int) $tx['target_listing_id'], (int) $tx['offered_listing_id']];
        $books   = "\"{$tx['target_title']}\" and \"{$tx['offered_title']}\"";

        if ($body['status'] === TX_COMPLETED) {
            withTransaction(function () use ($id, $tx, $bookIds, $staff) {
                if (!$this->transactionModel->complete($id)) {
                    throw new ApiException(
                        $tx['status'] !== TX_SCHEDULED
                            ? 'Only a scheduled exchange can be completed.'
                            : 'Both members must confirm receipt before the exchange can be completed.',
                        409
                    );
                }
                $this->listingModel->setStatusForIds($bookIds, LISTING_ARCHIVED);
                $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'completed', 'Both members confirmed receipt.');
            });

            $this->notifyParties($tx, 'exchange_completed', "Your exchange of $books is complete. Thank you for using BookSwap!");
            sendSuccess(null, 'Exchange marked as completed.');
        }

        withTransaction(function () use ($id, $bookIds, $staff, $reason) {
            if (!$this->transactionModel->cancel($id, $reason, true)) {
                throw new ApiException('Only an accepted or scheduled exchange can be cancelled.', 409);
            }
            $this->listingModel->setStatusForIds($bookIds, LISTING_AVAILABLE);
            $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'cancelled', $reason);
        });

        $this->notifyParties($tx, 'exchange_cancelled', "Your exchange of $books was cancelled by a moderator. Reason: $reason Both books are back in the catalog.");
        $this->notifyWatchersOfBooks($tx);

        sendSuccess(null, 'Exchange cancelled. Both books are available again.');
    }

    /**
     * PUT /api/staff/transactions/{id}/no-show
     * Record a no-show: the exchange is cancelled, both books return to the
     * catalog, and a no_show report is filed against the transaction (§3.2.4).
     * Accepts: { absent_party: 'requester'|'owner'|'both', note?: string }
     *
     * @param int $id Transaction primary key.
     */
    public function recordNoShow(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['absent_party'], $body, $errors);
        if (empty($errors)) {
            validateInList('absent_party', $body['absent_party'], ['requester', 'owner', 'both'], $errors);
        }
        $note = sanitizeString($body['note'] ?? '');
        validateMaxLength('note', $note, 1000, $errors);
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $tx = $this->findTransactionOr404($id);
        blockStaffSelfTransaction($staff['sub'], [$tx['owner_id'], $tx['requester_id']]);

        if ($tx['status'] !== TX_SCHEDULED) {
            sendError('A no-show can only be recorded for a scheduled handover.', 409);
        }

        $absentParty = $body['absent_party'];
        $description = $absentParty === 'both'
            ? "No-show at the handover on {$tx['slot_date']}: neither member arrived."
            : "No-show at the handover on {$tx['slot_date']}: " . ($absentParty === 'owner' ? $tx['owner_name'] : $tx['requester_name']) . ' did not arrive.';
        if ($note !== '') {
            $description .= " $note";
        }

        $bookIds = [(int) $tx['target_listing_id'], (int) $tx['offered_listing_id']];

        $reportId = withTransaction(function () use ($id, $bookIds, $staff, $description) {
            if (!$this->transactionModel->cancel($id, REPORT_NO_SHOW, false)) {
                throw new ApiException('A no-show can only be recorded for a scheduled handover.', 409);
            }
            $this->listingModel->setStatusForIds($bookIds, LISTING_AVAILABLE);

            $reportId = $this->incidentReportModel->create([
                'reporter_id'    => $staff['sub'],
                'transaction_id' => $id,
                'listing_id'     => null,
                'request_id'     => null,
                'handled_by'     => $staff['sub'],
                'report_type'    => REPORT_NO_SHOW,
                'description'    => $description,
                'resolution'     => 'No-show recorded; the exchange was cancelled and both books returned to the catalog.',
                'status'         => REPORT_RESOLVED,
            ]);

            $this->reportModel->logActivity($staff['sub'], 'transaction', $id, 'no_show', "Report #$reportId");
            return $reportId;
        });

        $this->notifyParties($tx, 'handover_no_show', 'A no-show was recorded for your handover. The exchange has been cancelled and both books are back in the catalog.');
        $this->notifyWatchersOfBooks($tx);

        sendSuccess(['report_id' => $reportId], 'No-show recorded. The exchange was cancelled and both books are available again.');
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    /**
     * GET /api/staff/reports
     * Query: status, report_type, keyword, date_from, date_to, sort (newest|oldest), page, per_page
     */
    public function listReports(): void {
        requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $query = readListQuery(['newest', 'oldest'], 'newest', self::REPORT_STATUSES);

        $type = $_GET['report_type'] ?? '';
        if ($type !== '') {
            $errors = [];
            validateInList('report_type', $type, self::REPORT_TYPES, $errors);
            if (!empty($errors)) {
                sendError('Invalid query parameters.', 422, $errors);
            }
        }

        $page = $this->incidentReportModel->search($query, $type !== '' ? $type : null);

        sendPaginated($page['rows'], paginationMeta($page['total'], $query), 'Reports retrieved.');
    }

    /**
     * PUT /api/staff/reports/{id}
     * Record findings and a resolution, or escalate to the Administrator
     * (Phase 1 §3.2.5). Escalated reports can only be closed by an Administrator.
     * Accepts: { status: 'resolved'|'escalated', resolution, reject_request?: bool }
     *
     * reject_request applies to spam-request reports and rejects that request
     * if it is still pending.
     *
     * @param int $id Report primary key.
     */
    public function resolveReport(int $id): void {
        $staff = requireAuth([ROLE_STAFF, ROLE_ADMIN]);

        $body   = getRequestBody();
        $errors = [];
        validateRequired(['status', 'resolution'], $body, $errors);
        if (empty($errors)) {
            validateInList('status', $body['status'], [REPORT_RESOLVED, REPORT_ESCALATED], $errors);
        }
        $resolution = sanitizeString($body['resolution'] ?? '');
        validateMaxLength('resolution', $resolution, 2000, $errors);
        $rejectRequest = $body['reject_request'] ?? false;
        if (!is_bool($rejectRequest)) {
            $errors['reject_request'] = 'reject_request must be true or false.';
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }

        $report = $this->incidentReportModel->findById($id);
        if ($report === null) {
            sendNotFound('Report not found.');
        }

        $status = $body['status'];
        if ($report['status'] === REPORT_RESOLVED) {
            sendError('This report has already been resolved.', 409);
        }
        if ($report['status'] === REPORT_ESCALATED) {
            if ($staff['role'] !== ROLE_ADMIN) {
                sendForbidden('Escalated reports are handled by an Administrator.');
            }
            if ($status === REPORT_ESCALATED) {
                sendError('This report is already escalated.', 409);
            }
        }
        if ($rejectRequest && $report['request_id'] === null) {
            sendError('reject_request only applies to reports about an exchange request.', 422);
        }

        withTransaction(function () use ($id, $staff, $resolution, $status, $rejectRequest, $report) {
            $this->incidentReportModel->resolve($id, $staff['sub'], $resolution, $status);
            if ($rejectRequest && !$this->exchangeModel->setStatusIfPending((int) $report['request_id'], REQUEST_REJECTED)) {
                throw new ApiException('The reported request is no longer pending, so it cannot be rejected.', 409);
            }
            $this->reportModel->logActivity($staff['sub'], 'report', $id, $status, $resolution);
        });

        $outcome = $status === REPORT_ESCALATED ? 'escalated to an Administrator' : 'resolved';
        $this->notificationModel->create((int) $report['reporter_id'], 'report_updated', "Your report #$id has been $outcome: $resolution", 'report', $id);

        if ($status === REPORT_ESCALATED) {
            $this->notificationModel->notifyMany(
                $this->userModel->getActiveIdsByRole(ROLE_ADMIN),
                'report_escalated',
                "Report #$id ({$report['report_type']}) was escalated for Administrator review.",
                'report',
                $id
            );
        }

        if ($rejectRequest) {
            $request = $this->exchangeModel->findById((int) $report['request_id']);
            $this->notificationModel->create(
                (int) $request['requester_id'],
                'request_rejected',
                "Your exchange request for \"{$request['target_title']}\" was removed by a moderator after a report.",
                'request',
                (int) $request['id']
            );
        }

        sendSuccess(null, "Report $outcome.");
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * Cancel requests nobody answered within REQUEST_RESPONSE_DAYS and tell
     * the requesters. Runs when the staff queues load, since free hosting has
     * no scheduled jobs.
     */
    private function expireStaleRequests(): void {
        $expired = withTransaction(fn() => $this->exchangeModel->cancelExpired());

        foreach ($expired as $request) {
            $this->notificationModel->create(
                (int) $request['requester_id'],
                'request_expired',
                "Your exchange request for \"{$request['target_title']}\" expired because the owner did not respond within " . REQUEST_RESPONSE_DAYS . ' days.',
                'request',
                (int) $request['id']
            );
        }
    }

    /**
     * @param int $id
     * @return array Transaction detail row.
     */
    private function findTransactionOr404(int $id): array {
        $tx = $this->transactionModel->findById($id);
        if ($tx === null) {
            sendNotFound('Transaction not found.');
        }
        return $tx;
    }

    /**
     * Read the required slot_id from the request body.
     *
     * @return int
     */
    private function readSlotId(): int {
        $body   = getRequestBody();
        $errors = [];
        $slotId = readPositiveInt($body, 'slot_id', $errors);
        if ($slotId === null && !isset($errors['slot_id'])) {
            $errors['slot_id'] = 'slot_id is required. Choose one from GET /api/staff/handover-slots.';
        }
        if (!empty($errors)) {
            sendError('Validation failed.', 422, $errors);
        }
        return $slotId;
    }

    /**
     * Human-readable slot, e.g. "2026-09-15, 14:00–15:00 at Diliman Reading Hub (Second floor..., Quezon City)".
     *
     * @param array $tx Transaction detail row.
     * @return string
     */
    private function describeSlot(array $tx): string {
        return sprintf(
            '%s, %s–%s at %s (%s, %s)',
            $tx['slot_date'],
            substr((string) $tx['start_time'], 0, 5),
            substr((string) $tx['end_time'], 0, 5),
            $tx['location_name'],
            $tx['location_address'],
            $tx['location_city']
        );
    }

    /**
     * @param array $tx Transaction detail row.
     * @return array
     */
    private function slotSummary(array $tx): array {
        return [
            'transaction_id'   => (int) $tx['id'],
            'status'           => $tx['status'],
            'slot_id'          => (int) $tx['slot_id'],
            'slot_date'        => $tx['slot_date'],
            'start_time'       => $tx['start_time'],
            'end_time'         => $tx['end_time'],
            'location_name'    => $tx['location_name'],
            'reschedule_count' => (int) $tx['reschedule_count'],
        ];
    }

    /**
     * Notify both members of an exchange.
     *
     * @param array  $tx
     * @param string $type
     * @param string $message
     */
    private function notifyParties(array $tx, string $type, string $message): void {
        $this->notificationModel->notifyMany(
            [(int) $tx['requester_id'], (int) $tx['owner_id']],
            $type,
            $message,
            'transaction',
            (int) $tx['id']
        );
    }

    /**
     * Tell watchers that both books of a cancelled exchange are available again.
     *
     * @param array $tx
     */
    private function notifyWatchersOfBooks(array $tx): void {
        $this->notificationModel->notifyWatchers((int) $tx['target_listing_id'], $tx['target_title']);
        $this->notificationModel->notifyWatchers((int) $tx['offered_listing_id'], $tx['offered_title']);
    }
}
