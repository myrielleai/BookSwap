<?php

/**
 * ExchangeModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `exchange_requests` table.
 *
 * Implemented with live PDO operations for Member 4 (Database & API integration).
 *
 * TABLE ASSUMED: exchange_requests
 *   id, requester_id (FK→users), target_listing_id (FK→listings),
 *   offered_listing_id (FK→listings), message, status,
 *   decline_reason, staff_note, created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

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
        if (!$this->db) return null;
        $sql = "SELECT er.*, u.name AS requester_name,
                       tl.title AS target_title, tl.user_id AS target_owner_id,
                       ol.title AS offered_title, ol.user_id AS offered_owner_id
                FROM exchange_requests er
                JOIN users u      ON u.id  = er.requester_id
                JOIN listings tl  ON tl.id = er.target_listing_id
                JOIN listings ol  ON ol.id = er.offered_listing_id
                WHERE er.id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all requests made by a specific user (their sent requests dashboard).
     *
     * @param int $requesterId
     * @return array
     */
    public function getByRequester(int $requesterId): array {
        if (!$this->db) return [];
        $sql = "SELECT er.*, tl.title AS target_title, ol.title AS offered_title
                FROM exchange_requests er
                LEFT JOIN listings tl ON tl.id = er.target_listing_id
                LEFT JOIN listings ol ON ol.id = er.offered_listing_id
                WHERE er.requester_id = :id ORDER BY er.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $requesterId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all requests targeting a specific listing (incoming requests for the owner).
     *
     * @param int $listingId
     * @return array
     */
    public function getByTargetListing(int $listingId): array {
        if (!$this->db) return [];
        $sql = "SELECT er.*, u.name AS requester_name, ol.title AS offered_title
                FROM exchange_requests er
                JOIN users u ON u.id = er.requester_id
                LEFT JOIN listings ol ON ol.id = er.offered_listing_id
                WHERE er.target_listing_id = :listing_id ORDER BY er.created_at ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':listing_id' => $listingId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all pending requests awaiting Staff endorsement.
     *
     * @return array
     */
    public function getPendingForStaff(): array {
        if (!$this->db) return [];
        $sql = "SELECT er.*, u.name AS requester_name, tl.title AS target_title, ol.title AS offered_title
                FROM exchange_requests er
                JOIN users u     ON u.id  = er.requester_id
                JOIN listings tl ON tl.id = er.target_listing_id
                JOIN listings ol ON ol.id = er.offered_listing_id
                WHERE er.status = 'pending' ORDER BY er.created_at ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll() ?: [];
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
        if (!$this->db) return false;
        $sql = "SELECT COUNT(*) FROM exchange_requests
                WHERE requester_id = :rid AND target_listing_id = :lid
                AND status NOT IN ('declined', 'rejected', 'withdrawn', 'cancelled')";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':rid' => $requesterId, ':lid' => $targetListingId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Create a new exchange request.
     *
     * @param array $data Keys: requester_id, target_listing_id, offered_listing_id, message
     * @return int  New request's auto-increment ID.
     */
    public function create(array $data): int {
        if (!$this->db) return 0;
        $stmt = $this->db->prepare("
            INSERT INTO exchange_requests
            (requester_id, target_listing_id, offered_listing_id, message, status, created_at)
            VALUES (:requester_id, :target_listing_id, :offered_listing_id, :message, 'pending', NOW())
        ");
        $stmt->execute([
            ':requester_id'       => $data['requester_id'],
            ':target_listing_id'  => $data['target_listing_id'],
            ':offered_listing_id' => $data['offered_listing_id'],
            ':message'            => $data['message'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
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
        if (!$this->db) return false;
        $stmt = $this->db->prepare("
            UPDATE exchange_requests
            SET status=:status, staff_note=:note, updated_at=NOW() WHERE id=:id
        ");
        return $stmt->execute([':status' => $status, ':note' => $note, ':id' => $id]);
    }

    /**
     * Auto-cancel requests that have been pending beyond the response window.
     * Called by a scheduled task or on every staff dashboard load.
     *
     * @return int  Number of requests cancelled.
     */
    public function cancelExpired(): int {
        if (!$this->db) return 0;
        $days = defined('REQUEST_RESPONSE_DAYS') ? REQUEST_RESPONSE_DAYS : 7;
        $stmt = $this->db->prepare("
            UPDATE exchange_requests
            SET status = 'cancelled', updated_at = NOW()
            WHERE status = 'pending'
            AND created_at < DATE_SUB(NOW(), INTERVAL :days DAY)
        ");
        $stmt->execute([':days' => $days]);
        return $stmt->rowCount();
    }
}
