-- =============================================================================
-- BookSwap: Email Log Migration
-- Run after schema.sql. Records every outgoing email so delivery is auditable
-- even when the mail server is unavailable.
-- =============================================================================

USE bookswap;

CREATE TABLE email_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    recipient   VARCHAR(255) NOT NULL,
    subject     VARCHAR(500) NOT NULL,
    body_text   TEXT         NOT NULL,
    status      ENUM('sent','failed','skipped') NOT NULL DEFAULT 'skipped',
    error_msg   VARCHAR(500) NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_recipient (recipient),
    INDEX idx_email_created (created_at)
) ENGINE=InnoDB;
