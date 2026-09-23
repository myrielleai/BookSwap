-- =============================================================================
-- BookSwap: Sample Seed Data (aligned to the Phase 1 ERD)
-- Load after schema.sql.
--
-- Every date is relative to NOW(), so the dashboard, the monthly chart, and the
-- 30-day reports always have data, whenever the seed is loaded. The history
-- covers about three months: completed, cancelled (no-show), scheduled, and
-- accepted exchanges, plus pending, declined, withdrawn, and rejected requests.
--
-- Every account's password is: Password123!
-- (Seed accounts share a few bcrypt hashes; real registrations get their own.)
-- =============================================================================

USE bookswap;

-- Relative dates below use the same zone as the application (APP_TIMEZONE).
SET time_zone = '+08:00';

-- ── Taxonomies ────────────────────────────────────────────────────────────────
INSERT INTO genres (id, name) VALUES
(1, 'Fantasy'),
(2, 'Science Fiction'),
(3, 'Mystery & Thriller'),
(4, 'Romance'),
(5, 'Non-fiction'),
(6, 'Classics');

INSERT INTO formats (id, name) VALUES
(1, 'Paperback'),
(2, 'Hardcover'),
(3, 'Mass Market Paperback');

INSERT INTO age_categories (id, name) VALUES
(1, 'Children''s'),
(2, 'Young Adult'),
(3, 'Adult');

INSERT INTO conditions (id, label, description) VALUES
(1, 'Like New',     'Cover and pages intact with no markings, folds, or tears. Spine undamaged.'),
(2, 'Good',         'Light signs of reading. Minor shelf wear on the cover; pages clean and tightly bound.'),
(3, 'Fair',         'Noticeable wear, creases, or some highlighting. All pages present and legible.'),
(4, 'Heavily Used', 'Well-read with worn covers, a loose spine, or heavy notes. No missing pages.');

INSERT INTO meetup_locations (id, name, address, city) VALUES
(1, 'Ermita Public Library Lobby', 'Ground floor lobby, beside the information desk', 'Manila'),
(2, 'Poblacion Community Center',  'Main hall entrance, near the security desk',     'Makati'),
(3, 'Diliman Reading Hub',         'Second floor study area, front counter',         'Quezon City');

-- ── Users ─────────────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, phone, password_hash, role, status, city, favorite_genres, created_at) VALUES
(1, 'System Administrator', 'admin@bookswap.test',      '09170000001', '$2y$10$UWajBDtUWMcj9Q5ys.ikuOFkzViMRoIzeRR.LyKPRfmexyOtcDLd6', 'admin',    'active',  'Manila',      NULL,  NOW() - INTERVAL 150 DAY),
(2, 'Gabriel Cruz',         'moderator@bookswap.test',  '09170000002', '$2y$10$MfsWoSY777XwGY9cN0mEauMLRZYFc3fuhINmlY4BDNqhrrc4fxC1W', 'staff',    'active',  'Makati',      NULL,  NOW() - INTERVAL 140 DAY),
(3, 'Lea Ramos',            'moderator2@bookswap.test', '09170000003', '$2y$10$YOvRPXQnk0OnfI2KJFKVtumHBeV7RVInFp.VdlREi3JTwauKphDae', 'staff',    'active',  'Quezon City', NULL,  NOW() - INTERVAL 135 DAY),
(4, 'Ana Santos',           'ana@bookswap.test',        '09181110004', '$2y$10$UiFY59K0xCPrbH2dS4SKhuOJwXgciWFSd8Iwr5NiRqqarq6DVh2Ka', 'customer', 'active',  'Manila',      '1,3', NOW() - INTERVAL 120 DAY),
(5, 'Marco Reyes',          'marco@bookswap.test',      '09181110005', '$2y$10$BewSgFl2f/LSiTTh6xbk2u5J5R.A20neP4NKlp1RWOWy6xFSStGx.', 'customer', 'active',  'Makati',      '1,2', NOW() - INTERVAL 118 DAY),
(6, 'Bea Lim',              'bea@bookswap.test',        '09181110006', '$2y$10$UWajBDtUWMcj9Q5ys.ikuOFkzViMRoIzeRR.LyKPRfmexyOtcDLd6', 'customer', 'active',  'Quezon City', '4,6', NOW() - INTERVAL 110 DAY),
(7, 'Jon Dela Cruz',        'jon@bookswap.test',        '09181110007', '$2y$10$MfsWoSY777XwGY9cN0mEauMLRZYFc3fuhINmlY4BDNqhrrc4fxC1W', 'customer', 'active',  'Pasig',       '3,5', NOW() - INTERVAL 100 DAY),
(8, 'Pending Reader',       'pending@bookswap.test',    '09181110008', '$2y$10$YOvRPXQnk0OnfI2KJFKVtumHBeV7RVInFp.VdlREi3JTwauKphDae', 'customer', 'pending', 'Cebu City',   NULL,  NOW() - INTERVAL 1 DAY);

