-- =============================================================================
-- BookSwap: Centralized Peer-to-Peer Book Exchange Platform for Bookworms
-- MySQL schema aligned to the Phase 1 ERD (Figure 2 of the project document)
-- Compatible with MySQL 8.0+ / MariaDB 10.4+ (InnoDB, utf8mb4)
--
-- Naming: tables and relationships follow the ERD. Columns that existed before
-- the Phase 1 alignment keep their names (id primary keys, users.name,
-- listings.user_id, exchange_requests.target_listing_id, conditions.label,
-- activity_log.actor_id / record_type / record_id / note). Columns added for the
-- ERD use its names. The Phase 2 document lists the full name mapping.
--
-- Two additions go beyond the ERD:
--   user_sessions       server-side sessions (Final Project Guide: session management)
--   reports.request_id  spam-request reports (Phase 1 §3.2.2)
-- =============================================================================

DROP DATABASE IF EXISTS bookswap;
CREATE DATABASE bookswap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookswap;

-- 1. USERS  (ERD: USER)
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,                 -- ERD: full_name
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20)  NULL,                     -- Shown only to counterparties after acceptance
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
    status          ENUM('pending','active','inactive','suspended') NOT NULL DEFAULT 'pending',
    city            VARCHAR(100) NULL,
    favorite_genres VARCHAR(255) NULL,                     -- Comma-separated genre IDs, e.g. '1,3'
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_status_role (status, role)
) ENGINE=InnoDB;

