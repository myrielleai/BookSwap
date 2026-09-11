<?php

/**
 * UserModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * All database operations related to the `users` table.
 *
 * HOW TO INTEGRATE THE DATABASE (for the groupmate):
 *  1. Make sure getDBConnection() in config/database.php returns a live PDO.
 *  2. Each method below has a block comment showing the exact SQL to run.
 *  3. Uncomment the PDO lines inside each method and remove the stub return.
 *  4. Do not change method names or signatures — the controllers depend on them.
 *
 * TABLE ASSUMED: users
 *   id, name, email, phone, password_hash, role, status,
 *   city, favorite_genres (JSON or comma-separated), exchange_count,
 *   created_at, updated_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

class UserModel {

    private ?PDO $db;

    public function __construct() {
        // Receives the PDO connection (null until DB is wired up).
        $this->db = getDBConnection();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    /**
     * Find a user by their primary key.
     *
     * @param int $id User's primary key.
     * @return array|null User row or null if not found.
     */
    public function findById(int $id): ?array {
        // TODO (DB): Run this query when the database is connected.
        // SQL: SELECT * FROM users WHERE id = :id LIMIT 1
        //
        // $stmt = $this->db->prepare("SELECT * FROM users WHERE id = :id LIMIT 1");
        // $stmt->execute([':id' => $id]);
        // $result = $stmt->fetch();
        // return $result ?: null;

        return null; // stub
    }

    /**
     * Find a user by their email address.
     * Used during login to retrieve the stored password hash.
     *
     * @param string $email
     * @return array|null
     */
    public function findByEmail(string $email): ?array {
        // TODO (DB):
        // SQL: SELECT * FROM users WHERE email = :email LIMIT 1
        //
        // $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        // $stmt->execute([':email' => $email]);
        // $result = $stmt->fetch();
        // return $result ?: null;

        return null; // stub
    }

    /**
     * Get all users — used by Admin for the user management screen.
     * Optionally filter by status or role.
     *
     * @param string|null $status  Filter by account status (e.g., 'pending').
     * @param string|null $role    Filter by role (e.g., 'customer').
     * @return array               List of user rows.
     */
    public function getAll(?string $status = null, ?string $role = null): array {
        // TODO (DB):
        // Build a dynamic WHERE clause based on the optional filters.
        //
        // $where  = [];
        // $params = [];
        // if ($status) { $where[] = 'status = :status'; $params[':status'] = $status; }
        // if ($role)   { $where[] = 'role = :role';     $params[':role']   = $role;   }
        // $sql = 'SELECT id, name, email, phone, role, status, city, exchange_count, created_at FROM users';
        // if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        // $sql .= ' ORDER BY created_at DESC';
        // $stmt = $this->db->prepare($sql);
        // $stmt->execute($params);
        // return $stmt->fetchAll();

        return []; // stub
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Insert a new user row (registration).
     * Status is set to 'pending' — Admin must approve before the account is active.
     *
     * @param array $data Associative array with keys: name, email, phone, password_hash, city.
     * @return int        The new user's auto-increment ID.
     */
    public function create(array $data): int {
        // TODO (DB):
        // SQL: INSERT INTO users (name, email, phone, password_hash, role, status, city, created_at)
        //      VALUES (:name, :email, :phone, :password_hash, 'customer', 'pending', :city, NOW())
        //
        // $stmt = $this->db->prepare("
        //     INSERT INTO users (name, email, phone, password_hash, role, status, city, created_at)
        //     VALUES (:name, :email, :phone, :password_hash, 'customer', 'pending', :city, NOW())
        // ");
        // $stmt->execute([
        //     ':name'          => $data['name'],
        //     ':email'         => $data['email'],
        //     ':phone'         => $data['phone'] ?? null,
        //     ':password_hash' => $data['password_hash'],
        //     ':city'          => $data['city'] ?? null,
        // ]);
        // return (int) $this->db->lastInsertId();

        return 0; // stub
    }

    /**
     * Update a user's profile fields (name, phone, city, favorite_genres).
     * Only the user themselves calls this; Admin uses updateStatus() / updateRole().
     *
     * @param int   $id   The user's primary key.
     * @param array $data Fields to update.
     * @return bool       True on success.
     */
    public function updateProfile(int $id, array $data): bool {
        // TODO (DB):
        // SQL: UPDATE users SET name=:name, phone=:phone, city=:city,
        //      favorite_genres=:genres, updated_at=NOW() WHERE id=:id
        //
        // $stmt = $this->db->prepare("
        //     UPDATE users
        //     SET name=:name, phone=:phone, city=:city, favorite_genres=:genres, updated_at=NOW()
        //     WHERE id=:id
        // ");
        // return $stmt->execute([
        //     ':name'   => $data['name'],
        //     ':phone'  => $data['phone'] ?? null,
        //     ':city'   => $data['city']  ?? null,
        //     ':genres' => $data['favorite_genres'] ?? null,
        //     ':id'     => $id,
        // ]);

        return false; // stub
    }

    /**
     * Update a user's account status (Admin action: approve, deactivate, reactivate).
     *
     * @param int    $id     The user's primary key.
     * @param string $status One of ACCOUNT_* constants.
     * @return bool
     */
    public function updateStatus(int $id, string $status): bool {
        // TODO (DB):
        // SQL: UPDATE users SET status=:status, updated_at=NOW() WHERE id=:id
        //
        // $stmt = $this->db->prepare("UPDATE users SET status=:status, updated_at=NOW() WHERE id=:id");
        // return $stmt->execute([':status' => $status, ':id' => $id]);

        return false; // stub
    }

    /**
     * Update a user's role (Admin-only: promote to staff, revoke staff).
     *
     * @param int    $id   The user's primary key.
     * @param string $role One of ROLE_* constants.
     * @return bool
     */
    public function updateRole(int $id, string $role): bool {
        // TODO (DB):
        // SQL: UPDATE users SET role=:role, updated_at=NOW() WHERE id=:id
        //
        // $stmt = $this->db->prepare("UPDATE users SET role=:role, updated_at=NOW() WHERE id=:id");
        // return $stmt->execute([':role' => $role, ':id' => $id]);

        return false; // stub
    }

    /**
     * Store a new hashed password for the user (password reset flow).
     *
     * @param int    $id           User's primary key.
     * @param string $passwordHash New bcrypt hash.
     * @return bool
     */
    public function updatePassword(int $id, string $passwordHash): bool {
        // TODO (DB):
        // SQL: UPDATE users SET password_hash=:hash, updated_at=NOW() WHERE id=:id
        //
        // $stmt = $this->db->prepare("UPDATE users SET password_hash=:hash, updated_at=NOW() WHERE id=:id");
        // return $stmt->execute([':hash' => $passwordHash, ':id' => $id]);

        return false; // stub
    }

    /**
     * Increment the exchange_count for a user after a transaction completes.
     *
     * @param int $id User's primary key.
     * @return bool
     */
    public function incrementExchangeCount(int $id): bool {
        // TODO (DB):
        // SQL: UPDATE users SET exchange_count = exchange_count + 1, updated_at=NOW() WHERE id=:id
        //
        // $stmt = $this->db->prepare("UPDATE users SET exchange_count = exchange_count + 1, updated_at=NOW() WHERE id=:id");
        // return $stmt->execute([':id' => $id]);

        return false; // stub
    }
}
