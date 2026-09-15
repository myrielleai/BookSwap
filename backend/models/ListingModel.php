<?php

/**
 * ListingModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `listings` and `listing_photos` tables.
 *
 * TABLES:
 *   listings
 *     id, user_id (FK→users, the owner), genre_id (FK→genres),
 *     format_id (FK→formats), age_category_id (FK→age_categories),
 *     condition_id (FK→conditions), verified_by (FK→users), title, author,
 *     edition, publisher, preferred_return, is_open_offer, status, staff_note,
 *     created_at, updated_at
 *
 *   listing_photos
 *     id, listing_id (FK→listings), file_path, created_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class ListingModel {

    private PDO $db;

    // Columns shared by every listing read: a readable name for each foreign
    // key, the first photo, and the owner's completed-exchange count, which
    // Phase 1 §3.3.1 shows as a simple reliability indicator.
    private const SELECT_SQL = "
        SELECT l.*,
               u.name  AS owner_name,
               g.name  AS genre_name,
               f.name  AS format_name,
               ac.name AS age_category_name,
               c.label AS condition_label,
               (SELECT p.file_path FROM listing_photos p
                 WHERE p.listing_id = l.id ORDER BY p.id LIMIT 1) AS cover_photo,
               (SELECT p.id FROM listing_photos p
                 WHERE p.listing_id = l.id ORDER BY p.id LIMIT 1) AS cover_photo_id,
               (SELECT COUNT(*) FROM transactions t
                  JOIN exchange_requests er ON er.id = t.exchange_request_id
                  JOIN listings tl          ON tl.id = er.target_listing_id
                 WHERE t.status = 'completed'
                   AND (er.requester_id = l.user_id OR tl.user_id = l.user_id)) AS owner_completed_exchanges
        FROM listings l
        JOIN users u                ON u.id  = l.user_id
        JOIN genres g               ON g.id  = l.genre_id
        LEFT JOIN formats f         ON f.id  = l.format_id
        LEFT JOIN age_categories ac ON ac.id = l.age_category_id
        JOIN conditions c           ON c.id  = l.condition_id";

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
        return runQuery(self::SELECT_SQL . " WHERE l.id = :id LIMIT 1", [':id' => $id])->fetch() ?: null;
    }

    /**
     * All photos of a listing, in upload order.
     *
     * @param int $listingId
     * @return array
     */
    public function getPhotos(int $listingId): array {
        return runQuery(
            "SELECT id, file_path, created_at FROM listing_photos WHERE listing_id = :listing_id ORDER BY id",
            [':listing_id' => $listingId]
        )->fetchAll();
    }

    /**
     * One photo with the owner and status of its listing, for serving the file.
     *
     * @param int $photoId
     * @return array|null Keys: id, file_path, listing_id, user_id, status.
     */
    public function findPhoto(int $photoId): ?array {
        return runQuery("
            SELECT p.id, p.file_path, l.id AS listing_id, l.user_id, l.status
            FROM listing_photos p
            JOIN listings l ON l.id = p.listing_id
            WHERE p.id = :id LIMIT 1
        ", [':id' => $photoId])->fetch() ?: null;
    }

    /**
     * Search the public catalogue (only 'available' listings).
     *
     * Phase 1 §3.3.3: search by title, author, or keyword; filter by genre,
     * format, age category, and condition; sort by date or by relevance to the
     * member's favourite genres.
     *
     * @param array       $query          readListQuery() output.
     * @param array       $filters        Keys genre_id, format_id, age_category_id, condition_id (int|null).
     * @param string|null $favoriteGenres The member's favourite genre IDs as CSV, for sort=relevance.
     * @return array ['rows' => array, 'total' => int]
     */
    public function searchCatalogue(array $query, array $filters, ?string $favoriteGenres): array {
        $where  = ["l.status = 'available'"];
        $params = [];

        if ($query['keyword'] !== '') {
            $where[] = '(l.title LIKE :kw_title OR l.author LIKE :kw_author OR l.publisher LIKE :kw_publisher)';
            $params[':kw_title']     = likeContains($query['keyword']);
            $params[':kw_author']    = likeContains($query['keyword']);
            $params[':kw_publisher'] = likeContains($query['keyword']);
        }
        foreach (['genre_id', 'format_id', 'age_category_id', 'condition_id'] as $column) {
            if ($filters[$column] !== null) {
                $where[] = "l.$column = :$column";
                $params[":$column"] = $filters[$column];
            }
        }
        if ($query['date_from'] !== null) {
            $where[] = 'l.created_at >= :date_from';
            $params[':date_from'] = $query['date_from'] . ' 00:00:00';
        }
        if ($query['date_to'] !== null) {
            $where[] = 'l.created_at <= :date_to';
            $params[':date_to'] = $query['date_to'] . ' 23:59:59';
        }

        $orderParams = [];
        switch ($query['sort']) {
            case 'oldest':
                $orderSql = 'l.created_at ASC, l.id ASC';
                break;
            case 'title':
                $orderSql = 'l.title ASC, l.id ASC';
                break;
            case 'relevance':
                if ($favoriteGenres !== null && $favoriteGenres !== '') {
                    // Favourite genres first (FIND_IN_SET = 0 sorts after), newest within each group.
                    $orderSql = 'FIND_IN_SET(l.genre_id, :favorite_genres) = 0, l.created_at DESC, l.id DESC';
                    $orderParams[':favorite_genres'] = $favoriteGenres;
                    break;
                }
                // Anonymous callers and members without favourites fall back to newest.
            default:
                $orderSql = 'l.created_at DESC, l.id DESC';
        }

        $whereSql = 'WHERE ' . implode(' AND ', $where);

        return fetchPage(
            self::SELECT_SQL . " $whereSql ORDER BY $orderSql",
            "SELECT COUNT(*) FROM listings l $whereSql",
            $params,
            $query,
            $orderParams
        );
    }

    /**
     * All listings belonging to a user (their dashboard).
     *
     * @param int $userId
     * @return array
     */
    public function getByUserId(int $userId): array {
        return runQuery(
            self::SELECT_SQL . " WHERE l.user_id = :user_id ORDER BY l.created_at DESC",
            [':user_id' => $userId]
        )->fetchAll();
    }

    /**
     * Listings waiting for staff verification, oldest first.
     *
     * @return array
     */
    public function getPending(): array {
        return runQuery(self::SELECT_SQL . " WHERE l.status = 'unverified' ORDER BY l.created_at ASC")->fetchAll();
    }

    /**
     * Unverified or available listings with no activity for IDLE_LISTING_DAYS
     * (Phase 1 §3.2.6: flagged for follow-up or archiving).
     *
     * @return array
     */
    public function getIdle(): array {
        return runQuery(
            self::SELECT_SQL . "
            WHERE l.status IN ('unverified', 'available')
              AND COALESCE(l.updated_at, l.created_at) < NOW() - INTERVAL :days DAY
            ORDER BY COALESCE(l.updated_at, l.created_at) ASC",
            [':days' => IDLE_LISTING_DAYS]
        )->fetchAll();
    }

    /**
     * IDs of a user's listings that can still be withdrawn.
     *
     * @param int $userId
     * @return int[]
     */
    public function getWithdrawableIdsForOwner(int $userId): array {
        $ids = runQuery(
            "SELECT id FROM listings WHERE user_id = :user_id AND status IN ('unverified', 'available', 'returned')",
            [':user_id' => $userId]
        )->fetchAll(PDO::FETCH_COLUMN);
        return array_map('intval', $ids);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Insert a new listing submitted by a member. Status starts as 'unverified'.
     *
     * @param array $data Keys: user_id, title, author, edition, publisher, genre_id,
     *                    format_id, age_category_id, condition_id, preferred_return, is_open_offer.
     * @return int New listing ID.
     */
    public function create(array $data): int {
        runQuery("
            INSERT INTO listings
                (user_id, genre_id, format_id, age_category_id, condition_id, title, author,
                 edition, publisher, preferred_return, is_open_offer, status, created_at)
            VALUES
                (:user_id, :genre_id, :format_id, :age_category_id, :condition_id, :title, :author,
                 :edition, :publisher, :preferred_return, :is_open_offer, 'unverified', NOW())
        ", $this->listingParams($data) + [':user_id' => $data['user_id']]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Attach a stored photo to a listing.
     *
     * @param int    $listingId
     * @param string $filePath Relative path returned by saveBookPhotos().
     */
    public function addPhoto(int $listingId, string $filePath): void {
        runQuery(
            "INSERT INTO listing_photos (listing_id, file_path, created_at) VALUES (:listing_id, :file_path, NOW())",
            [':listing_id' => $listingId, ':file_path' => $filePath]
        );
    }

    /**
     * Update an editable listing (only while 'unverified' or 'returned').
     *
     * @param int   $id
     * @param array $data Same keys as create(), without user_id.
     */
    public function update(int $id, array $data): void {
        runQuery("
            UPDATE listings
            SET genre_id = :genre_id, format_id = :format_id, age_category_id = :age_category_id,
                condition_id = :condition_id, title = :title, author = :author, edition = :edition,
                publisher = :publisher, preferred_return = :preferred_return,
                is_open_offer = :is_open_offer, updated_at = NOW()
            WHERE id = :id
        ", $this->listingParams($data) + [':id' => $id]);
    }

    /**
     * Change a listing's status. Used by the system to lock, unlock, archive,
     * and withdraw. A null note keeps the existing staff note.
     *
     * @param int         $id
     * @param string      $status    One of LISTING_* constants.
     * @param string|null $staffNote
     */
    public function updateStatus(int $id, string $status, ?string $staffNote = null): void {
        runQuery(
            "UPDATE listings SET status = :status, staff_note = COALESCE(:note, staff_note), updated_at = NOW() WHERE id = :id",
            [':status' => $status, ':note' => $staffNote, ':id' => $id]
        );
    }

    /**
     * Set the same status on several listings (both books of an exchange).
     *
     * @param int[]  $ids
     * @param string $status
     */
    public function setStatusForIds(array $ids, string $status): void {
        foreach ($ids as $id) {
            $this->updateStatus((int) $id, $status);
        }
    }

    /**
     * Record a moderator's verification decision (approve, return, reject).
     *
     * @param int         $id
     * @param string      $status  LISTING_AVAILABLE, LISTING_RETURNED, or LISTING_REJECTED.
     * @param int         $staffId The deciding moderator (stored as verified_by).
     * @param string|null $note    Reason shown to the owner.
     */
    public function recordVerification(int $id, string $status, int $staffId, ?string $note): void {
        runQuery(
            "UPDATE listings SET status = :status, verified_by = :staff_id, staff_note = :note, updated_at = NOW() WHERE id = :id",
            [':status' => $status, ':staff_id' => $staffId, ':note' => $note, ':id' => $id]
        );
    }

    /**
     * Lock books for an exchange, but only those still 'available'.
     *
     * The condition sits in the UPDATE itself, so two owners accepting
     * competing requests at the same instant cannot both lock the same book.
     * The caller compares the returned count with the number of IDs.
     *
     * @param int[] $ids
     * @return int Number of listings actually locked.
     */
    public function lockAvailable(array $ids): int {
        [$in, $params] = bindInList('listing', $ids);
        return runQuery(
            "UPDATE listings SET status = 'locked', updated_at = NOW() WHERE id IN ($in) AND status = 'available'",
            $params
        )->rowCount();
    }

    /**
     * Soft-delete a listing by setting status to 'withdrawn'.
     *
     * @param int $id
     */
    public function withdraw(int $id): void {
        runQuery("UPDATE listings SET status = 'withdrawn', updated_at = NOW() WHERE id = :id", [':id' => $id]);
    }

    /**
     * Placeholder values shared by create() and update().
     *
     * @param array $data
     * @return array
     */
    private function listingParams(array $data): array {
        return [
            ':genre_id'         => $data['genre_id'],
            ':format_id'        => $data['format_id'],
            ':age_category_id'  => $data['age_category_id'],
            ':condition_id'     => $data['condition_id'],
            ':title'            => $data['title'],
            ':author'           => $data['author'],
            ':edition'          => $data['edition'] !== '' ? $data['edition'] : null,
            ':publisher'        => $data['publisher'] !== '' ? $data['publisher'] : null,
            ':preferred_return' => $data['preferred_return'] !== '' ? $data['preferred_return'] : null,
            ':is_open_offer'    => $data['is_open_offer'] ? 1 : 0,
        ];
    }
}
