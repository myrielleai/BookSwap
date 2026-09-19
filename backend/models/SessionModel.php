<?php

/**
 * SessionModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side sessions behind the JWTs (table: user_sessions).
 *
 * A JWT on its own cannot be taken back before it expires. Pairing each token
 * with a session row gives the server a switch: revoking the row ends the
 * session immediately, whatever the token's expiry says.
 *
 * Only the SHA-256 hash of the token ID is stored, never the token itself.
 *
 * TABLE: user_sessions
 *   id, user_id (FK→users), token_hash, ip_address, user_agent,
 *   created_at, last_seen_at, expires_at, revoked_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/auth.php';

class SessionModel {

    private PDO $db;

    public function __construct() {
        $this->db = getDBConnection();
    }

    /**
     * Open a session for a successful login.
     *
     * @param int    $userId
     * @param string $tokenId   The JWT's jti claim (hashed before storage).
     * @param int    $expiresAt Unix timestamp; the same value as the JWT's exp.
     * @param string $ipAddress
     * @param string $userAgent
     * @return int New session ID.
     */
    public function create(int $userId, string $tokenId, int $expiresAt, string $ipAddress, string $userAgent): int {
        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $expiresSql = $driver === 'sqlite' ? "datetime(:expires_at, 'unixepoch')" : "FROM_UNIXTIME(:expires_at)";

        runQuery("
            INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, created_at, last_seen_at, expires_at)
            VALUES (:user_id, :token_hash, :ip_address, :user_agent, NOW(), NOW(), {$expiresSql})
        ", [
            ':user_id'    => $userId,
            ':token_hash' => hashTokenId($tokenId),
            ':ip_address' => substr($ipAddress, 0, 45),
            ':user_agent' => substr($userAgent, 0, 255),
            ':expires_at' => $expiresAt,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function findActive(string $tokenId): ?array {
        $stmt = runQuery("
            SELECT s.id, s.user_id, u.role AS user_role, u.status AS user_status
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = :token_hash
              AND s.revoked_at IS NULL
              AND s.expires_at > NOW()
            LIMIT 1
        ", [':token_hash' => hashTokenId($tokenId)]);
        return $stmt->fetch() ?: null;
    }

    public function touch(int $id): void {
        runQuery("UPDATE user_sessions SET last_seen_at = NOW() WHERE id = :id", [':id' => $id]);
    }

    public function revoke(string $tokenId): void {
        runQuery("
            UPDATE user_sessions SET revoked_at = NOW()
            WHERE token_hash = :token_hash AND revoked_at IS NULL
        ", [':token_hash' => hashTokenId($tokenId)]);
    }

    public function revokeAllForUser(int $userId): int {
        $stmt = runQuery("
            UPDATE user_sessions SET revoked_at = NOW()
            WHERE user_id = :user_id AND revoked_at IS NULL
        ", [':user_id' => $userId]);
        return $stmt->rowCount();
    }

}