-- ── Listings ──────────────────────────────────────────────────────────────────
-- archived  1–6, 9–12  (exchanged)        locked     13–16 (in an active exchange)
-- available 7, 8, 17, 18, 19, 24, 25, 26, 27 unverified 20    rejected 21
INSERT INTO listings (id, user_id, genre_id, format_id, age_category_id, condition_id, verified_by, title, author, edition, publisher, preferred_return, is_open_offer, status, staff_note, created_at, updated_at) VALUES
(1,  4, 1, 1, 2, 2, 2,    'The Hobbit', 'J.R.R. Tolkien', '75th Anniversary Edition', 'HarperCollins', 'Any science fiction novel', 0, 'archived', NULL, NOW() - INTERVAL 95 DAY, NOW() - INTERVAL 80 DAY),
(2,  5, 2, 1, 3, 3, 2,    'Dune', 'Frank Herbert', NULL, 'Ace Books', 'Fantasy classics', 0, 'archived', NULL, NOW() - INTERVAL 94 DAY, NOW() - INTERVAL 80 DAY),
(3,  6, 6, 2, 3, 1, 3,    'Pride and Prejudice', 'Jane Austen', 'Clothbound Classics', 'Penguin', NULL, 1, 'archived', NULL, NOW() - INTERVAL 70 DAY, NOW() - INTERVAL 60 DAY),
(4,  7, 3, 1, 3, 2, 2,    'Gone Girl', 'Gillian Flynn', NULL, 'Crown', 'Literary fiction or classics', 0, 'archived', NULL, NOW() - INTERVAL 68 DAY, NOW() - INTERVAL 60 DAY),
(5,  4, 1, 1, 3, 2, 3,    'Mistborn: The Final Empire', 'Brandon Sanderson', NULL, 'Tor Books', 'Space opera or hard science fiction', 0, 'archived', NULL, NOW() - INTERVAL 55 DAY, NOW() - INTERVAL 45 DAY),
(6,  6, 2, 1, 3, 2, 2,    'The Martian', 'Andy Weir', NULL, 'Crown', 'Epic fantasy', 0, 'archived', NULL, NOW() - INTERVAL 52 DAY, NOW() - INTERVAL 45 DAY),
(7,  5, 5, 1, 3, 3, 2,    'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', NULL, 'Harper', NULL, 1, 'available', NULL, NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 30 DAY),
(8,  7, 1, 2, 3, 2, 3,    'The Name of the Wind', 'Patrick Rothfuss', '10th Anniversary Edition', 'DAW Books', 'Popular non-fiction', 0, 'available', NULL, NOW() - INTERVAL 58 DAY, NOW() - INTERVAL 30 DAY),
(9,  4, 3, 1, 3, 1, 2,    'The Silent Patient', 'Alex Michaelides', NULL, 'Celadon Books', 'Recent science fiction', 0, 'archived', NULL, NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 20 DAY),
(10, 7, 2, 2, 3, 1, 3,    'Project Hail Mary', 'Andy Weir', NULL, 'Ballantine Books', 'Psychological thrillers', 0, 'archived', NULL, NOW() - INTERVAL 28 DAY, NOW() - INTERVAL 20 DAY),
(11, 6, 6, 1, 1, 2, 2,    'Anne of Green Gables', 'L.M. Montgomery', NULL, 'Puffin Classics', 'Children''s fantasy', 0, 'archived', NULL, NOW() - INTERVAL 18 DAY, NOW() - INTERVAL 8 DAY),
(12, 5, 1, 1, 1, 3, 3,    'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', NULL, 'Bloomsbury', 'Classic children''s books', 0, 'archived', NULL, NOW() - INTERVAL 16 DAY, NOW() - INTERVAL 8 DAY),
(13, 4, 5, 1, 3, 2, 2,    'Atomic Habits', 'James Clear', NULL, 'Avery', 'Young adult dystopian novels', 0, 'locked', NULL, NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 9 DAY),
(14, 6, 2, 1, 2, 2, 3,    'The Hunger Games', 'Suzanne Collins', NULL, 'Scholastic', 'Self-help or productivity', 0, 'locked', NULL, NOW() - INTERVAL 11 DAY, NOW() - INTERVAL 9 DAY),
(15, 7, 6, 1, 3, 3, 2,    'Rebecca', 'Daphne du Maurier', NULL, 'Virago', 'Thrillers', 0, 'locked', NULL, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 6 DAY),
(16, 5, 3, 3, 3, 4, 2,    'The Da Vinci Code', 'Dan Brown', NULL, 'Anchor', 'Gothic classics', 0, 'locked', NULL, NOW() - INTERVAL 8 DAY, NOW() - INTERVAL 6 DAY),
(17, 4, 1, 2, 3, 1, 3,    'Circe', 'Madeline Miller', NULL, 'Little, Brown', 'Open to any offer', 1, 'available', NULL, NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 11 DAY),
(18, 6, 6, 1, 2, 2, 2,    'Little Women', 'Louisa May Alcott', NULL, 'Puffin Classics', 'Mythology retellings', 0, 'available', NULL, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 4 DAY),
(19, 7, 5, 1, 3, 2, 3,    'Educated', 'Tara Westover', NULL, 'Random House', 'Fantasy', 0, 'available', NULL, NOW() - INTERVAL 14 DAY, NOW() - INTERVAL 13 DAY),
(20, 5, 1, 1, 3, 2, NULL, 'The Midnight Library', 'Matt Haig', NULL, 'Viking', NULL, 1, 'unverified', NULL, NOW() - INTERVAL 2 DAY, NULL),
(21, 7, 3, 1, 3, 4, 2,    'Bestseller Bundle (Photocopied)', 'Various', NULL, NULL, 'Anything', 1, 'rejected', 'Unauthorized reproductions are not allowed on BookSwap.', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 19 DAY),
(22, 7, 6, 1, 3, 2, 3,    'The Great Gatsby', 'F. Scott Fitzgerald', NULL, 'Scribner', 'Modern classics', 0, 'returned', 'The photo is blurry. Please upload a clear photo of the actual copy.', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY),
(23, 4, 4, 1, 3, 3, 2,    'Norwegian Wood', 'Haruki Murakami', NULL, 'Vintage', 'Romance novels', 0, 'withdrawn', NULL, NOW() - INTERVAL 40 DAY, NOW() - INTERVAL 33 DAY),
(24, 5, 4, 1, 3, 2, 3,    'The Notebook', 'Nicholas Sparks', NULL, 'Grand Central', 'Contemporary romance', 0, 'available', NULL, NOW() - INTERVAL 45 DAY, NOW() - INTERVAL 44 DAY),
(25, 4, 6, 1, 3, 1, 2,    'To Kill a Mockingbird', 'Harper Lee', '50th Anniversary Edition', 'Harper Perennial', 'Classic literature or historical fiction', 0, 'available', NULL, NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 3 DAY),
(26, 6, 2, 2, 3, 2, 3,    'Klara and the Sun', 'Kazuo Ishiguro', 'First Edition', 'Faber & Faber', 'Literary fiction or sci-fi', 1, 'available', NULL, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY),
(27, 7, 4, 1, 3, 1, 2,    'The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'Trade Paperback Edition', 'Atria Books', 'Contemporary romance or mystery', 0, 'available', NULL, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY);

INSERT INTO listing_photos (listing_id, file_path, created_at)
SELECT id, CONCAT('uploads/books/seed_listing_', id, '.jpg'), created_at FROM listings;

-- ── Handover slot pool ────────────────────────────────────────────────────────
-- Slots 1–7 are booked (1–6 in the past); 8–12 are open for scheduling.
INSERT INTO handover_slots (id, location_id, slot_date, start_time, end_time, is_available, created_at) VALUES
(1,  1, CURDATE() - INTERVAL 81 DAY, '14:00:00', '15:00:00', 0, NOW() - INTERVAL 100 DAY),
(2,  2, CURDATE() - INTERVAL 61 DAY, '10:00:00', '11:00:00', 0, NOW() - INTERVAL 100 DAY),
(3,  1, CURDATE() - INTERVAL 46 DAY, '16:00:00', '17:00:00', 0, NOW() - INTERVAL 60 DAY),
(4,  3, CURDATE() - INTERVAL 31 DAY, '13:00:00', '14:00:00', 0, NOW() - INTERVAL 60 DAY),
(5,  2, CURDATE() - INTERVAL 21 DAY, '11:00:00', '12:00:00', 0, NOW() - INTERVAL 30 DAY),
(6,  1, CURDATE() - INTERVAL 9 DAY,  '15:00:00', '16:00:00', 0, NOW() - INTERVAL 30 DAY),
(7,  3, CURDATE() + INTERVAL 2 DAY,  '14:00:00', '15:00:00', 0, NOW() - INTERVAL 10 DAY),
(8,  1, CURDATE() + INTERVAL 3 DAY,  '10:00:00', '11:00:00', 1, NOW() - INTERVAL 10 DAY),
(9,  2, CURDATE() + INTERVAL 4 DAY,  '13:00:00', '14:00:00', 1, NOW() - INTERVAL 10 DAY),
(10, 3, CURDATE() + INTERVAL 5 DAY,  '16:00:00', '17:00:00', 1, NOW() - INTERVAL 10 DAY),
(11, 1, CURDATE() + INTERVAL 6 DAY,  '09:00:00', '10:00:00', 1, NOW() - INTERVAL 10 DAY),
(12, 2, CURDATE() + INTERVAL 7 DAY,  '15:00:00', '16:00:00', 1, NOW() - INTERVAL 10 DAY);

-- ── Exchange requests ─────────────────────────────────────────────────────────
-- Request 9 is 10 days old and still pending: the staff queue auto-cancels it.
-- Request 13 was auto-declined when request 3 was accepted (both involve book 6).
INSERT INTO exchange_requests (id, requester_id, target_listing_id, offered_listing_id, message, status, decline_reason, created_at, responded_at, updated_at) VALUES
(1,  5, 1,  2,  'Would love to trade Dune for your copy of The Hobbit.', 'accepted', NULL, NOW() - INTERVAL 90 DAY, NOW() - INTERVAL 89 DAY, NOW() - INTERVAL 89 DAY),
(2,  7, 3,  4,  'Gone Girl for your Austen? Happy to meet in Makati.', 'accepted', NULL, NOW() - INTERVAL 66 DAY, NOW() - INTERVAL 65 DAY, NOW() - INTERVAL 65 DAY),
(3,  6, 5,  6,  'Happy to trade The Martian for Mistborn.', 'accepted', NULL, NOW() - INTERVAL 50 DAY, NOW() - INTERVAL 49 DAY, NOW() - INTERVAL 49 DAY),
(4,  7, 7,  8,  'The Name of the Wind for Sapiens?', 'accepted', NULL, NOW() - INTERVAL 38 DAY, NOW() - INTERVAL 37 DAY, NOW() - INTERVAL 37 DAY),
(5,  4, 10, 9,  'The Silent Patient for Project Hail Mary?', 'accepted', NULL, NOW() - INTERVAL 25 DAY, NOW() - INTERVAL 24 DAY, NOW() - INTERVAL 24 DAY),
(6,  5, 11, 12, 'Trading Harry Potter for Anne of Green Gables.', 'accepted', NULL, NOW() - INTERVAL 14 DAY, NOW() - INTERVAL 13 DAY, NOW() - INTERVAL 13 DAY),
(7,  6, 13, 14, 'The Hunger Games for Atomic Habits?', 'accepted', NULL, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 9 DAY),
(8,  5, 15, 16, 'The Da Vinci Code for Rebecca?', 'accepted', NULL, NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 6 DAY),
(9,  7, 17, 19, 'Educated for Circe? I can meet on weekends.', 'pending', NULL, NOW() - INTERVAL 10 DAY, NULL, NULL),
(10, 6, 17, 18, 'Little Women for Circe?', 'pending', NULL, NOW() - INTERVAL 1 DAY, NULL, NULL),
(11, 4, 24, 23, 'Norwegian Wood for The Notebook?', 'declined', 'Would prefer a different book in return.', NOW() - INTERVAL 36 DAY, NOW() - INTERVAL 35 DAY, NOW() - INTERVAL 35 DAY),
(12, 7, 24, 8,  'The Name of the Wind for The Notebook?', 'withdrawn', NULL, NOW() - INTERVAL 22 DAY, NULL, NOW() - INTERVAL 21 DAY),
(13, 5, 6,  7,  'Sapiens for The Martian?', 'declined', 'Automatically declined: one of these books was accepted in another exchange.', NOW() - INTERVAL 51 DAY, NOW() - INTERVAL 49 DAY, NOW() - INTERVAL 49 DAY),
(14, 7, 18, 19, 'SWAP NOW reply fast!!!', 'rejected', NULL, NOW() - INTERVAL 4 DAY, NULL, NOW() - INTERVAL 3 DAY);

-- ── Transactions ──────────────────────────────────────────────────────────────
INSERT INTO transactions (id, exchange_request_id, handled_by, slot_id, status, reschedule_count, cancel_reason, requester_confirmed, owner_confirmed, completed_at, created_at, updated_at) VALUES
(1, 1, 2,    1,    'completed', 0, NULL,      1, 1, NOW() - INTERVAL 80 DAY, NOW() - INTERVAL 89 DAY, NOW() - INTERVAL 80 DAY),
(2, 2, 3,    2,    'completed', 1, NULL,      1, 1, NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 65 DAY, NOW() - INTERVAL 60 DAY),
(3, 3, 2,    3,    'completed', 0, NULL,      1, 1, NOW() - INTERVAL 45 DAY, NOW() - INTERVAL 49 DAY, NOW() - INTERVAL 45 DAY),
(4, 4, 3,    4,    'cancelled', 0, 'no_show', 0, 0, NULL,                    NOW() - INTERVAL 37 DAY, NOW() - INTERVAL 30 DAY),
(5, 5, 2,    5,    'completed', 0, NULL,      1, 1, NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 24 DAY, NOW() - INTERVAL 20 DAY),
(6, 6, 3,    6,    'completed', 0, NULL,      1, 1, NOW() - INTERVAL 8 DAY,  NOW() - INTERVAL 13 DAY, NOW() - INTERVAL 8 DAY),
(7, 7, 2,    7,    'scheduled', 0, NULL,      0, 0, NULL,                    NOW() - INTERVAL 9 DAY,  NOW() - INTERVAL 5 DAY),
(8, 8, NULL, NULL, 'accepted',  0, NULL,      0, 0, NULL,                    NOW() - INTERVAL 6 DAY,  NOW() - INTERVAL 6 DAY);

-- ── Reports ───────────────────────────────────────────────────────────────────
INSERT INTO reports (id, reporter_id, transaction_id, listing_id, request_id, handled_by, report_type, description, resolution, status, created_at, updated_at) VALUES
(1, 3, 4,    NULL, NULL, 3,    'no_show', 'No-show at the handover: the requester did not arrive.', 'No-show recorded; the exchange was cancelled and both books returned to the catalog.', 'resolved', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 30 DAY),
(2, 6, 3,    NULL, NULL, NULL, 'misdescribed_condition', 'The copy of Mistborn I received has water damage on the last chapters that the listing did not mention.', NULL, 'open', NOW() - INTERVAL 44 DAY, NULL),
(3, 6, NULL, NULL, 14,   3,    'spam_request', 'Received a pushy request with no real description of the offered book.', 'Request rejected as spam; the requester was warned.', 'resolved', NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 3 DAY),
(4, 5, NULL, 21,   NULL, 2,    'inappropriate_listing', 'This listing appears to be photocopied books passed off as originals.', 'Listing rejected. The owner has posted unauthorized copies before, so this is escalated to the Administrator.', 'escalated', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 19 DAY);

-- ── Watchlist ─────────────────────────────────────────────────────────────────
INSERT INTO watchlist (user_id, listing_id, created_at) VALUES
(5, 17, NOW() - INTERVAL 5 DAY),
(6, 24, NOW() - INTERVAL 15 DAY),
(7, 13, NOW() - INTERVAL 11 DAY),
(4, 7,  NOW() - INTERVAL 20 DAY);

-- ── Notifications ─────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, type, message, is_read, related_record_type, related_record_id, created_at) VALUES
(4, 'new_exchange_request', 'Someone wants to exchange for your listing "Circe".', 1, 'request', 9, NOW() - INTERVAL 10 DAY),
(4, 'new_exchange_request', 'Someone wants to exchange for your listing "Circe".', 0, 'request', 10, NOW() - INTERVAL 1 DAY),
(5, 'request_accepted', 'Your exchange request for "Rebecca" was accepted. A moderator will schedule your handover.', 0, 'request', 8, NOW() - INTERVAL 6 DAY),
(6, 'handover_scheduled', 'Your handover for "Atomic Habits" is scheduled at Diliman Reading Hub.', 0, 'transaction', 7, NOW() - INTERVAL 5 DAY),
(4, 'handover_scheduled', 'Your handover for "Atomic Habits" is scheduled at Diliman Reading Hub.', 0, 'transaction', 7, NOW() - INTERVAL 5 DAY),
(1, 'report_escalated', 'Report #4 (inappropriate_listing) was escalated for Administrator review.', 0, 'report', 4, NOW() - INTERVAL 19 DAY);

