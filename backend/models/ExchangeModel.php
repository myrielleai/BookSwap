<?php

/**
 * ExchangeModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `exchange_requests` table.
 *
 * Phase 1 §3.2.2: a request is decided by the owner of the requested book.
 * Moderators do not approve requests; they only act on reported ones, and the
 * system cancels requests left unanswered past REQUEST_RESPONSE_DAYS.
 *
 * TABLE: exchange_requests
 *   id, requester_id (FK→users), target_listing_id (FK→listings),
 *   offered_listing_id (FK→listings), message, status, decline_reason,
 *   created_at, responded_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class ExchangeModel {

    private PDO $db;

    private const SELECT_SQL = "
        SELECT er.*,
               u.name   AS requester_name,
               tl.title AS target_title,  tl.user_id AS target_owner_id,  tl.status AS target_status,
               ol.title AS offered_title, ol.user_id AS offered_owner_id, ol.status AS offered_status,
               t.id     AS transaction_id
        FROM exchange_requests er
        JOIN users u             ON u.id  = er.requester_id
        JOIN listings tl         ON tl.id = er.target_listing_id
        JOIN listings ol         ON ol.id = er.offered_listing_id
        LEFT JOIN transactions t ON t.exchange_request_id = er.id";

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Find a single exchange request by primary key.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        return runQuery(self::SELECT_SQL . " WHERE er.id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * Requests a member has sent.
     *
     * @param int $requesterId
     * @return array
     */
    public function getByRequester(int $requesterId): array {
        return runQuery(
            self::SELECT_SQL . " WHERE er.requester_id = :requester_id ORDER BY er.created_at DESC",
            [':requester_id' => $requesterId]
        )->fetchAll();
    }

    /**
     * Requests received on any of a member's listings.
     *
     * @param int $ownerId
     * @return array
     */
    public function getIncomingForOwner(int $ownerId): array {
        return runQuery(
            self::SELECT_SQL . " WHERE tl.user_id = :owner_id ORDER BY er.created_at DESC",
            [':owner_id' => $ownerId]
        )->fetchAll();
    }

    /**
     * Search requests for the staff monitoring list.
     *
     * @param array $query readListQuery() output.
     * @return array ['rows' => array, 'total' => int]
     */
    public function search(array $query): array {
        $where  = [];
        $params = [];

        if ($query['status'] !== null) {
            $where[] = 'er.status = :status';
            $params[':status'] = $query['status'];
        }
        if ($query['keyword'] !== '') {
            $where[] = '(tl.title LIKE :kw_target OR ol.title LIKE :kw_offered OR u.name LIKE :kw_requester)';
            $params[':kw_target']    = likeContains($query['keyword']);
            $params[':kw_offered']   = likeContains($query['keyword']);
            $params[':kw_requester'] = likeContains($query['keyword']);
        }
        if ($query['date_from'] !== null) {
            $where[] = 'er.created_at >= :date_from';
            $params[':date_from'] = $query['date_from'] . ' 00:00:00';
        }
        if ($query['date_to'] !== null) {
            $where[] = 'er.created_at <= :date_to';
            $params[':date_to'] = $query['date_to'] . ' 23:59:59';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $orderSql = $query['sort'] === 'oldest' ? 'er.created_at ASC, er.id ASC' : 'er.created_at DESC, er.id DESC';

        return fetchPage(
            self::SELECT_SQL . " $whereSql ORDER BY $orderSql",
            "SELECT COUNT(*)
             FROM exchange_requests er
             JOIN users u     ON u.id  = er.requester_id
             JOIN listings tl ON tl.id = er.target_listing_id
             JOIN listings ol ON ol.id = er.offered_listing_id
             $whereSql",
            $params,
            $query
        );
    }

    /**
     * Whether a member already has an active request on a listing
     * (Phase 1 §3.3.4: at most one active request per target listing).
     *
     * Active means still pending, or accepted with its exchange still under
     * way. An accepted request whose exchange was later cancelled (a no-show,
     * say) keeps its 'accepted' status as history, but must not stop the
     * member from requesting the book again.
     *
     * @param int $requesterId
     * @param int $targetListingId
     * @return bool
     */
    public function hasActiveRequest(int $requesterId, int $targetListingId): bool {
        return (int) runQuery("
            SELECT COUNT(*)
            FROM exchange_requests er
            LEFT JOIN transactions t ON t.exchange_request_id = er.id
            WHERE er.requester_id = :requester_id
              AND er.target_listing_id = :listing_id
              AND (er.status = 'pending'
                   OR (er.status = 'accepted' AND t.status IN ('accepted', 'scheduled')))
        ", [':requester_id' => $requesterId, ':listing_id' => $targetListingId])->fetchColumn() > 0;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Create a new pending exchange request.
     *
     * @param array $data Keys: requester_id, target_listing_id, offered_listing_id, message.
     * @return int New request ID.
     */
    public function create(array $data): int {
        runQuery("
            INSERT INTO exchange_requests (requester_id, target_listing_id, offered_listing_id, message, status, created_at)
            VALUES (:requester_id, :target_listing_id, :offered_listing_id, :message, 'pending', NOW())
        ", [
            ':requester_id'       => $data['requester_id'],
            ':target_listing_id'  => $data['target_listing_id'],
            ':offered_listing_id' => $data['offered_listing_id'],
            ':message'            => $data['message'] !== '' ? $data['message'] : null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Mark a request accepted, if it is still pending.
     *
     * @param int $id
     * @return bool False if the request was no longer pending.
     */
    public function markAccepted(int $id): bool {
        return runQuery("
            UPDATE exchange_requests
            SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
            WHERE id = :id AND status = 'pending'
        ", [':id' => $id])->rowCount() === 1;
    }

    /**
     * Mark a request declined with a reason, if it is still pending.
     *
     * @param int    $id
     * @param string $reason Shown to the requester.
     * @return bool False if the request was no longer pending.
     */
    public function markDeclined(int $id, string $reason): bool {
        return runQuery("
            UPDATE exchange_requests
            SET status = 'declined', decline_reason = :reason, responded_at = NOW(), updated_at = NOW()
            WHERE id = :id AND status = 'pending'
        ", [':reason' => $reason, ':id' => $id])->rowCount() === 1;
    }

    /**
     * Move a pending request to 'withdrawn' (by its requester) or 'rejected'
     * (by staff after a report).
     *
     * @param int    $id
     * @param string $status REQUEST_WITHDRAWN or REQUEST_REJECTED.
     * @return bool False if the request was no longer pending.
     */
    public function setStatusIfPending(int $id, string $status): bool {
        return runQuery(
            "UPDATE exchange_requests SET status = :status, updated_at = NOW() WHERE id = :id AND status = 'pending'",
            [':status' => $status, ':id' => $id]
        )->rowCount() === 1;
    }

    /**
     * Decline every other pending request involving either book of a newly
     * accepted exchange (Phase 1 §3.3.5).
     *
     * @param int    $acceptedId The request that was just accepted.
     * @param int[]  $listingIds Both books of that exchange.
     * @param string $reason     Stored as the decline reason.
     * @return array Declined rows (id, requester_id, target_title) for notifications.
     */
    public function declineCompeting(int $acceptedId, array $listingIds, string $reason): array {
        [$inTarget, $targetParams]   = bindInList('target', $listingIds);
        [$inOffered, $offeredParams] = bindInList('offered', $listingIds);

        $rows = runQuery("
            SELECT er.id, er.requester_id, tl.title AS target_title
            FROM exchange_requests er
            JOIN listings tl ON tl.id = er.target_listing_id
            WHERE er.status = 'pending'
              AND er.id <> :accepted_id
              AND (er.target_listing_id IN ($inTarget) OR er.offered_listing_id IN ($inOffered))
            FOR UPDATE
        ", [':accepted_id' => $acceptedId] + $targetParams + $offeredParams)->fetchAll();

        if ($rows) {
            [$inIds, $idParams] = bindInList('request', array_column($rows, 'id'));
            runQuery("
                UPDATE exchange_requests
                SET status = 'declined', decline_reason = :reason, responded_at = NOW(), updated_at = NOW()
                WHERE id IN ($inIds) AND status = 'pending'
            ", [':reason' => $reason] + $idParams);
        }

        return $rows;
    }

    /**
     * Close pending requests on a listing that is leaving the catalogue.
     * Requests for the book are declined; requests offering it are withdrawn.
     *
     * @param int    $listingId
     * @param string $reason Decline reason shown to requesters.
     * @return array Declined rows (id, requester_id, target_title) for notifications.
     */
    public function closePendingForListing(int $listingId, string $reason): array {
        $declined = runQuery("
            SELECT er.id, er.requester_id, tl.title AS target_title
            FROM exchange_requests er
            JOIN listings tl ON tl.id = er.target_listing_id
            WHERE er.status = 'pending' AND er.target_listing_id = :listing_id
            FOR UPDATE
        ", [':listing_id' => $listingId])->fetchAll();

        runQuery("
            UPDATE exchange_requests
            SET status = 'declined', decline_reason = :reason, responded_at = NOW(), updated_at = NOW()
            WHERE status = 'pending' AND target_listing_id = :listing_id
        ", [':reason' => $reason, ':listing_id' => $listingId]);

        runQuery("
            UPDATE exchange_requests SET status = 'withdrawn', updated_at = NOW()
            WHERE status = 'pending' AND offered_listing_id = :listing_id
        ", [':listing_id' => $listingId]);

        return $declined;
    }

    /**
     * Withdraw every pending request a member has sent (account deactivation).
     *
     * @param int $requesterId
     */
    public function withdrawPendingByRequester(int $requesterId): void {
        runQuery(
            "UPDATE exchange_requests SET status = 'withdrawn', updated_at = NOW() WHERE requester_id = :requester_id AND status = 'pending'",
            [':requester_id' => $requesterId]
        );
    }

    /**
     * Cancel requests left pending beyond REQUEST_RESPONSE_DAYS.
     *
     * Free hosting offers no scheduler, so this runs whenever the staff queues
     * load. Call it inside withTransaction() so the rows it reads stay locked
     * until they are updated.
     *
     * @return array Cancelled rows (id, requester_id, target_title) for notifications.
     */
    public function cancelExpired(): array {
        $rows = runQuery("
            SELECT er.id, er.requester_id, tl.title AS target_title
            FROM exchange_requests er
            JOIN listings tl ON tl.id = er.target_listing_id
            WHERE er.status = 'pending' AND er.created_at < NOW() - INTERVAL :days DAY
            FOR UPDATE
        ", [':days' => REQUEST_RESPONSE_DAYS])->fetchAll();

        if ($rows) {
            [$in, $params] = bindInList('request', array_column($rows, 'id'));
            runQuery(
                "UPDATE exchange_requests SET status = 'cancelled', updated_at = NOW() WHERE id IN ($in) AND status = 'pending'",
                $params
            );
        }

        return $rows;
    }
}
