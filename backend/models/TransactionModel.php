<?php

/**
 * TransactionModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations for the `transactions` and `handover_slots` tables.
 *
 * A Transaction is created when a Staff member approves an exchange request.
 * It tracks the workflow: Pending → Approved → Scheduled → Completed|Cancelled.
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
        // TODO (DB):
        // SQL: SELECT t.*, hs.slot_date, hs.slot_time, ml.name AS location_name,
        //             hs.confirmed_by_a, hs.confirmed_by_b, hs.no_show_recorded
        //      FROM transactions t
        //      LEFT JOIN handover_slots hs ON hs.transaction_id = t.id
        //      LEFT JOIN meetup_locations ml ON ml.id = hs.location_id
        //      WHERE t.id = :id LIMIT 1
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':id' => $id]);
        // $result = $stmt->fetch();
        // return $result ?: null;

        return null; // stub
    }

    /**
     * Get all transactions viewable by a specific user.
     * Used on the Customer dashboard to show their transaction history.
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        // TODO (DB):
        // Join transactions → exchange_requests to find ones where the user
        // is either the requester or the listing owner.
        //
        // SQL: SELECT t.* FROM transactions t
        //      JOIN exchange_requests er ON er.id = t.exchange_request_id
        //      JOIN listings tl ON tl.id = er.target_listing_id
        //      WHERE er.requester_id = :uid OR tl.user_id = :uid
        //      ORDER BY t.created_at DESC
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':uid' => $userId]);
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Get all transactions handled by a Staff member (for their dashboard).
     *
     * @param int $staffId
     * @return array
     */
    public function getByStaffId(int $staffId): array {
        // TODO (DB):
        // SQL: SELECT * FROM transactions WHERE handled_by = :staff_id ORDER BY created_at DESC
        //
        // $stmt = $this->db->prepare("SELECT * FROM transactions WHERE handled_by = :staff_id ORDER BY created_at DESC");
        // $stmt->execute([':staff_id' => $staffId]);
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Get all transactions scheduled for today — shown on the Staff dashboard.
     *
     * @return array
     */
    public function getScheduledToday(): array {
        // TODO (DB):
        // SQL: SELECT t.*, hs.slot_time, ml.name AS location_name
        //      FROM transactions t
        //      JOIN handover_slots hs ON hs.transaction_id = t.id
        //      LEFT JOIN meetup_locations ml ON ml.id = hs.location_id
        //      WHERE t.status = 'scheduled' AND hs.slot_date = CURDATE()
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute();
        // return $stmt->fetchAll();

        return []; // stub
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
        // TODO (DB):
        // SQL: INSERT INTO transactions (exchange_request_id, status, handled_by, created_at)
        //      VALUES (:er_id, 'pending', :staff_id, NOW())
        //
        // $stmt = $this->db->prepare("
        //     INSERT INTO transactions (exchange_request_id, status, handled_by, created_at)
        //     VALUES (:er_id, 'pending', :staff_id, NOW())
        // ");
        // $stmt->execute([':er_id' => $exchangeRequestId, ':staff_id' => $staffId]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
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
        // TODO (DB):
        // SQL: UPDATE transactions SET status=:status, cancel_reason=:reason, updated_at=NOW()
        //      WHERE id=:id
        //
        // $stmt = $this->db->prepare("
        //     UPDATE transactions SET status=:status, cancel_reason=:reason, updated_at=NOW()
        //     WHERE id=:id
        // ");
        // return $stmt->execute([':status' => $status, ':reason' => $cancelReason, ':id' => $id]);

        return false; // stub
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
        // TODO (DB):
        // SQL: INSERT INTO handover_slots (transaction_id, location_id, slot_date, slot_time, created_at)
        //      VALUES (:tx_id, :loc_id, :slot_date, :slot_time, NOW())
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([...]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
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
        // TODO (DB):
        // SQL (two queries — run in a transaction):
        //   UPDATE handover_slots SET location_id=:loc_id, slot_date=:date, slot_time=:time, updated_at=NOW()
        //   WHERE transaction_id=:tx_id
        //
        //   UPDATE transactions SET reschedule_count = reschedule_count + 1, updated_at=NOW()
        //   WHERE id=:tx_id
        //
        // $this->db->beginTransaction();
        // ... execute both queries ...
        // $this->db->commit();
        // return true;

        return false; // stub
    }

    /**
     * Record a no-show against a handover slot.
     * After recording, the controller must reset both listings to 'available'.
     *
     * @param int $transactionId
     * @return bool
     */
    public function recordNoShow(int $transactionId): bool {
        // TODO (DB):
        // SQL: UPDATE handover_slots SET no_show_recorded = 1, updated_at=NOW()
        //      WHERE transaction_id = :tx_id
        //
        // $stmt = $this->db->prepare("UPDATE handover_slots SET no_show_recorded = 1, updated_at=NOW() WHERE transaction_id = :tx_id");
        // return $stmt->execute([':tx_id' => $transactionId]);

        return false; // stub
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
        // TODO (DB):
        // Choose the correct column based on which party is confirming.
        // $column = $isPartyA ? 'confirmed_by_a' : 'confirmed_by_b';
        // SQL: UPDATE handover_slots SET {$column} = 1, updated_at=NOW()
        //      WHERE transaction_id = :tx_id
        //
        // $stmt = $this->db->prepare("UPDATE handover_slots SET {$column} = 1, updated_at=NOW() WHERE transaction_id = :tx_id");
        // return $stmt->execute([':tx_id' => $transactionId]);

        return false; // stub
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
        // TODO (DB):
        // SQL: SELECT confirmed_by_a, confirmed_by_b FROM handover_slots
        //      WHERE transaction_id = :tx_id LIMIT 1
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->execute([':tx_id' => $transactionId]);
        // $row = $stmt->fetch();
        // return $row && $row['confirmed_by_a'] && $row['confirmed_by_b'];

        return false; // stub
    }
}
