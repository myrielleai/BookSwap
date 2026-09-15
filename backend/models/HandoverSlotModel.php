<?php

/**
 * HandoverSlotModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * The pool of handover slots defined by the Administrator (table: handover_slots).
 *
 * Phase 1 §3.1.6 and §3.2.4: the Administrator defines the meetup points and
 * time slots; Staff assign each accepted exchange a slot drawn from that pool.
 * Booking a slot is done by TransactionModel::bookSlot().
 *
 * TABLE: handover_slots
 *   id, location_id (FK→meetup_locations), slot_date, start_time, end_time,
 *   is_available, created_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';

class HandoverSlotModel {

    private PDO $db;

    private const SELECT_SQL = "
        SELECT hs.*,
               ml.name    AS location_name,
               ml.address AS location_address,
               ml.city    AS location_city,
               (SELECT t.id FROM transactions t
                 WHERE t.slot_id = hs.id AND t.status = 'scheduled' LIMIT 1) AS booked_transaction_id
        FROM handover_slots hs
        JOIN meetup_locations ml ON ml.id = hs.location_id";

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Find one slot.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        return runQuery(self::SELECT_SQL . " WHERE hs.id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * Upcoming open slots at active locations, soonest first. Shown to Staff
     * when scheduling.
     *
     * @param int|null    $locationId
     * @param string|null $dateFrom YYYY-MM-DD
     * @param string|null $dateTo   YYYY-MM-DD
     * @return array
     */
    public function getUpcomingAvailable(?int $locationId, ?string $dateFrom, ?string $dateTo): array {
        $where  = ['hs.is_available = 1', 'hs.slot_date >= CURDATE()', 'ml.is_active = 1'];
        $params = [];

        if ($locationId !== null) {
            $where[] = 'hs.location_id = :location_id';
            $params[':location_id'] = $locationId;
        }
        if ($dateFrom !== null) {
            $where[] = 'hs.slot_date >= :date_from';
            $params[':date_from'] = $dateFrom;
        }
        if ($dateTo !== null) {
            $where[] = 'hs.slot_date <= :date_to';
            $params[':date_to'] = $dateTo;
        }

        return runQuery(
            self::SELECT_SQL . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY hs.slot_date, hs.start_time LIMIT 200',
            $params
        )->fetchAll();
    }

    /**
     * Search the whole pool, past and future, for the Administrator.
     *
     * @param array    $query      readListQuery() output (status: available | unavailable; sort: soonest | latest).
     * @param int|null $locationId
     * @return array ['rows' => array, 'total' => int]
     */
    public function search(array $query, ?int $locationId): array {
        $where  = [];
        $params = [];

        if ($query['status'] !== null) {
            $where[] = 'hs.is_available = :is_available';
            $params[':is_available'] = $query['status'] === 'available' ? 1 : 0;
        }
        if ($locationId !== null) {
            $where[] = 'hs.location_id = :location_id';
            $params[':location_id'] = $locationId;
        }
        if ($query['date_from'] !== null) {
            $where[] = 'hs.slot_date >= :date_from';
            $params[':date_from'] = $query['date_from'];
        }
        if ($query['date_to'] !== null) {
            $where[] = 'hs.slot_date <= :date_to';
            $params[':date_to'] = $query['date_to'];
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $orderSql = $query['sort'] === 'latest'
            ? 'hs.slot_date DESC, hs.start_time DESC'
            : 'hs.slot_date ASC, hs.start_time ASC';

        return fetchPage(
            self::SELECT_SQL . " $whereSql ORDER BY $orderSql",
            "SELECT COUNT(*) FROM handover_slots hs $whereSql",
            $params,
            $query
        );
    }

    /**
     * Add a slot to the pool.
     *
     * @param int    $locationId
     * @param string $slotDate  YYYY-MM-DD
     * @param string $startTime HH:MM:SS
     * @param string $endTime   HH:MM:SS
     * @return int New slot ID.
     */
    public function create(int $locationId, string $slotDate, string $startTime, string $endTime): int {
        try {
            runQuery("
                INSERT INTO handover_slots (location_id, slot_date, start_time, end_time, is_available, created_at)
                VALUES (:location_id, :slot_date, :start_time, :end_time, 1, NOW())
            ", [
                ':location_id' => $locationId,
                ':slot_date'   => $slotDate,
                ':start_time'  => $startTime,
                ':end_time'    => $endTime,
            ]);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw new ApiException('A slot already starts at that time at this location.', 409);
            }
            throw $e;
        }
        return (int) $this->db->lastInsertId();
    }

    /**
     * Take a slot out of the pool. A slot booked by a scheduled handover
     * cannot be retired; reschedule that handover first.
     *
     * @param int $id
     */
    public function retire(int $id): void {
        $booked = (int) runQuery(
            "SELECT COUNT(*) FROM transactions WHERE slot_id = :id AND status = 'scheduled'",
            [':id' => $id]
        )->fetchColumn();

        if ($booked > 0) {
            throw new ApiException('This slot is booked by a scheduled handover. Reschedule that handover before retiring the slot.', 409);
        }

        runQuery("UPDATE handover_slots SET is_available = 0 WHERE id = :id", [':id' => $id]);
    }
}
