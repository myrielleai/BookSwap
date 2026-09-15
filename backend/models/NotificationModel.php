<?php

/**
 * NotificationModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * In-app notification database operations (Phase 1 §3.3.6).
 *
 * TABLE: notifications
 *   id, user_id (FK→users), type, message, is_read,
 *   related_record_type, related_record_id, created_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class NotificationModel {

    private PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Create a notification for one user.
     *
     * @param int      $userId            Recipient.
     * @param string   $type              Short tag, e.g. 'listing_approved', 'handover_scheduled'.
     * @param string   $message           Human-readable text.
     * @param string   $relatedRecordType 'listing' | 'request' | 'transaction' | 'report' | ''.
     * @param int|null $relatedRecordId   Key of the related record, for deep links.
     * @return int New notification ID.
     */
    public function create(int $userId, string $type, string $message, string $relatedRecordType = '', ?int $relatedRecordId = null): int {
        runQuery("
            INSERT INTO notifications (user_id, type, message, is_read, related_record_type, related_record_id, created_at)
            VALUES (:user_id, :type, :message, 0, :record_type, :record_id, NOW())
        ", [
            ':user_id'     => $userId,
            ':type'        => $type,
            ':message'     => $message,
            ':record_type' => $relatedRecordType !== '' ? $relatedRecordType : null,
            ':record_id'   => $relatedRecordId,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Send the same notification to several users.
     *
     * @param int[]    $userIds
     * @param string   $type
     * @param string   $message
     * @param string   $relatedRecordType
     * @param int|null $relatedRecordId
     */
    public function notifyMany(array $userIds, string $type, string $message, string $relatedRecordType = '', ?int $relatedRecordId = null): void {
        foreach (array_unique(array_map('intval', $userIds)) as $userId) {
            $this->create($userId, $type, $message, $relatedRecordType, $relatedRecordId);
        }
    }

    /**
     * Tell everyone watching a listing that it is available (Phase 1 §3.3.3).
     *
     * @param int    $listingId
     * @param string $title
     * @return int Number of watchers notified.
     */
    public function notifyWatchers(int $listingId, string $title): int {
        return runQuery("
            INSERT INTO notifications (user_id, type, message, is_read, related_record_type, related_record_id, created_at)
            SELECT w.user_id, 'watchlist_available', :message, 0, 'listing', :listing_id, NOW()
            FROM watchlist w
            JOIN users u ON u.id = w.user_id AND u.status = 'active'
            WHERE w.listing_id = :watched_listing_id
        ", [
            ':message'            => "A book on your watchlist is available: \"$title\".",
            ':listing_id'         => $listingId,
            ':watched_listing_id' => $listingId,
        ])->rowCount();
    }

    /**
     * Unread notifications for a user, newest first.
     *
     * @param int $userId
     * @return array
     */
    public function getUnread(int $userId): array {
        return runQuery(
            "SELECT * FROM notifications WHERE user_id = :user_id AND is_read = 0 ORDER BY created_at DESC, id DESC",
            [':user_id' => $userId]
        )->fetchAll();
    }

    /**
     * Every notification for a user (full history), newest first.
     *
     * @param int $userId
     * @return array
     */
    public function getAll(int $userId): array {
        return runQuery(
            "SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC, id DESC",
            [':user_id' => $userId]
        )->fetchAll();
    }

    /**
     * Mark one of the user's notifications as read.
     *
     * @param int $id
     * @param int $userId The owner must match, so one user cannot mark another's.
     * @return bool False if no unread notification with that ID belongs to the user.
     */
    public function markRead(int $id, int $userId): bool {
        return runQuery(
            "UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id AND is_read = 0",
            [':id' => $id, ':user_id' => $userId]
        )->rowCount() === 1;
    }

    /**
     * Mark all of a user's notifications as read.
     *
     * @param int $userId
     * @return int Number marked.
     */
    public function markAllRead(int $userId): int {
        return runQuery(
            "UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0",
            [':user_id' => $userId]
        )->rowCount();
    }
}
