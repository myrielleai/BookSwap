<?php

/**
 * NotificationModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * In-app notification database operations.
 *
 * Implemented with live PDO operations for Member 4 (Database & API integration).
 *
 * TABLE ASSUMED: notifications
 *   id, user_id (FK→users), type, message, is_read (bool),
 *   related_record_type, related_record_id, created_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class NotificationModel {

    private ?PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Create a new notification for a user.
     * Controllers call this whenever a state change needs to notify a party.
     *
     * @param int         $userId            Recipient's user ID.
     * @param string      $type              Short type tag, e.g., 'listing_verified', 'handover_scheduled'.
     * @param string      $message           Human-readable notification text.
     * @param string      $relatedRecordType 'listing' | 'request' | 'transaction' | null.
     * @param int|null    $relatedRecordId   Primary key of the related record (for deep-linking).
     * @return int   New notification ID.
     */
    public function create(int $userId, string $type, string $message, string $relatedRecordType = '', ?int $relatedRecordId = null): int {
        if (!$this->db) return 0;
        $stmt = $this->db->prepare("
            INSERT INTO notifications
            (user_id, type, message, is_read, related_record_type, related_record_id, created_at)
            VALUES (:uid, :type, :msg, 0, :rtype, :rid, NOW())
        ");
        $stmt->execute([
            ':uid'   => $userId,
            ':type'  => $type,
            ':msg'   => $message,
            ':rtype' => $relatedRecordType ?: null,
            ':rid'   => $relatedRecordId,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Get all unread notifications for a user, newest first.
     *
     * @param int $userId
     * @return array
     */
    public function getUnread(int $userId): array {
        if (!$this->db) return [];
        $stmt = $this->db->prepare("SELECT * FROM notifications WHERE user_id = :uid AND is_read = 0 ORDER BY created_at DESC");
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Get all notifications for a user (for the full notification history page).
     *
     * @param int $userId
     * @return array
     */
    public function getAll(int $userId): array {
        if (!$this->db) return [];
        $stmt = $this->db->prepare("SELECT * FROM notifications WHERE user_id = :uid ORDER BY created_at DESC");
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll() ?: [];
    }

    /**
     * Mark a specific notification as read.
     *
     * @param int $id         Notification primary key.
     * @param int $userId     The owner must match (prevents cross-user marking).
     * @return bool
     */
    public function markRead(int $id, int $userId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :uid");
        return $stmt->execute([':id' => $id, ':uid' => $userId]);
    }

    /**
     * Mark all notifications as read for a user.
     *
     * @param int $userId
     * @return bool
     */
    public function markAllRead(int $userId): bool {
        if (!$this->db) return false;
        $stmt = $this->db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :uid AND is_read = 0");
        return $stmt->execute([':uid' => $userId]);
    }
}
