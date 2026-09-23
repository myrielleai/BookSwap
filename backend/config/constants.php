<?php

/**
 * constants.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Application-wide constants for BookSwap.
 *
 * All roles, statuses, and limits live here so every file in the project
 * uses the same vocabulary. Do NOT hard-code these strings elsewhere.
 *
 * Machine-specific settings (JWT secret, debug flag, CORS origins, database
 * credentials) are loaded first from config/local.php, which is not committed.
 * Copy config/local.example.php to config/local.php to create it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Local Settings ────────────────────────────────────────────────────────────
if (is_file(__DIR__ . '/local.php')) {
    require_once __DIR__ . '/local.php';
}

// Anything local.php did not define falls back to a safe default. With the
// placeholder secret, login is refused and no token is ever accepted, because
// anyone reading this repository could forge tokens signed with it.
define('JWT_SECRET_PLACEHOLDER', 'REPLACE_WITH_A_STRONG_SECRET_KEY');
defined('APP_DEBUG')    || define('APP_DEBUG', false);
defined('JWT_SECRET')   || define('JWT_SECRET', JWT_SECRET_PLACEHOLDER);
defined('CORS_ORIGINS') || define('CORS_ORIGINS', []);
defined('APP_TIMEZONE') || define('APP_TIMEZONE', 'Asia/Manila');

// ── Time Zone ─────────────────────────────────────────────────────────────────
// PHP and the database must agree on "today". PHP picks dates for report ranges,
// slot validation, and chart months, while SQL uses NOW() and CURDATE(); on a
// server whose php.ini says Europe/Berlin and whose database runs in UTC, those
// disagree by hours and a slot or report can fall on the wrong day.
// getDBConnection() sets the same zone on every database session.
date_default_timezone_set(APP_TIMEZONE);

// ── User Roles ────────────────────────────────────────────────────────────────
// Must match the `role` column values in the `users` table.
define('ROLE_ADMIN',    'admin');    // Platform Administrator
define('ROLE_STAFF',    'staff');    // Exchange Moderator / Volunteer
define('ROLE_CUSTOMER', 'customer'); // Reader / Book Enthusiast

// ── Account Statuses ─────────────────────────────────────────────────────────
// Must match the `status` column values in the `users` table.
define('ACCOUNT_PENDING',    'pending');    // Awaiting admin approval
define('ACCOUNT_ACTIVE',     'active');     // Approved and usable
define('ACCOUNT_INACTIVE',   'inactive');   // Deactivated by admin or by the member
define('ACCOUNT_SUSPENDED',  'suspended');  // Locked due to violation

// ── Listing Statuses ──────────────────────────────────────────────────────────
// Must match the `status` column values in the `listings` table.
define('LISTING_UNVERIFIED', 'unverified'); // Just submitted, awaiting staff review
define('LISTING_AVAILABLE',  'available');  // Approved and visible in catalog
define('LISTING_LOCKED',     'locked');     // Part of an accepted exchange (Phase 1 §3.2.3)
define('LISTING_RETURNED',   'returned');   // Revision requested by staff
define('LISTING_REJECTED',   'rejected');   // Rejected by staff
define('LISTING_ARCHIVED',   'archived');   // Exchanged, or archived at end of a reporting period
define('LISTING_WITHDRAWN',  'withdrawn');  // Pulled by the owner

// ── Exchange Request Statuses ─────────────────────────────────────────────────
// Phase 1 §3.2.2: requests are decided by the listing owner. Staff only step in
// on reported or expired requests. Must match `exchange_requests.status`.
define('REQUEST_PENDING',   'pending');   // Sent, waiting for the listing owner
define('REQUEST_ACCEPTED',  'accepted');  // Owner accepted; a transaction now exists
define('REQUEST_DECLINED',  'declined');  // Owner declined, or auto-declined by a competing acceptance
define('REQUEST_REJECTED',  'rejected');  // Staff rejected it after a spam or abuse report
define('REQUEST_WITHDRAWN', 'withdrawn'); // Requester pulled it back before the owner responded
define('REQUEST_CANCELLED', 'cancelled'); // Expired with no response inside REQUEST_RESPONSE_DAYS

// Reasons an owner can pick when declining (Phase 1 §3.3.5: "selectable reason").
define('DECLINE_REASONS', [
    'not_interested'           => 'Not interested in the offered book.',
    'prefer_different_book'    => 'Would prefer a different book in return.',
    'condition_concern'        => 'Concerned about the condition of the offered book.',
    'book_no_longer_available' => 'The requested book is no longer available.',
    'other'                    => 'Other',
]);

// ── Transaction Statuses ──────────────────────────────────────────────────────
// Phase 1 §3.2.3: Accepted → Scheduled → Completed | Cancelled.
// Only Staff moves a transaction forward (§4.2). Must match `transactions.status`.
define('TX_ACCEPTED',  'accepted');  // Created when the owner accepts; both books locked
define('TX_SCHEDULED', 'scheduled'); // A handover slot is booked
define('TX_COMPLETED', 'completed'); // Staff recorded completion after both confirmed receipt
define('TX_CANCELLED', 'cancelled'); // Cancelled at any point; reason required

// ── Reports (disputes, no-shows, inappropriate listings, spam) ────────────────
// Must match `reports.report_type` and `reports.status`.
define('REPORT_MISDESCRIBED',  'misdescribed_condition');
define('REPORT_NO_SHOW',       'no_show');
define('REPORT_INAPPROPRIATE', 'inappropriate_listing');
define('REPORT_SPAM_REQUEST',  'spam_request');

define('REPORT_OPEN',      'open');
define('REPORT_RESOLVED',  'resolved');
define('REPORT_ESCALATED', 'escalated'); // Passed to the Administrator (repeat offenders)

// ── Business Rules ────────────────────────────────────────────────────────────
define('MAX_RESCHEDULES',        1);    // Maximum allowed reschedule per transaction
define('REQUEST_RESPONSE_DAYS',  7);    // Days before an unanswered request auto-cancels
define('IDLE_LISTING_DAYS',      30);   // Days before a listing is flagged as idle by staff
define('MAX_ACTIVE_REQUESTS',    1);    // A reader may hold at most 1 active request per listing
define('MAX_LISTING_PHOTOS',     5);    // Photos per listing; at least one is required

// ── Lists and Reports ─────────────────────────────────────────────────────────
define('PAGE_SIZE_DEFAULT',    10);  // Rows per page when ?per_page= is absent
define('PAGE_SIZE_MAX',        50);  // Upper bound for ?per_page=
define('REPORT_DEFAULT_DAYS',  30);  // Report date range when ?from=/?to= are absent

// ── Sign-in Throttling ────────────────────────────────────────────────────────
// Failed sign-ins inside the window lock further attempts (HTTP 429), even with
// the right password, until the window passes. Per-IP limits catch one client
// trying many accounts.
define('LOGIN_MAX_FAILURES',    5);   // Failures per email address
define('LOGIN_IP_MAX_FAILURES', 20);  // Failures per IP address, across all emails
define('LOGIN_LOCK_MINUTES',    15);  // Sliding window

// ── JWT Settings ──────────────────────────────────────────────────────────────
define('JWT_EXPIRY_SECS', 3600); // Token and session valid for 1 hour (3 600 seconds)

// ── File Upload Settings ──────────────────────────────────────────────────────
define('UPLOAD_DIR',      __DIR__ . '/../../uploads/books/'); // Storage path
define('UPLOAD_MAX_MB',   5);                                 // Max file size in MB
define('UPLOAD_ALLOWED',  ['image/jpeg', 'image/png', 'image/webp']); // MIME types

// ── Email Settings (Brevo / Sendinblue) ──────────────────────────────────────
// Sign up free at: https://app.brevo.com  (no credit card required)
// Steps to get your key:
//   1. Log in → click your profile picture (top right) → "SMTP & API"
//   2. Click "API Keys" tab → "Generate a new API key" → copy it here
//   3. Go to "Senders & IP" → "Senders" → add and verify your sender email
define('BREVO_API_KEY',    'REPLACE_WITH_YOUR_BREVO_API_KEY');
define('BREVO_FROM_EMAIL', 'als.jn05@gmail.com'); // ← must match a verified sender in Brevo
define('BREVO_FROM_NAME',  'BookSwap');

// ── App URL (used in email links) ─────────────────────────────────────────────
// TODO: Replace with your actual InfinityFree or Vercel deployment URL.
define('BOOKSWAP_APP_URL', 'https://your-bookswap-app.rf.gd');

// ── Local Storage (cached files: Google signing keys, etc.) ───────────────────
define('STORAGE_DIR', __DIR__ . '/../../storage/');

// ── Google Sign-in (OAuth 2.0) ─────────────────────────────────────────────────
// Create a Web application OAuth client at https://console.cloud.google.com/apis/credentials
// and paste its Client ID below. Leave blank to keep Google sign-in disabled.
defined('GOOGLE_CLIENT_ID') || define('GOOGLE_CLIENT_ID', '');
define('GOOGLE_CERTS_URL', 'https://www.googleapis.com/oauth2/v3/certs');

// ── Book Lookup (Open Library) ─────────────────────────────────────────────────
define('OPEN_LIBRARY_BASE_URL',    'https://openlibrary.org');
define('BOOK_CACHE_FOUND_DAYS',    30); // How long a found book's details are cached
define('BOOK_CACHE_MISSING_DAYS',  1);  // How long an ISBN that returned nothing is cached