-- ── Activity log ──────────────────────────────────────────────────────────────
INSERT INTO activity_log (actor_id, record_type, record_id, action, note, created_at) VALUES
(1, 'user',        2,  'status_changed', 'Status set to active', NOW() - INTERVAL 139 DAY),
(1, 'user',        3,  'status_changed', 'Status set to active', NOW() - INTERVAL 134 DAY),
(1, 'user',        4,  'status_changed', 'Status set to active', NOW() - INTERVAL 119 DAY),
(1, 'user',        5,  'status_changed', 'Status set to active', NOW() - INTERVAL 117 DAY),
(1, 'user',        6,  'status_changed', 'Status set to active', NOW() - INTERVAL 109 DAY),
(1, 'user',        7,  'status_changed', 'Status set to active', NOW() - INTERVAL 99 DAY),
(2, 'listing',     1,  'approve', '', NOW() - INTERVAL 94 DAY),
(2, 'listing',     2,  'approve', '', NOW() - INTERVAL 93 DAY),
(4, 'request',     1,  'accepted', 'Transaction #1 opened', NOW() - INTERVAL 89 DAY),
(2, 'transaction', 1,  'scheduled', 'Slot #1', NOW() - INTERVAL 85 DAY),
(2, 'transaction', 1,  'completed', 'Both members confirmed receipt.', NOW() - INTERVAL 80 DAY),
(3, 'listing',     3,  'approve', '', NOW() - INTERVAL 69 DAY),
(3, 'transaction', 2,  'completed', 'Both members confirmed receipt.', NOW() - INTERVAL 60 DAY),
(2, 'transaction', 3,  'completed', 'Both members confirmed receipt.', NOW() - INTERVAL 45 DAY),
(3, 'transaction', 4,  'no_show', 'Report #1', NOW() - INTERVAL 30 DAY),
(2, 'transaction', 5,  'completed', 'Both members confirmed receipt.', NOW() - INTERVAL 20 DAY),
(2, 'listing',     21, 'reject', 'Unauthorized reproductions are not allowed on BookSwap.', NOW() - INTERVAL 19 DAY),
(2, 'report',      4,  'escalated', 'Listing rejected. The owner has posted unauthorized copies before, so this is escalated to the Administrator.', NOW() - INTERVAL 19 DAY),
(3, 'transaction', 6,  'completed', 'Both members confirmed receipt.', NOW() - INTERVAL 8 DAY),
(2, 'transaction', 7,  'scheduled', 'Slot #7', NOW() - INTERVAL 5 DAY),
(3, 'report',      3,  'resolved', 'Request rejected as spam; the requester was warned.', NOW() - INTERVAL 3 DAY),
(3, 'listing',     22, 'return', 'The photo is blurry. Please upload a clear photo of the actual copy.', NOW() - INTERVAL 2 DAY);
