<?php

/**
 * ReportModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Analytics queries for the Administrator's reporting features.
 *
 * Implemented with live PDO operations for Member 4 (Database & API integration).
 * All methods return aggregated data or audit logs.
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
        if (!$this->db) {
            return [
                'listings_posted'     => 0,
                'exchanges_completed' => 0,
                'cancellations'       => 0,
                'cancellation_rate'   => '0%',
            ];
        }

        $fromDt = $from . ' 00:00:00';
        $toDt   = $to . ' 23:59:59';

        $stmt1 = $this->db->prepare("SELECT COUNT(*) FROM listings WHERE created_at BETWEEN :from AND :to");
        $stmt1->execute([':from' => $fromDt, ':to' => $toDt]);
        $listings = (int) $stmt1->fetchColumn();

        $stmt2 = $this->db->prepare("SELECT COUNT(*) FROM transactions WHERE status='completed' AND created_at BETWEEN :from AND :to");
        $stmt2->execute([':from' => $fromDt, ':to' => $toDt]);
        $completed = (int) $stmt2->fetchColumn();

        $stmt3 = $this->db->prepare("SELECT COUNT(*) FROM transactions WHERE status='cancelled' AND created_at BETWEEN :from AND :to");
        $stmt3->execute([':from' => $fromDt, ':to' => $toDt]);
        $cancelled = (int) $stmt3->fetchColumn();

        $total = $completed + $cancelled;
        $rate  = $total > 0 ? round(($cancelled / $total) * 100, 1) . '%' : '0%';

        return [
            'listings_posted'     => $listings,
            'exchanges_completed' => $completed,
            'cancellations'       => $cancelled,
            'cancellation_rate'   => $rate,
        ];
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
        if (!$this->db) return [];
        $fromDt = $from . ' 00:00:00';
        $toDt   = $to . ' 23:59:59';

        $sql = "SELECT c.name AS genre_name, COUNT(er.id) AS request_count
                FROM exchange_requests er
                JOIN listings tl ON tl.id = er.target_listing_id
                JOIN categories c ON c.id = tl.genre_id
                WHERE er.created_at BETWEEN :from AND :to
                GROUP BY c.id, c.name
                ORDER BY request_count DESC
                LIMIT :limit";
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':from',  $fromDt);
        $stmt->bindValue(':to',    $toDt);
        $stmt->bindValue(':limit', (int) $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Participation breakdown by city/region.
     *
     * @param string $from
     * @param string $to
     * @return array  Each row: { city, active_users, exchanges_in_city }
     */
    public function getParticipationByCity(string $from, string $to): array {
        if (!$this->db) return [];
        $fromDt = $from . ' 00:00:00';
        $toDt   = $to . ' 23:59:59';

        $sql = "SELECT u.city, COUNT(DISTINCT u.id) AS active_users,
                       COUNT(t.id) AS exchanges_in_city
                FROM users u
                LEFT JOIN exchange_requests er ON er.requester_id = u.id
                LEFT JOIN transactions t ON t.exchange_request_id = er.id AND t.status = 'completed'
                WHERE u.created_at BETWEEN :from AND :to
                GROUP BY u.city ORDER BY active_users DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':from' => $fromDt, ':to' => $toDt]);
        return $stmt->fetchAll() ?: [];
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
        if (!$this->db) return [];
        $where  = [];
        $params = [];
        if ($recordId !== null) {
            $where[] = 'al.record_id = :record_id';
            $params[':record_id'] = $recordId;
        }
        if ($recordType !== null) {
            $where[] = 'al.record_type = :record_type';
            $params[':record_type'] = $recordType;
        }

        $sql = "SELECT al.*, u.name AS actor_name
                FROM activity_log al
                JOIN users u ON u.id = al.actor_id";
        if ($where) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY al.created_at DESC LIMIT 100";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
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
        if (!$this->db) return false;
        $stmt = $this->db->prepare("
            INSERT INTO activity_log (actor_id, record_type, record_id, action, note, created_at)
            VALUES (:actor_id, :record_type, :record_id, :action, :note, NOW())
        ");
        return $stmt->execute([
            ':actor_id'    => $actorId,
            ':record_type' => $recordType,
            ':record_id'   => $recordId,
            ':action'      => $action,
            ':note'        => $note,
        ]);
    }
}
