<?php

/**
 * WatchlistModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `watchlist` table.
 *
 * The watchlist resolves the many-to-many relationship between members and
 * listings. Watchers are notified when a watched book becomes available
 * (NotificationModel::notifyWatchers()).
 *
 * TABLE: watchlist
 *   id, user_id (FK→users), listing_id (FK→listings), created_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class WatchlistModel {

    private PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Add a listing to a user's watchlist.
     * INSERT IGNORE makes a repeated add harmless (unique user + listing key).
     *
     * @param int $userId
     * @param int $listingId
     */
    public function add(int $userId, int $listingId): void {
        runQuery(
            "INSERT IGNORE INTO watchlist (user_id, listing_id, created_at) VALUES (:user_id, :listing_id, NOW())",
            [':user_id' => $userId, ':listing_id' => $listingId]
        );
    }

    /**
     * Remove a listing from a user's watchlist.
     *
     * @param int $userId
     * @param int $listingId
     */
    public function remove(int $userId, int $listingId): void {
        runQuery(
            "DELETE FROM watchlist WHERE user_id = :user_id AND listing_id = :listing_id",
            [':user_id' => $userId, ':listing_id' => $listingId]
        );
    }

    /**
     * All watchlisted listings for a user, most recently added first.
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        $sql = "SELECT w.id AS watchlist_id, w.created_at AS watchlisted_at,
                       l.id, l.title, l.author, l.status, l.user_id,
                       u.name AS owner_name, g.name AS genre_name, c.label AS condition_label,
                       (SELECT p.file_path FROM listing_photos p
                         WHERE p.listing_id = l.id ORDER BY p.id LIMIT 1) AS cover_photo
                FROM watchlist w
                JOIN listings l   ON l.id = w.listing_id
                JOIN users u      ON u.id = l.user_id
                JOIN genres g     ON g.id = l.genre_id
                JOIN conditions c ON c.id = l.condition_id
                WHERE w.user_id = :user_id
                ORDER BY w.created_at DESC";
        return runQuery($sql, [':user_id' => $userId])->fetchAll();
    }

    /**
     * Whether a listing is on a user's watchlist.
     *
     * @param int $userId
     * @param int $listingId
     * @return bool
     */
    public function isWatchlisted(int $userId, int $listingId): bool {
        return (int) runQuery(
            "SELECT COUNT(*) FROM watchlist WHERE user_id = :user_id AND listing_id = :listing_id",
            [':user_id' => $userId, ':listing_id' => $listingId]
        )->fetchColumn() > 0;
    }
}
