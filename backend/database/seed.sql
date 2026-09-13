-- =============================================================================
-- BookSwap: Sample Seed Data for Database Testing & Verification
-- Role: Member 4 (Database / API Developer)
-- =============================================================================

USE bookswap;

-- 1. Conditions
INSERT INTO conditions (id, label, description, is_active) VALUES
(1, 'Like New', 'Cover and pages intact with zero markings, folds, or tears. Spine is completely undamaged.', 1),
(2, 'Good', 'Minimal signs of usage. Minor highlighting or pencil notes on few pages; cover has slight edge wear.', 1),
(3, 'Fair', 'Noticeable shelf wear, creases, and frequent highlighting. All pages remain fully legible and securely bound.', 1),
(4, 'Heavily Used', 'Well-read with worn covers, loose spine, and extensive annotations. No missing reference pages.', 1);

-- 2. Categories
INSERT INTO categories (id, name, type, is_active) VALUES
(1, 'Computer Science & IT', 'genre', 1),
(2, 'Mathematics & Statistics', 'genre', 1),
(3, 'Engineering & Tech', 'genre', 1),
(4, 'General Education & Humanities', 'genre', 1);

-- 3. Meetup Locations (ULSVO Library Counter)
INSERT INTO meetup_locations (id, name, address, is_active) VALUES
(1, 'ULSVO Library Counter - 2nd Floor', 'Main University Library 2nd Floor, ULSVO Volunteer Station Counter A', 1),
(2, 'Student Activities Center Desk', 'SAC Ground Floor, Student Services Counter B', 1);

-- 4. Users (All passwords hashed for 'Password123!')
INSERT INTO users (id, name, email, id_number, college, program, year_level, phone, password_hash, role, status, city, exchange_count, created_at) VALUES
(1, 'System Administrator', 'admin@mymail.mapua.edu.ph', '2020100001', 'SOIT', 'BSIT', 'Faculty', '09170000001', '$2y$10$UWajBDtUWMcj9Q5ys.ikuOFkzViMRoIzeRR.LyKPRfmexyOtcDLd6', 'admin', 'active', 'Manila', 0, NOW()),
(2, 'Gabriel Cruz (Moderator)', 'mod.cruz@mymail.mapua.edu.ph', '2022108842', 'SOIT', 'BSIT', '3rd Year', '09170000002', '$2y$10$MfsWoSY777XwGY9cN0mEauMLRZYFc3fuhINmlY4BDNqhrrc4fxC1W', 'staff', 'active', 'Makati', 12, NOW()),
(3, 'Irish Gail A. De Leon', 'ideleon@mymail.mapua.edu.ph', '2024106233', 'SOIT', 'BSIT', '2nd Year', '09181112233', '$2y$10$YOvRPXQnk0OnfI2KJFKVtumHBeV7RVInFp.VdlREi3JTwauKphDae', 'customer', 'active', 'Manila', 5, NOW()),
(4, 'Marc Felipe', 'mfelipe@mymail.mapua.edu.ph', '2024101658', 'SOIT', 'BSIT', '2nd Year', '09192223344', '$2y$10$UiFY59K0xCPrbH2dS4SKhuOJwXgciWFSd8Iwr5NiRqqarq6DVh2Ka', 'customer', 'active', 'Pasig', 4, NOW()),
(5, 'Pending Student User', 'pending@mymail.mapua.edu.ph', '2025109988', 'SOCIT', 'BSCS', '1st Year', '09203334455', '$2y$10$BewSgFl2f/LSiTTh6xbk2u5J5R.A20neP4NKlp1RWOWy6xFSStGx.', 'customer', 'pending', 'Quezon City', 0, NOW());

-- 5. Listings
INSERT INTO listings (id, user_id, title, author, edition, publisher, genre_id, condition_id, preferred_return, is_open_offer, photo_path, status, created_at) VALUES
(1, 3, 'Introduction to Algorithms', 'Thomas H. Cormen', '4th Edition', 'MIT Press', 1, 1, 'Database Systems or Web Systems reference', 0, '/uploads/listings/cormen_algo.jpg', 'locked', NOW()),
(2, 4, 'Database System Concepts', 'Abraham Silberschatz', '7th Edition', 'McGraw-Hill', 1, 2, 'Algorithms or Discrete Math reference', 0, '/uploads/listings/silberschatz_db.jpg', 'locked', NOW()),
(3, 3, 'Computer Networks', 'Andrew S. Tanenbaum', '5th Edition', 'Pearson', 1, 3, 'Open to any IT reference', 1, '/uploads/listings/tanenbaum_networks.jpg', 'available', NOW());

-- 6. Exchange Requests
INSERT INTO exchange_requests (id, requester_id, target_listing_id, offered_listing_id, message, status, created_at) VALUES
(1, 4, 1, 2, 'Offering my Database System Concepts 7th Ed for your Algorithms book. Can meet during Tuesday afternoon break.', 'endorsed', NOW());

-- 7. Transactions
INSERT INTO transactions (id, exchange_request_id, status, handled_by, created_at) VALUES
(1, 1, 'scheduled', 2, NOW());

-- 8. Handover Slots
INSERT INTO handover_slots (id, transaction_id, location_id, slot_date, slot_time, confirmed_by_a, confirmed_by_b, no_show_recorded, created_at) VALUES
(1, 1, 1, '2026-09-15', '14:00:00', 0, 0, 0, NOW());

-- 9. Activity Log
INSERT INTO activity_log (id, actor_id, record_type, record_id, action, note, created_at) VALUES
(1, 1, 'users', 3, 'APPROVE_USER', 'Verified student record against ULSVO list', NOW()),
(2, 2, 'listings', 1, 'VERIFY_LISTING', 'Approved authentic physical textbook copy', NOW()),
(3, 2, 'exchange_requests', 1, 'ENDORSE_REQUEST', 'Both books verified and available', NOW());