-- 2. GENRES  (ERD: GENRE)
CREATE TABLE genres (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,            -- Retired entries stay readable on old listings
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. FORMATS  (ERD: FORMAT)
CREATE TABLE formats (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. AGE CATEGORIES  (ERD: AGE_CATEGORY)
CREATE TABLE age_categories (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. CONDITIONS  (ERD: CONDITION_GRADE)
CREATE TABLE conditions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    label       VARCHAR(50) NOT NULL UNIQUE,               -- ERD: name
    description TEXT        NOT NULL,
    is_active   TINYINT(1)  NOT NULL DEFAULT 1,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. MEETUP LOCATIONS  (ERD: MEETUP_LOCATION)
CREATE TABLE meetup_locations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    address    VARCHAR(255) NOT NULL,
    city       VARCHAR(100) NOT NULL,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. LISTINGS  (ERD: LISTING)
CREATE TABLE listings (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,                -- ERD: owner_id
    genre_id         INT          NOT NULL,
    format_id        INT          NULL,
    age_category_id  INT          NULL,
    condition_id     INT          NOT NULL,
    verified_by      INT          NULL,                    -- Moderator who approved, returned, or rejected it
    title            VARCHAR(255) NOT NULL,
    author           VARCHAR(255) NOT NULL,
    edition          VARCHAR(100) NULL,
    publisher        VARCHAR(150) NULL,
    preferred_return VARCHAR(255) NULL,
    is_open_offer    TINYINT(1)   NOT NULL DEFAULT 0,      -- Phase 1 §3.3.2: open to any offer
    status           ENUM('unverified','available','locked','returned','rejected','archived','withdrawn') NOT NULL DEFAULT 'unverified',
    staff_note       TEXT         NULL,                    -- Phase 1 §3.2.1: reason for a return or rejection
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)         REFERENCES users(id)          ON DELETE RESTRICT,
    FOREIGN KEY (genre_id)        REFERENCES genres(id)         ON DELETE RESTRICT,
    FOREIGN KEY (format_id)       REFERENCES formats(id)        ON DELETE RESTRICT,
    FOREIGN KEY (age_category_id) REFERENCES age_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (condition_id)    REFERENCES conditions(id)     ON DELETE RESTRICT,
    FOREIGN KEY (verified_by)     REFERENCES users(id)          ON DELETE SET NULL,
    INDEX idx_listings_status_created (status, created_at),
    INDEX idx_listings_owner_status (user_id, status)
) ENGINE=InnoDB;

-- 8. LISTING PHOTOS  (ERD: LISTING_PHOTO) — at least one per listing
CREATE TABLE listing_photos (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT          NOT NULL,
    file_path  VARCHAR(500) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. EXCHANGE REQUESTS  (ERD: EXCHANGE_REQUEST) — decided by the listing owner
CREATE TABLE exchange_requests (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    requester_id       INT          NOT NULL,
    target_listing_id  INT          NOT NULL,              -- ERD: requested_listing_id
    offered_listing_id INT          NOT NULL,
    message            TEXT         NULL,
    status             ENUM('pending','accepted','declined','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'pending',
    decline_reason     VARCHAR(255) NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at       DATETIME     NULL,                  -- When the owner accepted or declined
    updated_at         DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_request_distinct_books CHECK (target_listing_id <> offered_listing_id),
    FOREIGN KEY (requester_id)       REFERENCES users(id)    ON DELETE RESTRICT,
    FOREIGN KEY (target_listing_id)  REFERENCES listings(id) ON DELETE RESTRICT,
    FOREIGN KEY (offered_listing_id) REFERENCES listings(id) ON DELETE RESTRICT,
    INDEX idx_requests_status_created (status, created_at),
    INDEX idx_requests_target_status (target_listing_id, status),
    INDEX idx_requests_offered_status (offered_listing_id, status)
) ENGINE=InnoDB;

-- 10. HANDOVER SLOTS  (ERD: HANDOVER_SLOT) — pool defined by the Administrator
CREATE TABLE handover_slots (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    location_id  INT        NOT NULL,
    slot_date    DATE       NOT NULL,
    start_time   TIME       NOT NULL,
    end_time     TIME       NOT NULL,
    is_available TINYINT(1) NOT NULL DEFAULT 1,            -- 0 once booked or retired
    created_at   DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_slot_times CHECK (end_time > start_time),
    UNIQUE KEY uq_slot_location_start (location_id, slot_date, start_time),
    FOREIGN KEY (location_id) REFERENCES meetup_locations(id) ON DELETE RESTRICT,
    INDEX idx_slots_date_available (slot_date, is_available)
) ENGINE=InnoDB;

-- 11. TRANSACTIONS  (ERD: TRANSACTION) — Accepted → Scheduled → Completed | Cancelled
CREATE TABLE transactions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    exchange_request_id INT          NOT NULL UNIQUE,      -- ERD: request_id (1:1, "becomes")
    handled_by          INT          NULL,                 -- Moderator handling the handover
    slot_id             INT          NULL,                 -- Booked handover slot
    status              ENUM('accepted','scheduled','completed','cancelled') NOT NULL DEFAULT 'accepted',
    reschedule_count    INT          NOT NULL DEFAULT 0,
    cancel_reason       VARCHAR(255) NULL,
    requester_confirmed TINYINT(1)   NOT NULL DEFAULT 0,
    owner_confirmed     TINYINT(1)   NOT NULL DEFAULT 0,
    completed_at        DATETIME     NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_reschedule_limit CHECK (reschedule_count BETWEEN 0 AND 1),
    FOREIGN KEY (exchange_request_id) REFERENCES exchange_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (handled_by)          REFERENCES users(id)             ON DELETE SET NULL,
    FOREIGN KEY (slot_id)             REFERENCES handover_slots(id)    ON DELETE RESTRICT,
    INDEX idx_transactions_status_updated (status, updated_at)
) ENGINE=InnoDB;

-- 12. REPORTS  (ERD: REPORT) — disputes, no-shows, inappropriate listings, spam requests
CREATE TABLE reports (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id    INT      NOT NULL,
    transaction_id INT      NULL,
    listing_id     INT      NULL,
    request_id     INT      NULL,                          -- Beyond the ERD: spam-request reports
    handled_by     INT      NULL,
    report_type    ENUM('misdescribed_condition','no_show','inappropriate_listing','spam_request') NOT NULL,
    description    TEXT     NOT NULL,
    resolution     TEXT     NULL,
    status         ENUM('open','resolved','escalated') NOT NULL DEFAULT 'open',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_report_has_subject CHECK (transaction_id IS NOT NULL OR listing_id IS NOT NULL OR request_id IS NOT NULL),
    FOREIGN KEY (reporter_id)    REFERENCES users(id)             ON DELETE RESTRICT,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)      ON DELETE RESTRICT,
    FOREIGN KEY (listing_id)     REFERENCES listings(id)          ON DELETE RESTRICT,
    FOREIGN KEY (request_id)     REFERENCES exchange_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (handled_by)     REFERENCES users(id)             ON DELETE SET NULL,
    INDEX idx_reports_status_created (status, created_at)
) ENGINE=InnoDB;

-- 13. NOTIFICATIONS  (ERD: NOTIFICATION)
CREATE TABLE notifications (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT         NOT NULL,
    type                VARCHAR(60) NOT NULL,
    message             TEXT        NOT NULL,
    is_read             TINYINT(1)  NOT NULL DEFAULT 0,
    related_record_type VARCHAR(30) NULL,                  -- Deep link target, e.g. 'transaction'
    related_record_id   INT         NULL,
    created_at          DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_read (user_id, is_read, created_at)
) ENGINE=InnoDB;

-- 14. ACTIVITY LOG  (ERD: ACTIVITY_LOG) — append-only audit trail
CREATE TABLE activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    actor_id    INT         NOT NULL,                      -- ERD: user_id
    record_type VARCHAR(30) NOT NULL,                      -- ERD: entity_type
    record_id   INT         NOT NULL,                      -- ERD: entity_id
    action      VARCHAR(60) NOT NULL,
    note        TEXT        NULL,                          -- ERD: reason
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_record (record_type, record_id),
    INDEX idx_activity_actor (actor_id, created_at)
) ENGINE=InnoDB;

-- 15. WATCHLIST  (ERD: WATCHLIST) — resolves the many-to-many between users and listings
CREATE TABLE watchlist (
    id         INT      AUTO_INCREMENT PRIMARY KEY,
    user_id    INT      NOT NULL,
    listing_id INT      NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_watchlist_user_listing (user_id, listing_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. USER SESSIONS  (beyond the ERD — Final Project Guide: session management)
CREATE TABLE user_sessions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT          NOT NULL,
    token_hash   CHAR(64)     NOT NULL UNIQUE,             -- SHA-256 of the JWT's jti; the token is never stored
    ip_address   VARCHAR(45)  NULL,
    user_agent   VARCHAR(255) NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at   DATETIME     NOT NULL,
    revoked_at   DATETIME     NULL,                        -- Set on logout, deactivation, role change, password reset
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user_revoked (user_id, revoked_at)
) ENGINE=InnoDB;
