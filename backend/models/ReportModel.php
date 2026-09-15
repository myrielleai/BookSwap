<?php

/**
 * ReportModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Analytics for the Administrator's dashboard and reports, plus the activity log.
 *
 * Phase 1 §3.1.5: listings posted, exchanges completed, cancellation rate,
 * most requested genres, and participation by region/city and age group.
 * The age-group report counts exchanged books by their age category, because
 * the ERD records an age category on each listing, not a reader's age.
 *
 * Reports filed by members about exchanges live in IncidentReportModel.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class ReportModel {

    private PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    /**
     * Current totals for the Administrator dashboard.
     *
     * @return array
     */
    public function getStatusTotals(): array {
        $row = runQuery("
            SELECT
                (SELECT COUNT(*) FROM exchange_requests)                             AS total_requests,
                (SELECT COUNT(*) FROM exchange_requests WHERE status = 'pending')    AS pending_requests,
                (SELECT COUNT(*) FROM transactions)                                  AS total_transactions,
                (SELECT COUNT(*) FROM transactions WHERE status = 'accepted')        AS awaiting_schedule,
                (SELECT COUNT(*) FROM transactions WHERE status = 'scheduled')       AS scheduled,
                (SELECT COUNT(*) FROM transactions WHERE status = 'completed')       AS completed,
                (SELECT COUNT(*) FROM transactions WHERE status = 'cancelled')       AS cancelled,
                (SELECT COUNT(*) FROM listings WHERE status = 'unverified')          AS pending_verifications,
                (SELECT COUNT(*) FROM reports WHERE status IN ('open', 'escalated')) AS open_reports,
                (SELECT COUNT(*) FROM users WHERE status = 'pending')                AS pending_accounts
        ")->fetch();

        return array_map('intval', $row);
    }

    /**
     * Transactions opened, completed, and cancelled per month, for a chart.
     *
     * Every month in the window is present, zero-filled, oldest first, so a
     * chart never skips a month with no activity.
     *
     * @param int $months Number of months including the current one.
     * @return array List of { month: 'YYYY-MM', created, completed, cancelled }.
     */
    public function getMonthlyTransactions(int $months = 12): array {
        $buckets = [];
        $cursor  = new DateTime('first day of this month');
        $cursor->modify('-' . ($months - 1) . ' months');
        for ($i = 0; $i < $months; $i++) {
            $key = $cursor->format('Y-m');
            $buckets[$key] = ['month' => $key, 'created' => 0, 'completed' => 0, 'cancelled' => 0];
            $cursor->modify('+1 month');
        }
        $since = array_key_first($buckets) . '-01 00:00:00';

        $rows = runQuery("
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, 'created' AS metric, COUNT(*) AS total
            FROM transactions WHERE created_at >= :since_created
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            UNION ALL
            SELECT DATE_FORMAT(completed_at, '%Y-%m'), 'completed', COUNT(*)
            FROM transactions WHERE status = 'completed' AND completed_at >= :since_completed
            GROUP BY DATE_FORMAT(completed_at, '%Y-%m')
            UNION ALL
            SELECT DATE_FORMAT(updated_at, '%Y-%m'), 'cancelled', COUNT(*)
            FROM transactions WHERE status = 'cancelled' AND updated_at >= :since_cancelled
            GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
        ", [':since_created' => $since, ':since_completed' => $since, ':since_cancelled' => $since])->fetchAll();

        foreach ($rows as $row) {
            if (isset($buckets[$row['ym']])) {
                $buckets[$row['ym']][$row['metric']] = (int) $row['total'];
            }
        }

        return array_values($buckets);
    }

    // ── Reports ───────────────────────────────────────────────────────────────

    /**
     * Summary counts for a date range.
     *
     * @param string $from YYYY-MM-DD
     * @param string $to   YYYY-MM-DD
     * @return array
     */
    public function getSummary(string $from, string $to): array {
        $params = [];
        for ($i = 1; $i <= 4; $i++) {
            $params[":from$i"] = "$from 00:00:00";
            $params[":to$i"]   = "$to 23:59:59";
        }

        $row = runQuery("
            SELECT
                (SELECT COUNT(*) FROM listings          WHERE created_at BETWEEN :from1 AND :to1) AS listings_posted,
                (SELECT COUNT(*) FROM exchange_requests WHERE created_at BETWEEN :from2 AND :to2) AS requests_sent,
                (SELECT COUNT(*) FROM transactions WHERE status = 'completed' AND completed_at BETWEEN :from3 AND :to3) AS exchanges_completed,
                (SELECT COUNT(*) FROM transactions WHERE status = 'cancelled' AND updated_at   BETWEEN :from4 AND :to4) AS cancellations
        ", $params)->fetch();

        $summary = array_map('intval', $row);
        $closed  = $summary['exchanges_completed'] + $summary['cancellations'];
        $summary['cancellation_rate'] = $closed > 0 ? round($summary['cancellations'] / $closed * 100, 1) : 0.0;

        return $summary;
    }

    /**
     * Most requested genres within a date range.
     *
     * @param string $from
     * @param string $to
     * @param int    $limit
     * @return array Rows: genre_id, genre_name, request_count.
     */
    public function getTopGenres(string $from, string $to, int $limit = 10): array {
        return runQuery("
            SELECT g.id AS genre_id, g.name AS genre_name, COUNT(er.id) AS request_count
            FROM exchange_requests er
            JOIN listings tl ON tl.id = er.target_listing_id
            JOIN genres g    ON g.id  = tl.genre_id
            WHERE er.created_at BETWEEN :from AND :to
            GROUP BY g.id, g.name
            ORDER BY request_count DESC, g.name ASC
            LIMIT :limit
        ", [':from' => "$from 00:00:00", ':to' => "$to 23:59:59", ':limit' => $limit])->fetchAll();
    }

    /**
     * Participation by city: active members, and exchanges they completed in
     * the range (counting both the requester's and the owner's side).
     *
     * @param string $from
     * @param string $to
     * @return array Rows: city, active_members, completed_exchanges.
     */
    public function getParticipationByCity(string $from, string $to): array {
        return runQuery("
            SELECT COALESCE(u.city, 'Unspecified')  AS city,
                   COUNT(DISTINCT u.id)             AS active_members,
                   COUNT(DISTINCT p.transaction_id) AS completed_exchanges
            FROM users u
            LEFT JOIN (
                SELECT er.requester_id AS user_id, t.id AS transaction_id
                FROM transactions t
                JOIN exchange_requests er ON er.id = t.exchange_request_id
                WHERE t.status = 'completed' AND t.completed_at BETWEEN :from1 AND :to1
                UNION ALL
                SELECT tl.user_id, t.id
                FROM transactions t
                JOIN exchange_requests er ON er.id = t.exchange_request_id
                JOIN listings tl          ON tl.id = er.target_listing_id
                WHERE t.status = 'completed' AND t.completed_at BETWEEN :from2 AND :to2
            ) p ON p.user_id = u.id
            WHERE u.role = 'customer' AND u.status = 'active'
            GROUP BY COALESCE(u.city, 'Unspecified')
            ORDER BY completed_exchanges DESC, active_members DESC, city ASC
        ", [
            ':from1' => "$from 00:00:00", ':to1' => "$to 23:59:59",
            ':from2' => "$from 00:00:00", ':to2' => "$to 23:59:59",
        ])->fetchAll();
    }

    /**
     * Participation by age group: books exchanged in the range, by the age
     * category of each book (both books of every completed exchange).
     *
     * @param string $from
     * @param string $to
     * @return array Rows: age_group, books_exchanged, exchanges.
     */
    public function getParticipationByAgeGroup(string $from, string $to): array {
        return runQuery("
            SELECT COALESCE(ac.name, 'Unspecified') AS age_group,
                   COUNT(*)                         AS books_exchanged,
                   COUNT(DISTINCT t.id)             AS exchanges
            FROM transactions t
            JOIN exchange_requests er   ON er.id = t.exchange_request_id
            JOIN listings l             ON l.id IN (er.target_listing_id, er.offered_listing_id)
            LEFT JOIN age_categories ac ON ac.id = l.age_category_id
            WHERE t.status = 'completed' AND t.completed_at BETWEEN :from AND :to
            GROUP BY COALESCE(ac.name, 'Unspecified')
            ORDER BY books_exchanged DESC, age_group ASC
        ", [':from' => "$from 00:00:00", ':to' => "$to 23:59:59"])->fetchAll();
    }

    // ── Activity Log ──────────────────────────────────────────────────────────

    /**
     * Search the audit trail (Phase 1 §3.1.6: trace who verified, approved,
     * or modified a record).
     *
     * @param array       $query      readListQuery() output.
     * @param string|null $recordType
     * @param int|null    $recordId
     * @param string|null $action
     * @return array ['rows' => array, 'total' => int]
     */
    public function searchActivityLog(array $query, ?string $recordType, ?int $recordId, ?string $action): array {
        $where  = [];
        $params = [];

        if ($recordType !== null) {
            $where[] = 'al.record_type = :record_type';
            $params[':record_type'] = $recordType;
        }
        if ($recordId !== null) {
            $where[] = 'al.record_id = :record_id';
            $params[':record_id'] = $recordId;
        }
        if ($action !== null) {
            $where[] = 'al.action = :action';
            $params[':action'] = $action;
        }
        if ($query['keyword'] !== '') {
            $where[] = '(u.name LIKE :kw_actor OR al.note LIKE :kw_note)';
            $params[':kw_actor'] = likeContains($query['keyword']);
            $params[':kw_note']  = likeContains($query['keyword']);
        }
        if ($query['date_from'] !== null) {
            $where[] = 'al.created_at >= :date_from';
            $params[':date_from'] = $query['date_from'] . ' 00:00:00';
        }
        if ($query['date_to'] !== null) {
            $where[] = 'al.created_at <= :date_to';
            $params[':date_to'] = $query['date_to'] . ' 23:59:59';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $orderSql = $query['sort'] === 'oldest' ? 'al.created_at ASC, al.id ASC' : 'al.created_at DESC, al.id DESC';

        return fetchPage(
            "SELECT al.*, u.name AS actor_name, u.role AS actor_role
             FROM activity_log al JOIN users u ON u.id = al.actor_id
             $whereSql ORDER BY $orderSql",
            "SELECT COUNT(*) FROM activity_log al JOIN users u ON u.id = al.actor_id $whereSql",
            $params,
            $query
        );
    }

    /**
     * Latest activity entries, for the dashboard's "Recent Activities" panel.
     *
     * @param int $limit
     * @return array
     */
    public function getRecentActivity(int $limit = 10): array {
        return runQuery("
            SELECT al.*, u.name AS actor_name, u.role AS actor_role
            FROM activity_log al JOIN users u ON u.id = al.actor_id
            ORDER BY al.created_at DESC, al.id DESC
            LIMIT :limit
        ", [':limit' => $limit])->fetchAll();
    }

    /**
     * Items a moderator has processed (Phase 1 §3.2.6: a count volunteers can
     * attach to their duty records).
     *
     * @param int $actorId
     * @return int
     */
    public function countProcessedBy(int $actorId): int {
        return (int) runQuery("
            SELECT COUNT(*) FROM activity_log
            WHERE actor_id = :actor_id AND record_type IN ('listing', 'transaction', 'report')
        ", [':actor_id' => $actorId])->fetchColumn();
    }

    /**
     * Write an entry to the activity log. Every state change calls this.
     *
     * @param int    $actorId    User performing the action.
     * @param string $recordType 'user' | 'listing' | 'request' | 'transaction' | 'report' | 'slot' | ...
     * @param int    $recordId   Primary key of the affected record.
     * @param string $action     Short verb, e.g. 'approve', 'scheduled', 'role_changed'.
     * @param string $note       Optional explanation.
     */
    public function logActivity(int $actorId, string $recordType, int $recordId, string $action, string $note = ''): void {
        runQuery("
            INSERT INTO activity_log (actor_id, record_type, record_id, action, note, created_at)
            VALUES (:actor_id, :record_type, :record_id, :action, :note, NOW())
        ", [
            ':actor_id'    => $actorId,
            ':record_type' => $recordType,
            ':record_id'   => $recordId,
            ':action'      => $action,
            ':note'        => $note !== '' ? $note : null,
        ]);
    }
}
