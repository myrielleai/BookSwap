<?php

/**
 * TransactionModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations for the `transactions` table, including booking a
 * slot from the handover pool.
 *
 * Phase 1 §3.2.3: a transaction is created when the owner accepts a request
 * and moves Accepted → Scheduled → Completed | Cancelled. Only Staff advances
 * it (§4.2); members only record their own receipt confirmation.
 *
 * TABLE: transactions
 *   id, exchange_request_id (FK→exchange_requests, unique), handled_by (FK→users),
 *   slot_id (FK→handover_slots), status, reschedule_count, cancel_reason,
 *   requester_confirmed, owner_confirmed, completed_at, created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../helpers/response.php';

class TransactionModel {

    private PDO $db;

    private const JOINS_SQL = "
        FROM transactions t
        JOIN exchange_requests er     ON er.id  = t.exchange_request_id
        JOIN listings tl              ON tl.id  = er.target_listing_id
        JOIN listings ol              ON ol.id  = er.offered_listing_id
        JOIN users req                ON req.id = er.requester_id
        JOIN users own                ON own.id = tl.user_id
        LEFT JOIN users h             ON h.id   = t.handled_by
        LEFT JOIN handover_slots hs   ON hs.id  = t.slot_id
        LEFT JOIN meetup_locations ml ON ml.id  = hs.location_id";

    // Full detail, including both members' phone numbers. Controllers decide
    // who may see the numbers (Phase 1 §4.2 and §4.3).
    private const DETAIL_SQL = "
        SELECT t.*,
               er.requester_id, er.target_listing_id, er.offered_listing_id,
               tl.user_id AS owner_id, tl.title AS target_title, ol.title AS offered_title,
               req.name AS requester_name, req.phone AS requester_phone,
               own.name AS owner_name,     own.phone AS owner_phone,
               h.name   AS handler_name,
               hs.slot_date, hs.start_time, hs.end_time, hs.location_id,
               ml.name AS location_name, ml.address AS location_address, ml.city AS location_city"
        . self::JOINS_SQL;

    // The same rows without phone numbers, for lists.
    private const LIST_SQL = "
        SELECT t.id, t.exchange_request_id, t.status, t.slot_id, t.handled_by, t.reschedule_count,
               t.requester_confirmed, t.owner_confirmed, t.cancel_reason, t.completed_at,
               t.created_at, t.updated_at,
               er.requester_id, er.target_listing_id, er.offered_listing_id,
               tl.user_id AS owner_id, tl.title AS target_title, ol.title AS offered_title,
               req.name AS requester_name, own.name AS owner_name, h.name AS handler_name,
               hs.slot_date, hs.start_time, hs.end_time,
               ml.name AS location_name, ml.city AS location_city"
        . self::JOINS_SQL;

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Find a transaction with its exchange, both members, and booked slot.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        return runQuery(self::DETAIL_SQL . " WHERE t.id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * A member's transactions, as requester or as owner of the requested book.
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        return runQuery(
            self::LIST_SQL . " WHERE er.requester_id = :requester_id OR tl.user_id = :owner_id ORDER BY t.created_at DESC",
            [':requester_id' => $userId, ':owner_id' => $userId]
        )->fetchAll();
    }

    /**
     * Search transactions for the staff list.
     *
     * @param array $query readListQuery() output (sort: newest | oldest | slot).
     * @return array ['rows' => array, 'total' => int]
     */
    public function search(array $query): array {
        $where  = [];
        $params = [];

        if ($query['status'] !== null) {
            $where[] = 't.status = :status';
            $params[':status'] = $query['status'];
        }
        if ($query['keyword'] !== '') {
            $where[] = '(tl.title LIKE :kw_target OR ol.title LIKE :kw_offered OR req.name LIKE :kw_requester OR own.name LIKE :kw_owner)';
            foreach ([':kw_target', ':kw_offered', ':kw_requester', ':kw_owner'] as $name) {
                $params[$name] = likeContains($query['keyword']);
            }
        }
        if ($query['date_from'] !== null) {
            $where[] = 't.created_at >= :date_from';
            $params[':date_from'] = $query['date_from'] . ' 00:00:00';
        }
        if ($query['date_to'] !== null) {
            $where[] = 't.created_at <= :date_to';
            $params[':date_to'] = $query['date_to'] . ' 23:59:59';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $orderSql = [
            'newest' => 't.created_at DESC, t.id DESC',
            'oldest' => 't.created_at ASC, t.id ASC',
            'slot'   => 'hs.slot_date IS NULL, hs.slot_date ASC, hs.start_time ASC, t.id ASC',
        ][$query['sort']];

        return fetchPage(
            self::LIST_SQL . " $whereSql ORDER BY $orderSql",
            "SELECT COUNT(*) " . self::JOINS_SQL . " $whereSql",
            $params,
            $query
        );
    }

    /**
     * Accepted exchanges still waiting for a handover slot, oldest first.
     *
     * @return array
     */
    public function getAwaitingSchedule(): array {
        return runQuery(self::LIST_SQL . " WHERE t.status = 'accepted' ORDER BY t.created_at ASC")->fetchAll();
    }

    /**
     * Handovers scheduled for today, by start time.
     *
     * @return array
     */
    public function getScheduledToday(): array {
        return runQuery(
            self::LIST_SQL . " WHERE t.status = 'scheduled' AND hs.slot_date = CURDATE() ORDER BY hs.start_time ASC"
        )->fetchAll();
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Open a transaction for a request the owner has just accepted.
     *
     * @param int $exchangeRequestId
     * @return int New transaction ID.
     */
    public function create(int $exchangeRequestId): int {
        runQuery(
            "INSERT INTO transactions (exchange_request_id, status, created_at, updated_at) VALUES (:request_id, 'accepted', NOW(), NOW())",
            [':request_id' => $exchangeRequestId]
        );
        return (int) $this->db->lastInsertId();
    }

    /**
     * Book a slot from the handover pool for a transaction, or move it to a
     * different slot (reschedule).
     *
     * Runs in one database transaction with the transaction and slot rows
     * locked, so two moderators cannot book the same slot, and a reschedule
     * frees the old slot in the same step. Throws ApiException (404/409/422)
     * when a rule is broken; nothing is saved in that case.
     *
     * @param int  $transactionId
     * @param int  $slotId
     * @param int  $staffId      Recorded as handled_by if no moderator is set yet.
     * @param bool $isReschedule True to move an already scheduled handover.
     */
    public function bookSlot(int $transactionId, int $slotId, int $staffId, bool $isReschedule): void {
        withTransaction(function () use ($transactionId, $slotId, $staffId, $isReschedule) {
            $tx = runQuery(
                "SELECT id, status, slot_id, reschedule_count FROM transactions WHERE id = :id FOR UPDATE",
                [':id' => $transactionId]
            )->fetch();

            if (!$tx) {
                throw new ApiException('Transaction not found.', 404);
            }
            if ($tx['status'] !== ($isReschedule ? TX_SCHEDULED : TX_ACCEPTED)) {
                throw new ApiException(
                    $isReschedule ? 'Only a scheduled handover can be rescheduled.' : 'Only an accepted exchange can be scheduled.',
                    409
                );
            }
            if ($isReschedule && (int) $tx['reschedule_count'] >= MAX_RESCHEDULES) {
                throw new ApiException('This handover has already been rescheduled the maximum number of times (' . MAX_RESCHEDULES . ').', 409);
            }
            if ((int) $tx['slot_id'] === $slotId) {
                throw new ApiException('Choose a different slot from the one already booked.', 422);
            }

            $slot = runQuery("
                SELECT hs.id, hs.is_available, hs.slot_date >= CURDATE() AS is_upcoming, ml.is_active AS location_active
                FROM handover_slots hs
                JOIN meetup_locations ml ON ml.id = hs.location_id
                WHERE hs.id = :id
                FOR UPDATE
            ", [':id' => $slotId])->fetch();

            if (!$slot) {
                throw new ApiException('Handover slot not found.', 404);
            }
            if (!(int) $slot['is_available'] || !(int) $slot['is_upcoming'] || !(int) $slot['location_active']) {
                throw new ApiException('That handover slot is no longer available.', 409);
            }

            if ($isReschedule && $tx['slot_id'] !== null) {
                runQuery(
                    "UPDATE handover_slots SET is_available = 1 WHERE id = :id AND slot_date >= CURDATE()",
                    [':id' => (int) $tx['slot_id']]
                );
            }

            runQuery("UPDATE handover_slots SET is_available = 0 WHERE id = :id", [':id' => $slotId]);

            runQuery("
                UPDATE transactions
                SET slot_id = :slot_id,
                    status = 'scheduled',
                    handled_by = COALESCE(handled_by, :staff_id),
                    reschedule_count = reschedule_count + :increment,
                    updated_at = NOW()
                WHERE id = :id
            ", [
                ':slot_id'   => $slotId,
                ':staff_id'  => $staffId,
                ':increment' => $isReschedule ? 1 : 0,
                ':id'        => $transactionId,
            ]);
        });
    }

    /**
     * Record one member's confirmation that they received their book.
     *
     * @param int  $id
     * @param bool $asOwner True for the owner of the requested book, false for the requester.
     */
    public function confirmReceipt(int $id, bool $asOwner): void {
        $column = $asOwner ? 'owner_confirmed' : 'requester_confirmed';
        runQuery("UPDATE transactions SET $column = 1, updated_at = NOW() WHERE id = :id", [':id' => $id]);
    }

    /**
     * Mark a transaction completed, but only if it is scheduled and both
     * members have confirmed receipt.
     *
     * @param int $id
     * @return bool False if those conditions were not met.
     */
    public function complete(int $id): bool {
        return runQuery("
            UPDATE transactions
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE id = :id AND status = 'scheduled' AND requester_confirmed = 1 AND owner_confirmed = 1
        ", [':id' => $id])->rowCount() === 1;
    }

    /**
     * Cancel an accepted or scheduled transaction.
     *
     * @param int    $id
     * @param string $reason           Stored as cancel_reason.
     * @param bool   $freeUpcomingSlot Return a booked future slot to the pool.
     *                                 False for no-shows, whose slot has already passed.
     * @return bool False if the transaction was not accepted or scheduled.
     */
    public function cancel(int $id, string $reason, bool $freeUpcomingSlot = true): bool {
        if ($freeUpcomingSlot) {
            runQuery("
                UPDATE handover_slots hs
                JOIN transactions t ON t.slot_id = hs.id
                SET hs.is_available = 1
                WHERE t.id = :id AND t.status = 'scheduled' AND hs.slot_date >= CURDATE()
            ", [':id' => $id]);
        }

        return runQuery("
            UPDATE transactions
            SET status = 'cancelled', cancel_reason = :reason, updated_at = NOW()
            WHERE id = :id AND status IN ('accepted', 'scheduled')
        ", [':reason' => $reason, ':id' => $id])->rowCount() === 1;
    }
}
