-- =============================================================================
-- BookSwap: Centralized Peer-to-Peer Academic Book Exchange Platform for ULSVO
-- Exact MySQL Database Schema for Backend API & ERD Alignment
-- Role: Member 4 (Database / API Developer)
-- Compatible with MySQL 8.0+ / MariaDB (InnoDB, utf8mb4)
-- =============================================================================

DROP DATABASE IF EXISTS bookswap;
CREATE DATABASE bookswap CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookswap;

-- 1. USERS TABLE (Supports auth, profile, and academic tagging)
CREATE TABLE users (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100)  NOT NULL,
    email               VARCHAR(255)  NOT NULL UNIQUE,
    id_number           VARCHAR(50)   NULL UNIQUE,       -- Student/Employee ID (e.g. 2024106233)
    college             VARCHAR(100)  NULL,              -- e.g. SOIT, SOCIT
    program             VARCHAR(100)  NULL,              -- e.g. BSIT, BSCS
    year_level          VARCHAR(50)   NULL,              -- e.g. 1st Year, 2nd Year
    phone               VARCHAR(20)   NULL,              -- Contact number for handover
    password_hash       VARCHAR(255)  NOT NULL,
    role                ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
    status              ENUM('pending','active','inactive','suspended') NOT NULL DEFAULT 'pending',
    city                VARCHAR(100)  NULL,
    favorite_genres     TEXT          NULL,
    exchange_count      INT           NOT NULL DEFAULT 0,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME      NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CATEGORIES (Genres / Disciplines)
CREATE TABLE categories (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    type                ENUM('genre','age','format') NOT NULL DEFAULT 'genre',
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. CONDITIONS (Condition Grades)
CREATE TABLE conditions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    label               VARCHAR(50)  NOT NULL UNIQUE,    -- 'Like New', 'Good', 'Fair', 'Heavily Used'
    description         TEXT         NOT NULL,
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. MEETUP LOCATIONS (Handover Venues)
CREATE TABLE meetup_locations (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    address             TEXT         NOT NULL,
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. LISTINGS
CREATE TABLE listings (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT          NOT NULL,
    title               VARCHAR(255) NOT NULL,
    author              VARCHAR(255) NOT NULL,
    edition             VARCHAR(100) NULL,
    publisher           VARCHAR(150) NULL,
    genre_id            INT          NOT NULL,
    condition_id        INT          NOT NULL,
    preferred_return    TEXT         NULL,
    is_open_offer       TINYINT(1)   NOT NULL DEFAULT 0,
    photo_path          VARCHAR(500) NOT NULL,
    status              ENUM('unverified','available','locked','returned','rejected','archived','withdrawn') NOT NULL DEFAULT 'unverified',
    staff_note          TEXT         NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (genre_id)     REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (condition_id) REFERENCES conditions(id) ON DELETE RESTRICT,
    INDEX idx_listing_status (status, genre_id, condition_id)
) ENGINE=InnoDB;

-- 6. EXCHANGE REQUESTS
CREATE TABLE exchange_requests (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    requester_id        INT  NOT NULL,
    target_listing_id   INT  NOT NULL,
    offered_listing_id  INT  NOT NULL,
    message             TEXT NULL,
    status              ENUM('pending','endorsed','accepted','declined','rejected','held','withdrawn','cancelled') NOT NULL DEFAULT 'pending',
    decline_reason      TEXT NULL,
    staff_note          TEXT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id)       REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_listing_id)  REFERENCES listings(id) ON DELETE RESTRICT,
    FOREIGN KEY (offered_listing_id) REFERENCES listings(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. TRANSACTIONS
CREATE TABLE transactions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    exchange_request_id INT          NOT NULL UNIQUE,
    status              ENUM('pending','approved','scheduled','completed','cancelled') NOT NULL DEFAULT 'pending',
    cancel_reason       TEXT         NULL,
    reschedule_count    INT          NOT NULL DEFAULT 0,
    handled_by          INT          NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_reschedule_limit CHECK (reschedule_count <= 1),
    FOREIGN KEY (exchange_request_id) REFERENCES exchange_requests(id) ON DELETE RESTRICT,
    FOREIGN KEY (handled_by)          REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. HANDOVER SLOTS
CREATE TABLE handover_slots (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id      INT          NOT NULL UNIQUE,
    location_id         INT          NOT NULL,
    slot_date           DATE         NOT NULL,
    slot_time           TIME         NOT NULL,
    confirmed_by_a      TINYINT(1)   NOT NULL DEFAULT 0,
    confirmed_by_b      TINYINT(1)   NOT NULL DEFAULT 0,
    no_show_recorded    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id)    REFERENCES meetup_locations(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9. NOTIFICATIONS
CREATE TABLE notifications (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT          NOT NULL,
    type                VARCHAR(60)  NOT NULL,
    message             TEXT         NOT NULL,
    is_read             TINYINT(1)   NOT NULL DEFAULT 0,
    related_record_type VARCHAR(30)  NULL,
    related_record_id   INT          NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. ACTIVITY LOG (Audit Trail)
CREATE TABLE activity_log (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    actor_id            INT          NOT NULL,
    record_type         VARCHAR(30)  NOT NULL,
    record_id           INT          NOT NULL,
    action              VARCHAR(60)  NOT NULL,
    note                TEXT         NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11. WATCHLIST
CREATE TABLE watchlist (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    listing_id          INT NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_watchlist (user_id, listing_id),
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
