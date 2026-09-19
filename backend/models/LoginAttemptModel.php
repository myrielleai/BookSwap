<?php

/**
 * LoginAttemptModel.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Sign-in throttling (table: login_attempts).
 *
 * Without a limit, a script can guess passwords as fast as the server answers.
 * After LOGIN_MAX_FAILURES wrong passwords for one email, or
 * LOGIN_IP_MAX_FAILURES from one IP address, within LOGIN_LOCK_MINUTES, further
 * attempts are refused with HTTP 429 until the window passes. A successful
 * sign-in clears the count for that email.
 *
 * TABLE: login_attempts
 *   id, email, ip_address, succeeded, attempted_at
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class LoginAttemptModel {

    public function __construct() {
        getDBConnection();
    }

    /**
     * How long this email and IP must wait before trying again.
     *
     * @param string $email     Lower-cased email as submitted.
     * @param string $ipAddress
     * @return int Seconds to wait; 0 when sign-in is allowed.
     */
    public function secondsUntilAllowed(string $email, string $ipAddress): int {
        $pdo = getDBConnection();
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

        if ($driver === 'sqlite') {
            $stmt = runQuery("
                SELECT COUNT(*) FROM login_attempts
                 WHERE email = :email AND succeeded = 0
                   AND attempted_at > datetime('now', '-15 minutes')
            ", [':email' => $email]);
            $count = (int) $stmt->fetchColumn();
            return $count >= LOGIN_MAX_FAILURES ? 60 : 0;
        }

        $row = runQuery("
            SELECT
                (SELECT COUNT(*) FROM login_attempts
                  WHERE email = :email_count AND succeeded = 0
                    AND attempted_at > NOW() - INTERVAL :window_email_count MINUTE
                    AND attempted_at > COALESCE(
                        (SELECT MAX(s.attempted_at) FROM login_attempts s
                          WHERE s.email = :email_success AND s.succeeded = 1),
                        '1000-01-01')
                ) AS email_failures,
                (SELECT TIMESTAMPDIFF(SECOND, NOW(), MIN(attempted_at) + INTERVAL :window_email_wait MINUTE)
                   FROM login_attempts
                  WHERE email = :email_wait AND succeeded = 0
                    AND attempted_at > NOW() - INTERVAL :window_email_scope MINUTE
                ) AS email_wait,
                (SELECT COUNT(*) FROM login_attempts
                  WHERE ip_address = :ip_count AND succeeded = 0
                    AND attempted_at > NOW() - INTERVAL :window_ip_count MINUTE
                ) AS ip_failures,
                (SELECT TIMESTAMPDIFF(SECOND, NOW(), MIN(attempted_at) + INTERVAL :window_ip_wait MINUTE)
                   FROM login_attempts
                  WHERE ip_address = :ip_wait AND succeeded = 0
                    AND attempted_at > NOW() - INTERVAL :window_ip_scope MINUTE
                ) AS ip_wait
        ", [
            ':email_count'        => $email,
            ':email_success'      => $email,
            ':email_wait'         => $email,
            ':ip_count'           => $ipAddress,
            ':ip_wait'            => $ipAddress,
            ':window_email_count' => LOGIN_LOCK_MINUTES,
            ':window_email_wait'  => LOGIN_LOCK_MINUTES,
            ':window_email_scope' => LOGIN_LOCK_MINUTES,
            ':window_ip_count'    => LOGIN_LOCK_MINUTES,
            ':window_ip_wait'     => LOGIN_LOCK_MINUTES,
            ':window_ip_scope'    => LOGIN_LOCK_MINUTES,
        ])->fetch();

        $wait = 0;
        if ((int) $row['email_failures'] >= LOGIN_MAX_FAILURES) {
            $wait = max($wait, (int) $row['email_wait'], 1);
        }
        if ((int) $row['ip_failures'] >= LOGIN_IP_MAX_FAILURES) {
            $wait = max($wait, (int) $row['ip_wait'], 1);
        }
        return $wait;
    }


    /**
     * Record a sign-in attempt. A success also prunes attempts older than a day.
     *
     * @param string $email
     * @param string $ipAddress
     * @param bool   $succeeded
     */
    public function record(string $email, string $ipAddress, bool $succeeded): void {
        runQuery(
            "INSERT INTO login_attempts (email, ip_address, succeeded, attempted_at) VALUES (:email, :ip, :succeeded, NOW())",
            [':email' => substr($email, 0, 255), ':ip' => substr($ipAddress, 0, 45), ':succeeded' => $succeeded ? 1 : 0]
        );

        if ($succeeded) {
            runQuery("DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL 1 DAY");
        }
    }
}
