<?php

/**
 * WatchlistModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `watchlist` table.
 *
 * TABLE ASSUMED: watchlist
 *   id, user_id (FK→users), listing_id (FK→listings), created_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class WatchlistModel {

    private ?PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Add a listing to a user's watchlist.
     * Uses INSERT IGNORE to gracefully handle duplicates.
     *
     * @param int $userId
     * @param int $listingId
     * @return bool
     */
    public function add(int $userId, int $listingId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("
            INSERT IGNORE INTO watchlist (user_id, listing_id, created_at)
            VALUES (:uid, :lid, NOW())
        ");
        return $stmt->execute([':uid' => $userId, ':lid' => $listingId]);
    }

    /**
     * Remove a listing from a user's watchlist.
     *
     * @param int $userId
     * @param int $listingId
     * @return bool
     */
    public function remove(int $userId, int $listingId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("DELETE FROM watchlist WHERE user_id = :uid AND listing_id = :lid");
        return $stmt->execute([':uid' => $userId, ':lid' => $listingId]);
    }

    /**
     * Get all watchlisted listings for a user.
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        if (!$this->db) return [];
        $sql = "SELECT w.id AS watchlist_id, w.created_at AS watchlisted_at,
                       l.*, u.name AS owner_name, c.name AS genre_name, cond.label AS condition_label
                FROM watchlist w
                JOIN listings l ON l.id = w.listing_id
                JOIN users u ON u.id = l.user_id
                LEFT JOIN categories c ON c.id = l.genre_id
                LEFT JOIN conditions cond ON cond.id = l.condition_id
                WHERE w.user_id = :uid
                ORDER BY w.created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Check if a listing is watchlisted by a user.
     *
     * @param int $userId
     * @param int $listingId
     * @return bool
     */
    public function isWatchlisted(int $userId, int $listingId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM watchlist WHERE user_id = :uid AND listing_id = :lid");
        $stmt->execute([':uid' => $userId, ':lid' => $listingId]);
        return (int) $stmt->fetchColumn() > 0;
    }

    /**
     * Get user IDs watching a specific listing (for notifications when status changes).
     *
     * @param int $listingId
     * @return array
     */
    public function getUsersWatchingListing(int $listingId): array {
        if (!$this->db) return [];
        $stmt = $this->db->prepare("SELECT user_id FROM watchlist WHERE listing_id = :lid");
        $stmt->execute([':lid' => $listingId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }
}
