-- =============================================================================
-- BookSwap: Google Sign-in + Book Lookup Migration
-- Run after schema.sql (and after migration_email_log.sql, if you applied it).
-- =============================================================================

USE bookswap;

-- Links a user to their Google account. NULL for members who only use a password.
ALTER TABLE users
    ADD COLUMN google_sub VARCHAR(255) NULL UNIQUE AFTER password_hash;

-- Caches Open Library ISBN lookups so repeat scans of the same book don't
-- call the external API again.
CREATE TABLE book_lookup_cache (
    isbn        VARCHAR(20)  NOT NULL PRIMARY KEY,
    found       TINYINT(1)   NOT NULL,
    payload     TEXT         NULL,       -- JSON book details, NULL when found = 0
    fetched_at  DATETIME     NOT NULL,
    expires_at  DATETIME     NOT NULL,
    INDEX idx_book_lookup_expires (expires_at)
) ENGINE=InnoDB;
