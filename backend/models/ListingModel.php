<?php

/**
 * ListingModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `listings` table.
 *
 * Implemented with live PDO operations for Member 4 (Database & API integration).
 *
 * TABLE ASSUMED: listings
 *   id, user_id (FK→users), title, author, edition, publisher,
 *   genre_id (FK→categories), condition_id (FK→conditions),
 *   preferred_return (text or null), is_open_offer (bool),
 *   photo_path, status, staff_note, created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class ListingModel {

    private ?PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Find a single listing by its primary key.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        if (!$this->db) return null;
        $sql = "SELECT l.*, u.name AS owner_name, c.name AS genre_name, cond.label AS condition_label
                FROM listings l
                JOIN users u ON u.id = l.user_id
                JOIN categories c ON c.id = l.genre_id
                JOIN conditions cond ON cond.id = l.condition_id
                WHERE l.id = :id LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Get all listings for the public catalog (only 'available' status).
     * Supports search by keyword, genre filter, and condition filter.
     * Supports sorting by date or relevance.
     *
     * @param array $filters Keys: keyword, genre_id, condition_id, sort (date|relevance)
     * @return array
     */
    public function getAvailable(array $filters = []): array {
        if (!$this->db) return [];
        $where  = ["l.status = 'available'"];
        $params = [];

        if (!empty($filters['keyword'])) {
            $where[]  = "(l.title LIKE :kw OR l.author LIKE :kw)";
            $params[':kw'] = '%' . $filters['keyword'] . '%';
        }
        if (!empty($filters['genre_id'])) {
            $where[]  = "l.genre_id = :genre_id";
            $params[':genre_id'] = $filters['genre_id'];
        }
        if (!empty($filters['condition_id'])) {
            $where[]  = "l.condition_id = :condition_id";
            $params[':condition_id'] = $filters['condition_id'];
        }

        $order = ($filters['sort'] ?? 'date') === 'date' ? 'l.created_at DESC' : 'l.title ASC';

        $sql = "SELECT l.*, u.name AS owner_name, c.name AS genre_name, cond.label AS condition_label
                FROM listings l
                JOIN users u ON u.id = l.user_id
                JOIN categories c ON c.id = l.genre_id
                LEFT JOIN conditions cond ON cond.id = l.condition_id
                WHERE " . implode(' AND ', $where) . "
                ORDER BY $order";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all listings belonging to a specific user (for their dashboard).
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        if (!$this->db) return [];
        $sql = "SELECT l.*, c.name AS genre_name, cond.label AS condition_label
                FROM listings l
                JOIN categories c ON c.id = l.genre_id
                JOIN conditions cond ON cond.id = l.condition_id
                WHERE l.user_id = :user_id ORDER BY l.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all listings pending staff verification.
     * Used by the Staff moderation dashboard.
     *
     * @return array
     */
    public function getPending(): array {
        if (!$this->db) return [];
        $sql = "SELECT l.*, u.name AS owner_name, c.name AS genre_name, cond.label AS condition_label
                FROM listings l
                JOIN users u ON u.id = l.user_id
                LEFT JOIN categories c ON c.id = l.genre_id
                LEFT JOIN conditions cond ON cond.id = l.condition_id
                WHERE l.status = 'unverified' ORDER BY l.created_at ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get listings that have been idle (unverified/available with no activity)
     * beyond the threshold defined in IDLE_LISTING_DAYS.
     *
     * @return array
     */
    public function getIdle(): array {
        if (!$this->db) return [];
        $days = defined('IDLE_LISTING_DAYS') ? IDLE_LISTING_DAYS : 30;
        $sql = "SELECT * FROM listings
                WHERE status IN ('unverified', 'available')
                AND (updated_at < DATE_SUB(NOW(), INTERVAL :days DAY) OR (updated_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL :days2 DAY)))";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':days' => $days, ':days2' => $days]);
        return $stmt->fetchAll() ?: [];
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Insert a new listing submitted by a Customer.
     *
     * @param array $data Keys: user_id, title, author, edition, publisher,
     *                         genre_id, condition_id, preferred_return,
     *                         is_open_offer, photo_path
     * @return int  New listing's auto-increment ID.
     */
    public function create(array $data): int {
        if (!$this->db) return 0;
        $stmt = $this->db->prepare("
            INSERT INTO listings
            (user_id, title, author, edition, publisher, genre_id, condition_id,
             preferred_return, is_open_offer, photo_path, status, created_at)
            VALUES (:user_id, :title, :author, :edition, :publisher, :genre_id,
                    :condition_id, :preferred_return, :is_open_offer, :photo_path,
                    'unverified', NOW())
        ");
        $stmt->execute([
            ':user_id'          => $data['user_id'],
            ':title'            => $data['title'],
            ':author'           => $data['author'],
            ':edition'          => $data['edition'] ?? null,
            ':publisher'        => $data['publisher'] ?? null,
            ':genre_id'         => $data['genre_id'],
            ':condition_id'     => $data['condition_id'],
            ':preferred_return' => $data['preferred_return'] ?? null,
            ':is_open_offer'    => !empty($data['is_open_offer']) ? 1 : 0,
            ':photo_path'       => $data['photo_path'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Update an editable listing (only allowed while status = 'unverified' or 'returned').
     *
     * @param int   $id
     * @param array $data Fields that changed.
     * @return bool
     */
    public function update(int $id, array $data): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("
            UPDATE listings
            SET title=:title, author=:author, edition=:edition,
                publisher=:publisher, genre_id=:genre_id, condition_id=:condition_id,
                preferred_return=:preferred_return, is_open_offer=:is_open_offer,
                photo_path=:photo_path, updated_at=NOW()
            WHERE id=:id
        ");
        return $stmt->execute([
            ':title'            => $data['title'],
            ':author'           => $data['author'],
            ':edition'          => $data['edition'] ?? null,
            ':publisher'        => $data['publisher'] ?? null,
            ':genre_id'         => $data['genre_id'],
            ':condition_id'     => $data['condition_id'],
            ':preferred_return' => $data['preferred_return'] ?? null,
            ':is_open_offer'    => !empty($data['is_open_offer']) ? 1 : 0,
            ':photo_path'       => $data['photo_path'],
            ':id'               => $id,
        ]);
    }

    /**
     * Update the status of a listing.
     * Used by Staff (verify/reject/return) and the system (lock/unlock).
     *
     * @param int         $id        Listing primary key.
     * @param string      $status    One of LISTING_* constants.
     * @param string|null $staffNote Optional note (for 'returned' or 'rejected' status).
     * @return bool
     */
    public function updateStatus(int $id, string $status, ?string $staffNote = null): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("UPDATE listings SET status=:status, staff_note=:note, updated_at=NOW() WHERE id=:id");
        return $stmt->execute([':status' => $status, ':note' => $staffNote, ':id' => $id]);
    }

    /**
     * Soft-delete / withdraw a listing (set status = 'withdrawn').
     * Only the owner can call this, and only if status is 'unverified' or 'available'.
     *
     * @param int $id
     * @return bool
     */
    public function withdraw(int $id): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("UPDATE listings SET status='withdrawn', updated_at=NOW() WHERE id=:id");
        return $stmt->execute([':id' => $id]);
    }
}
