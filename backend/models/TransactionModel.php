<?php

/**
 * TransactionModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations for the `transactions` and `handover_slots` tables.
 *
 * Implemented with live PDO operations for Member 4 (Database & API integration).
 *
 * TABLES ASSUMED:
 *   transactions
 *     id, exchange_request_id (FK→exchange_requests), status,
 *     cancel_reason, reschedule_count, handled_by (FK→users/staff),
 *     created_at, updated_at
 *
 *   handover_slots
 *     id, transaction_id (FK→transactions), location_id (FK→meetup_locations),
 *     slot_date, slot_time, confirmed_by_a (bool), confirmed_by_b (bool),
 *     no_show_recorded (bool), created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class TransactionModel {

    private ?PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Find a transaction by primary key, including its handover slot if any.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        if (!$this->db) return null;
        $sql = "SELECT t.*, hs.slot_date, hs.slot_time, hs.location_id, ml.name AS location_name, ml.address AS location_address,
                       hs.confirmed_by_a, hs.confirmed_by_b, hs.no_show_recorded,
                       er.requester_id, er.target_listing_id, er.offered_listing_id
                FROM transactions t
                LEFT JOIN handover_slots hs ON hs.transaction_id = t.id
                LEFT JOIN meetup_locations ml ON ml.id = hs.location_id
                LEFT JOIN exchange_requests er ON er.id = t.exchange_request_id
                WHERE t.id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all transactions viewable by a specific user.
     * Used on the Customer dashboard to show their transaction history.
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        if (!$this->db) return [];
        $sql = "SELECT t.*, hs.slot_date, hs.slot_time, ml.name AS location_name
                FROM transactions t
                JOIN exchange_requests er ON er.id = t.exchange_request_id
                JOIN listings tl ON tl.id = er.target_listing_id
                LEFT JOIN handover_slots hs ON hs.transaction_id = t.id
                LEFT JOIN meetup_locations ml ON ml.id = hs.location_id
                WHERE er.requester_id = :uid OR tl.user_id = :uid2
                ORDER BY t.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId, ':uid2' => $userId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all transactions handled by a Staff member (for their dashboard).
     *
     * @param int $staffId
     * @return array
     */
    public function getByStaffId(int $staffId): array {
        if (!$this->db) return [];
        $sql = "SELECT t.*, hs.slot_date, hs.slot_time, ml.name AS location_name
                FROM transactions t
                LEFT JOIN handover_slots hs ON hs.transaction_id = t.id
                LEFT JOIN meetup_locations ml ON ml.id = hs.location_id
                WHERE t.handled_by = :staff_id ORDER BY t.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':staff_id' => $staffId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all transactions scheduled for today — shown on the Staff dashboard.
     *
     * @return array
     */
    public function getScheduledToday(): array {
        if (!$this->db) return [];
        $sql = "SELECT t.*, hs.slot_time, ml.name AS location_name
                FROM transactions t
                JOIN handover_slots hs ON hs.transaction_id = t.id
                LEFT JOIN meetup_locations ml ON ml.id = hs.location_id
                WHERE t.status = 'scheduled' AND hs.slot_date = CURDATE()
                ORDER BY hs.slot_time ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll() ?: [];
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Create a new transaction record when a Staff member approves a request.
     *
     * @param int $exchangeRequestId
     * @param int $staffId            The Staff member processing this transaction.
     * @return int  New transaction's auto-increment ID.
     */
    public function create(int $exchangeRequestId, int $staffId): int {
        if (!$this->db) return 0;
        $stmt = $this->db->prepare("
            INSERT INTO transactions (exchange_request_id, status, handled_by, created_at)
            VALUES (:er_id, 'pending', :staff_id, NOW())
        ");
        $stmt->execute([':er_id' => $exchangeRequestId, ':staff_id' => $staffId]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Update the status of a transaction.
     * All status changes go through here; a reason is required for cancellations.
     *
     * @param int         $id           Transaction primary key.
     * @param string      $status       One of TX_* constants.
     * @param string|null $cancelReason Required when $status = TX_CANCELLED.
     * @return bool
     */
    public function updateStatus(int $id, string $status, ?string $cancelReason = null): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("
            UPDATE transactions SET status=:status, cancel_reason=:reason, updated_at=NOW()
            WHERE id=:id
        ");
        return $stmt->execute([':status' => $status, ':reason' => $cancelReason, ':id' => $id]);
    }

    // ── Handover Slot Methods ─────────────────────────────────────────────────

    /**
     * Assign a handover slot to a transaction (Staff action).
     *
     * @param int    $transactionId
     * @param int    $locationId     FK into meetup_locations table.
     * @param string $slotDate       Date string 'YYYY-MM-DD'.
     * @param string $slotTime       Time string 'HH:MM'.
     * @return int   New handover_slot ID.
     */
    public function assignHandoverSlot(int $transactionId, int $locationId, string $slotDate, string $slotTime): int {
        if (!$this->db) return 0;
        $stmt = $this->db->prepare("
            INSERT INTO handover_slots (transaction_id, location_id, slot_date, slot_time, created_at)
            VALUES (:tx_id, :loc_id, :slot_date, :slot_time, NOW())
            ON DUPLICATE KEY UPDATE location_id = VALUES(location_id), slot_date = VALUES(slot_date), slot_time = VALUES(slot_time), updated_at = NOW()
        ");
        $stmt->execute([
            ':tx_id'     => $transactionId,
            ':loc_id'    => $locationId,
            ':slot_date' => $slotDate,
            ':slot_time' => $slotTime,
        ]);
        return (int) ($this->db->lastInsertId() ?: $transactionId);
    }

    /**
     * Update an existing handover slot (reschedule).
     * The reschedule_count on the transaction must be checked by the controller
     * before calling this — max one reschedule per transaction (MAX_RESCHEDULES).
     *
     * @param int    $transactionId
     * @param int    $locationId
     * @param string $slotDate
     * @param string $slotTime
     * @return bool
     */
    public function rescheduleHandoverSlot(int $transactionId, int $locationId, string $slotDate, string $slotTime): bool {
        if (!$this->db) return false;
        try {
            $this->db->beginTransaction();

            $stmt1 = $this->db->prepare("
                UPDATE handover_slots
                SET location_id = :loc_id, slot_date = :slot_date, slot_time = :slot_time, updated_at = NOW()
                WHERE transaction_id = :tx_id
            ");
            $stmt1->execute([
                ':loc_id'    => $locationId,
                ':slot_date' => $slotDate,
                ':slot_time' => $slotTime,
                ':tx_id'     => $transactionId,
            ]);

            $stmt2 = $this->db->prepare("
                UPDATE transactions
                SET reschedule_count = reschedule_count + 1, updated_at = NOW()
                WHERE id = :tx_id
            ");
            $stmt2->execute([':tx_id' => $transactionId]);

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('[TransactionModel Reschedule Error] ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Record a no-show against a handover slot.
     * After recording, the controller must reset both listings to 'available'.
     *
     * @param int $transactionId
     * @return bool
     */
    public function recordNoShow(int $transactionId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("UPDATE handover_slots SET no_show_recorded = 1, updated_at=NOW() WHERE transaction_id = :tx_id");
        return $stmt->execute([':tx_id' => $transactionId]);
    }

    /**
     * Record that one party has confirmed receipt after the physical handover.
     * When both parties confirm, the controller marks the transaction 'completed'.
     *
     * @param int  $transactionId
     * @param bool $isPartyA  True if this is the listing owner; false if the requester.
     * @return bool
     */
    public function confirmReceipt(int $transactionId, bool $isPartyA): bool {
        if (!$this->db) return false;
        $column = $isPartyA ? 'confirmed_by_a' : 'confirmed_by_b';
        $stmt = $this->db->prepare("UPDATE handover_slots SET {$column} = 1, updated_at=NOW() WHERE transaction_id = :tx_id");
        return $stmt->execute([':tx_id' => $transactionId]);
    }

    /**
     * Check whether both parties have confirmed receipt.
     * The controller calls this after each confirmReceipt() to decide whether to
     * advance the transaction to TX_COMPLETED.
     *
     * @param int $transactionId
     * @return bool True if both confirmed_by_a and confirmed_by_b are 1.
     */
    public function bothPartiesConfirmed(int $transactionId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("SELECT confirmed_by_a, confirmed_by_b FROM handover_slots WHERE transaction_id = :tx_id LIMIT 1");
        $stmt->execute([':tx_id' => $transactionId]);
        $row = $stmt->fetch();
        return $row && !empty($row['confirmed_by_a']) && !empty($row['confirmed_by_b']);
    }
}
