<?php

/**
 * ExchangeModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `exchange_requests` table.
 *
 * TABLE ASSUMED: exchange_requests
 *   id, requester_id (FK→users), target_listing_id (FK→listings),
 *   offered_listing_id (FK→listings), message, status,
 *   decline_reason, staff_note, created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class ExchangeModel {

    private ?PDO $db;

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
        // TODO (DB):
        // SQL: SELECT er.*, u.name AS requester_name,
        //             tl.title AS target_title, ol.title AS offered_title
        //      FROM exchange_requests er
        //      JOIN users u      ON u.id  = er.requester_id
        //      JOIN listings tl  ON tl.id = er.target_listing_id
        //      JOIN listings ol  ON ol.id = er.offered_listing_id
        //      WHERE er.id = :id LIMIT 1
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':id' => $id]);
        // $result = $stmt->fetch();
        // return $result ?: null;

        return null; // stub
    }

    /**
     * Get all requests made by a specific user (their sent requests dashboard).
     *
     * @param int $requesterId
     * @return array
     */
    public function getByRequester(int $requesterId): array {
        // TODO (DB):
        // SQL: SELECT * FROM exchange_requests WHERE requester_id = :id ORDER BY created_at DESC
        //
        // $stmt = $this->db->prepare("SELECT * FROM exchange_requests WHERE requester_id = :id ORDER BY created_at DESC");
        // $stmt->execute([':id' => $requesterId]);
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Get all requests targeting a specific listing (incoming requests for the owner).
     *
     * @param int $listingId
     * @return array
     */
    public function getByTargetListing(int $listingId): array {
        // TODO (DB):
        // SQL: SELECT er.*, u.name AS requester_name
        //      FROM exchange_requests er
        //      JOIN users u ON u.id = er.requester_id
        //      WHERE er.target_listing_id = :listing_id ORDER BY er.created_at ASC
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':listing_id' => $listingId]);
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Get all pending requests awaiting Staff endorsement.
     *
     * @return array
     */
    public function getPendingForStaff(): array {
        // TODO (DB):
        // SQL: SELECT er.*, u.name AS requester_name, tl.title AS target_title
        //      FROM exchange_requests er
        //      JOIN users u     ON u.id  = er.requester_id
        //      JOIN listings tl ON tl.id = er.target_listing_id
        //      WHERE er.status = 'pending' ORDER BY er.created_at ASC
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute();
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Check whether a user already has an active request on a given listing.
     * Enforces the one-request-per-listing rule.
     *
     * @param int $requesterId
     * @param int $targetListingId
     * @return bool  True if a duplicate active request exists.
     */
    public function hasActiveRequest(int $requesterId, int $targetListingId): bool {
        // TODO (DB):
        // SQL: SELECT COUNT(*) FROM exchange_requests
        //      WHERE requester_id = :rid AND target_listing_id = :lid
        //      AND status NOT IN ('declined', 'rejected', 'withdrawn', 'cancelled')
        //
        // $stmt = $this->db->prepare("
        //     SELECT COUNT(*) FROM exchange_requests
        //     WHERE requester_id = :rid AND target_listing_id = :lid
        //     AND status NOT IN ('declined','rejected','withdrawn','cancelled')
        // ");
        // $stmt->execute([':rid' => $requesterId, ':lid' => $targetListingId]);
        // return (int) $stmt->fetchColumn() > 0;

        return false; // stub
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Create a new exchange request.
     *
     * @param array $data Keys: requester_id, target_listing_id, offered_listing_id, message
     * @return int  New request's auto-increment ID.
     */
    public function create(array $data): int {
        // TODO (DB):
        // SQL: INSERT INTO exchange_requests
        //      (requester_id, target_listing_id, offered_listing_id, message, status, created_at)
        //      VALUES (:requester_id, :target_listing_id, :offered_listing_id, :message, 'pending', NOW())
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([...]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
    }

    /**
     * Update the status of an exchange request.
     * Used by Staff (endorse/hold/reject) and the Customer (accept/decline/withdraw).
     *
     * @param int         $id        Request primary key.
     * @param string      $status    One of REQUEST_* constants.
     * @param string|null $note      Optional staff or decline reason.
     * @return bool
     */
    public function updateStatus(int $id, string $status, ?string $note = null): bool {
        // TODO (DB):
        // SQL: UPDATE exchange_requests
        //      SET status=:status, staff_note=:note, updated_at=NOW() WHERE id=:id
        //
        // $stmt = $this->db->prepare("
        //     UPDATE exchange_requests
        //     SET status=:status, staff_note=:note, updated_at=NOW() WHERE id=:id
        // ");
        // return $stmt->execute([':status' => $status, ':note' => $note, ':id' => $id]);

        return false; // stub
    }

    /**
     * Auto-cancel requests that have been pending beyond the response window.
     * Called by a scheduled task or on every staff dashboard load.
     *
     * @return int  Number of requests cancelled.
     */
    public function cancelExpired(): int {
        // TODO (DB):
        // SQL: UPDATE exchange_requests
        //      SET status = 'cancelled', updated_at = NOW()
        //      WHERE status = 'pending'
        //      AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)
        //
        // $stmt = $this->db->prepare("
        //     UPDATE exchange_requests
        //     SET status = 'cancelled', updated_at = NOW()
        //     WHERE status = 'pending'
        //     AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)
        // ");
        // $stmt->execute([':days' => REQUEST_RESPONSE_DAYS]);
        // return $stmt->rowCount();

        return 0; // stub
    }
}
