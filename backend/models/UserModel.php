<?php

/**
 * UserModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `users` table.
 *
 * TABLE: users
 *   id, name, email, phone, password_hash, role, status, city,
 *   favorite_genres (comma-separated genre IDs), created_at, updated_at
 *
 * A member's completed-exchange count (Phase 1 §3.3.1) is not stored. It is
 * counted from completed transactions, so it can never drift out of step with
 * the exchanges that actually happened.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class UserModel {

    private PDO $db;

    // Completed exchanges where the user was the requester or owned the
    // requested book. Correlated on the outer alias `u`.
    private const COMPLETED_EXCHANGES_SQL = "(
        SELECT COUNT(*)
        FROM transactions t
        JOIN exchange_requests er ON er.id = t.exchange_request_id
        JOIN listings tl          ON tl.id = er.target_listing_id
        WHERE t.status = 'completed'
          AND (er.requester_id = u.id OR tl.user_id = u.id)
    )";

    public function __construct() {
        $this->db = getDBConnection();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Find a user by primary key, with their completed-exchange count.
     *
     * @param int $id
     * @return array|null
     */
    public function findById(int $id): ?array {
        $sql = "SELECT u.*, " . self::COMPLETED_EXCHANGES_SQL . " AS completed_exchanges
                FROM users u
                WHERE u.id = :id LIMIT 1";
        return runQuery($sql, [':id' => $id])->fetch() ?: null;
    }

    /**
     * Find a user by email address. Used at login to read the password hash.
     *
     * @param string $email Already lower-cased.
     * @return array|null
     */
    public function findByEmail(string $email): ?array {
        return runQuery("SELECT * FROM users WHERE email = :email LIMIT 1", [':email' => $email])->fetch() ?: null;
    }

    /**
     * Search users for the Admin user-management screen.
     *
     * @param array       $query readListQuery() output: keyword, status, dates, sort, paging.
     * @param string|null $role  Optional role filter.
     * @return array ['rows' => array, 'total' => int]
     */
    public function search(array $query, ?string $role): array {
        $where  = [];
        $params = [];

        if ($query['keyword'] !== '') {
            $where[] = '(u.name LIKE :kw_name OR u.email LIKE :kw_email)';
            $params[':kw_name']  = likeContains($query['keyword']);
            $params[':kw_email'] = likeContains($query['keyword']);
        }
        if ($query['status'] !== null) {
            $where[] = 'u.status = :status';
            $params[':status'] = $query['status'];
        }
        if ($role !== null) {
            $where[] = 'u.role = :role';
            $params[':role'] = $role;
        }
        if ($query['date_from'] !== null) {
            $where[] = 'u.created_at >= :date_from';
            $params[':date_from'] = $query['date_from'] . ' 00:00:00';
        }
        if ($query['date_to'] !== null) {
            $where[] = 'u.created_at <= :date_to';
            $params[':date_to'] = $query['date_to'] . ' 23:59:59';
        }

        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $orderSql = [
            'newest' => 'u.created_at DESC, u.id DESC',
            'oldest' => 'u.created_at ASC, u.id ASC',
            'name'   => 'u.name ASC, u.id ASC',
        ][$query['sort']];

        return fetchPage(
            "SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.city, u.created_at,
                    " . self::COMPLETED_EXCHANGES_SQL . " AS completed_exchanges
             FROM users u $whereSql
             ORDER BY $orderSql",
            "SELECT COUNT(*) FROM users u $whereSql",
            $params,
            $query
        );
    }

    /**
     * Number of active Administrator accounts.
     *
     * @return int
     */
    public function countActiveAdmins(): int {
        return (int) runQuery(
            "SELECT COUNT(*) FROM users WHERE role = :role AND status = :status",
            [':role' => ROLE_ADMIN, ':status' => ACCOUNT_ACTIVE]
        )->fetchColumn();
    }

    /**
     * IDs of active users holding a role, used to notify every moderator or admin.
     *
     * @param string $role
     * @return int[]
     */
    public function getActiveIdsByRole(string $role): array {
        $ids = runQuery(
            "SELECT id FROM users WHERE role = :role AND status = :status",
            [':role' => $role, ':status' => ACCOUNT_ACTIVE]
        )->fetchAll(PDO::FETCH_COLUMN);
        return array_map('intval', $ids);
    }

    /**
     * True while the user is part of an accepted or scheduled exchange.
     * Self-deactivation is refused in that state.
     *
     * @param int $userId
     * @return bool
     */
    public function hasActiveTransaction(int $userId): bool {
        $sql = "SELECT COUNT(*)
                FROM transactions t
                JOIN exchange_requests er ON er.id = t.exchange_request_id
                JOIN listings tl          ON tl.id = er.target_listing_id
                WHERE t.status IN ('accepted', 'scheduled')
                  AND (er.requester_id = :requester_id OR tl.user_id = :owner_id)";
        return (int) runQuery($sql, [':requester_id' => $userId, ':owner_id' => $userId])->fetchColumn() > 0;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Insert a new user row (registration).
     * Status is 'pending' — an Admin must approve before the account is active.
     *
     * @param array $data Keys: name, email, phone, password_hash, city.
     * @return int        The new user's ID.
     */
    public function create(array $data): int {
        runQuery("
            INSERT INTO users (name, email, phone, password_hash, role, status, city, created_at)
            VALUES (:name, :email, :phone, :password_hash, 'customer', 'pending', :city, NOW())
        ", [
            ':name'          => $data['name'],
            ':email'         => $data['email'],
            ':phone'         => $data['phone'] !== '' ? $data['phone'] : null,
            ':password_hash' => $data['password_hash'],
            ':city'          => $data['city'] !== '' ? $data['city'] : null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Update a user's own profile fields.
     *
     * @param int   $id
     * @param array $data Keys: name, phone, city, favorite_genres (CSV of IDs or null).
     */
    public function updateProfile(int $id, array $data): void {
        runQuery("
            UPDATE users
            SET name = :name, phone = :phone, city = :city, favorite_genres = :favorite_genres, updated_at = NOW()
            WHERE id = :id
        ", [
            ':name'            => $data['name'],
            ':phone'           => $data['phone'] !== '' ? $data['phone'] : null,
            ':city'            => $data['city'] !== '' ? $data['city'] : null,
            ':favorite_genres' => $data['favorite_genres'],
            ':id'              => $id,
        ]);
    }

    /**
     * Update a user's account status (approve, deactivate, reactivate, suspend).
     *
     * @param int    $id
     * @param string $status One of ACCOUNT_* constants.
     */
    public function updateStatus(int $id, string $status): void {
        runQuery("UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id", [':status' => $status, ':id' => $id]);
    }

    /**
     * Update a user's role (Admin-only: promote to staff, revoke staff).
     *
     * @param int    $id
     * @param string $role One of ROLE_* constants.
     */
    public function updateRole(int $id, string $role): void {
        runQuery("UPDATE users SET role = :role, updated_at = NOW() WHERE id = :id", [':role' => $role, ':id' => $id]);
    }

    /**
     * Store a new hashed password (password reset).
     *
     * @param int    $id
     * @param string $passwordHash New bcrypt hash.
     */
    public function updatePassword(int $id, string $passwordHash): void {
        runQuery("UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id", [':hash' => $passwordHash, ':id' => $id]);
    }

    // ── Google Sign-in ────────────────────────────────────────────────────────

    /**
     * Find a user already linked to a Google account.
     *
     * @param string $googleSub Google's stable subject ID for the account.
     * @return array|null
     */
    public function findByGoogleId(string $googleSub): ?array {
        return runQuery("SELECT * FROM users WHERE google_sub = :sub LIMIT 1", [':sub' => $googleSub])->fetch() ?: null;
    }

    /**
     * Link an existing password account to a Google identity, so future
     * sign-ins with that Google account reach this same user.
     *
     * @param int    $id
     * @param string $googleSub
     */
    public function linkGoogle(int $id, string $googleSub): void {
        runQuery("UPDATE users SET google_sub = :sub, updated_at = NOW() WHERE id = :id", [':sub' => $googleSub, ':id' => $id]);
    }

    /**
     * Create a pending Customer account for a first-time Google sign-in.
     * A random password hash is stored so the row satisfies the NOT NULL
     * column; it is never used, because this account can only sign in
     * through Google.
     *
     * @param string $name
     * @param string $email          Already verified by Google.
     * @param string $googleSub
     * @param string $randomPasswordHash
     * @return int The new user's ID.
     */
    public function createFromGoogle(string $name, string $email, string $googleSub, string $randomPasswordHash): int {
        runQuery("
            INSERT INTO users (name, email, google_sub, password_hash, role, status, created_at)
            VALUES (:name, :email, :sub, :password_hash, 'customer', 'pending', NOW())
        ", [
            ':name'          => $name,
            ':email'         => $email,
            ':sub'           => $googleSub,
            ':password_hash' => $randomPasswordHash,
        ]);
        return (int) $this->db->lastInsertId();
    }
}
