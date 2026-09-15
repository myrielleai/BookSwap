<?php

/**
 * IncidentReportModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Reports filed about exchanges, listings, and requests (table: reports).
 *
 * Phase 1 §3.2.5: Staff receive reports covering misdescribed condition,
 * no-shows, and inappropriate listings, record findings and the resolution,
 * and escalate repeat offenders to the Administrator. Spam-request reports
 * (§3.2.2) use the same table through reports.request_id.
 *
 * Named IncidentReportModel because ReportModel already holds the
 * Administrator's analytics reports.
 *
 * TABLE: reports
 *   id, reporter_id (FK→users), transaction_id, listing_id, request_id,
 *   handled_by (FK→users), report_type, description, resolution, status,
 *   created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class IncidentReportModel {

    private PDO $db;

    private const SELECT_SQL = "
        SELECT r.*,
               rep.name AS reporter_name,
               h.name   AS handler_name,
               l.title  AS listing_title,
               t.status AS transaction_status
        FROM reports r
        JOIN users rep           ON rep.id = r.reporter_id
        LEFT JOIN users h        ON h.id   = r.handled_by
        LEFT JOIN listings l     ON l.id   = r.listing_id
        LEFT JOIN transactions t ON t.id   = r.transaction_id";

    // The only columns a report can be "about"; nothing else reaches the SQL.
    private const SUBJECT_COLUMNS = ['transaction_id', 'listing_id', 'request_id'];

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * File a report.
     *
     * @param array $data Keys: reporter_id, transaction_id, listing_id, request_id,
     *                    handled_by, report_type, description, resolution, status.
     * @return int New report ID.
     */
    public function create(array $data): int {
        runQuery("
            INSERT INTO reports
                (reporter_id, transaction_id, listing_id, request_id, handled_by,
                 report_type, description, resolution, status, created_at)
            VALUES
                (:reporter_id, :transaction_id, :listing_id, :request_id, :handled_by,
                 :report_type, :description, :resolution, :status, NOW())
        ", [
            ':reporter_id'    => $data['reporter_id'],
            ':transaction_id' => $data['transaction_id'],
            ':listing_id'     => $data['listing_id'],
            ':request_id'     => $data['request_id'],
            ':handled_by'     => $data['handled_by'],
            ':report_type'    => $data['report_type'],
            ':description'    => $data['description'],
            ':resolution'     => $data['resolution'],
            ':status'         => $data['status'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Find one report.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        return runQuery(self::SELECT_SQL . " WHERE r.id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * Search reports for the staff queue.
     *
     * @param array       $query readListQuery() output.
     * @param string|null $type  Optional report_type filter.
     * @return array ['rows' => array, 'total' => int]
     */
    public function search(array $query, ?string $type): array {
        $where  = [];
        $params = [];

        if ($query['status'] !== null) {
            $where[] = 'r.status = :status';
            $params[':status'] = $query['status'];
        }
        if ($type !== null) {
            $where[] = 'r.report_type = :report_type';
            $params[':report_type'] = $type;
        }
        if ($query['keyword'] !== '') {
            $where[] = 'r.description LIKE :keyword';
            $params[':keyword'] = likeContains($query['keyword']);
        }
        if ($query['date_from'] !== null) {
            $where[] = 'r.created_at >= :date_from';
            $params[':date_from'] = $query['date_from'] . ' 00:00:00';
        }
        if ($query['date_to'] !== null) {
            $where[] = 'r.created_at <= :date_to';
            $params[':date_to'] = $query['date_to'] . ' 23:59:59';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $orderSql = $query['sort'] === 'oldest' ? 'r.created_at ASC, r.id ASC' : 'r.created_at DESC, r.id DESC';

        return fetchPage(
            self::SELECT_SQL . " $whereSql ORDER BY $orderSql",
            "SELECT COUNT(*) FROM reports r $whereSql",
            $params,
            $query
        );
    }

    /**
     * Whether a member already has an open report of this type about this record.
     *
     * @param int    $reporterId
     * @param string $type
     * @param string $subjectColumn One of SUBJECT_COLUMNS.
     * @param int    $subjectId
     * @return bool
     */
    public function hasOpenReport(int $reporterId, string $type, string $subjectColumn, int $subjectId): bool {
        if (!in_array($subjectColumn, self::SUBJECT_COLUMNS, true)) {
            throw new InvalidArgumentException("Unknown report subject: $subjectColumn");
        }
        return (int) runQuery("
            SELECT COUNT(*) FROM reports
            WHERE reporter_id = :reporter_id AND report_type = :report_type
              AND $subjectColumn = :subject_id AND status IN ('open', 'escalated')
        ", [':reporter_id' => $reporterId, ':report_type' => $type, ':subject_id' => $subjectId])->fetchColumn() > 0;
    }

    /**
     * Record a moderator's or administrator's finding.
     *
     * @param int    $id
     * @param int    $handlerId
     * @param string $resolution
     * @param string $status REPORT_RESOLVED or REPORT_ESCALATED.
     */
    public function resolve(int $id, int $handlerId, string $resolution, string $status): void {
        runQuery("
            UPDATE reports
            SET handled_by = :handled_by, resolution = :resolution, status = :status, updated_at = NOW()
            WHERE id = :id
        ", [':handled_by' => $handlerId, ':resolution' => $resolution, ':status' => $status, ':id' => $id]);
    }

    /**
     * Number of reports waiting for a moderator.
     *
     * @return int
     */
    public function countOpen(): int {
        return (int) runQuery("SELECT COUNT(*) FROM reports WHERE status = 'open'")->fetchColumn();
    }
}
