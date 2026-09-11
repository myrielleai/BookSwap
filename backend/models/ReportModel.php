<?php

/**
 * ReportModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Analytics queries for the Administrator's reporting features.
 *
 * All methods return aggregated data — no single-row lookups here.
 * These queries are typically slow on large datasets; the DB integrator
 * may want to add indexes on created_at and status columns.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class ReportModel {

    private ?PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Summary counts for the Admin overview dashboard.
     * Returns total listings posted, exchanges completed, and cancellations.
     *
     * @param string $from  Start date 'YYYY-MM-DD'.
     * @param string $to    End date   'YYYY-MM-DD'.
     * @return array  Keys: listings_posted, exchanges_completed, cancellations, cancellation_rate
     */
    public function getSummary(string $from, string $to): array {
        // TODO (DB):
        // Run three COUNT queries and combine the results.
        //
        // $listings = "SELECT COUNT(*) FROM listings WHERE created_at BETWEEN :from AND :to";
        // $completed = "SELECT COUNT(*) FROM transactions WHERE status='completed' AND created_at BETWEEN :from AND :to";
        // $cancelled = "SELECT COUNT(*) FROM transactions WHERE status='cancelled' AND created_at BETWEEN :from AND :to";
        //
        // Execute each and calculate:
        //   cancellation_rate = cancellations / (completed + cancellations) * 100

        return [
            'listings_posted'    => 0,
            'exchanges_completed' => 0,
            'cancellations'      => 0,
            'cancellation_rate'  => '0%',
        ]; // stub
    }

    /**
     * Most requested genres within a date range.
     * Returned sorted by request count descending.
     *
     * @param string $from
     * @param string $to
     * @param int    $limit  Top N genres to return.
     * @return array  Each row: { genre_name, request_count }
     */
    public function getTopGenres(string $from, string $to, int $limit = 10): array {
        // TODO (DB):
        // SQL: SELECT c.name AS genre_name, COUNT(er.id) AS request_count
        //      FROM exchange_requests er
        //      JOIN listings tl ON tl.id = er.target_listing_id
        //      JOIN categories c ON c.id = tl.genre_id
        //      WHERE er.created_at BETWEEN :from AND :to
        //      GROUP BY c.id, c.name
        //      ORDER BY request_count DESC
        //      LIMIT :limit
        //
        // $stmt = $this->db->prepare("...");
        // $stmt->bindValue(':from',  $from);
        // $stmt->bindValue(':to',    $to);
        // $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        // $stmt->execute();
        // return $stmt->fetchAll();

        return []; // stub
    }

    /**
     * Participation breakdown by city/region.
     *
     * @param string $from
     * @param string $to
     * @return array  Each row: { city, active_users, exchanges_in_city }
     */
    public function getParticipationByCity(string $from, string $to): array {
        // TODO (DB):
        // SQL: SELECT u.city, COUNT(DISTINCT u.id) AS active_users,
        //             COUNT(t.id) AS exchanges_in_city
        //      FROM users u
        //      LEFT JOIN exchange_requests er ON er.requester_id = u.id
        //      LEFT JOIN transactions t ON t.exchange_request_id = er.id AND t.status = 'completed'
        //      WHERE u.created_at BETWEEN :from AND :to
        //      GROUP BY u.city ORDER BY active_users DESC

        return []; // stub
    }

    /**
     * Activity log — traces every status-change action on any record.
     * Used by Admin to audit who modified what and when.
     *
     * @param int|null    $recordId    Optional: filter to a specific record.
     * @param string|null $recordType  Optional: 'listing' | 'request' | 'transaction' | 'user'.
     * @return array
     */
    public function getActivityLog(?int $recordId = null, ?string $recordType = null): array {
        // TODO (DB):
        // Assumes an `activity_log` table with columns:
        //   id, actor_id (FK→users), record_type, record_id, action, note, created_at
        //
        // SQL: SELECT al.*, u.name AS actor_name
        //      FROM activity_log al
        //      JOIN users u ON u.id = al.actor_id
        //      WHERE (record_id = :id OR :id IS NULL)
        //      AND   (record_type = :type OR :type IS NULL)
        //      ORDER BY al.created_at DESC

        return []; // stub
    }

    /**
     * Write an entry to the activity log whenever a record is changed.
     * Every controller that changes status or role should call this.
     *
     * @param int    $actorId     User performing the action.
     * @param string $recordType  'listing' | 'request' | 'transaction' | 'user'.
     * @param int    $recordId    Primary key of the affected record.
     * @param string $action      Short verb, e.g., 'approved', 'rejected', 'role_changed'.
     * @param string $note        Optional longer description.
     * @return bool
     */
    public function logActivity(int $actorId, string $recordType, int $recordId, string $action, string $note = ''): bool {
        // TODO (DB):
        // SQL: INSERT INTO activity_log (actor_id, record_type, record_id, action, note, created_at)
        //      VALUES (:actor_id, :record_type, :record_id, :action, :note, NOW())
        //
        // $stmt = $this->db->prepare("...");
        // return $stmt->execute([...]);

        return false; // stub
    }
}
