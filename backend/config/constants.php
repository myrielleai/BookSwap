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

// ── Environment Variables ─────────────────────────────────────────────────────
// A hosted server (Render) has no local.php, so the same settings are read from
// environment variables instead. Anything local.php already defined wins.
foreach ([
    'JWT_SECRET', 'APP_TIMEZONE', 'BOOKSWAP_APP_URL',
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_SSL_CA',
    'BREVO_API_KEY', 'BREVO_FROM_EMAIL', 'GOOGLE_CLIENT_ID',
    'TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY',
] as $name) {
    $value = getenv($name);
    if ($value !== false && $value !== '' && !defined($name)) {
        define($name, $value);
    }
}
if (!defined('APP_DEBUG') && getenv('APP_DEBUG') !== false) {
    define('APP_DEBUG', filter_var(getenv('APP_DEBUG'), FILTER_VALIDATE_BOOLEAN));
}
// Comma-separated, e.g. "https://bookswap.vercel.app,http://localhost:3000".
if (!defined('CORS_ORIGINS') && getenv('CORS_ORIGINS')) {
    define('CORS_ORIGINS', array_values(array_filter(array_map('trim', explode(',', getenv('CORS_ORIGINS'))))));
}
unset($name, $value);

// Anything local.php did not define falls back to a safe default. With the
// placeholder secret, login is refused and no token is ever accepted, because
// anyone reading this repository could forge tokens signed with it.
//
// PHP's built-in dev server (`npm run backend`) only ever runs on a developer's
// machine, so it alone gets debug output and a development secret, letting a
// fresh clone log in without local.php. Apache (XAMPP, Render) never does.
define('JWT_SECRET_PLACEHOLDER', 'REPLACE_WITH_A_STRONG_SECRET_KEY');
$isDevServer = PHP_SAPI === 'cli-server';
defined('APP_DEBUG')    || define('APP_DEBUG', $isDevServer);
defined('JWT_SECRET')   || define('JWT_SECRET', $isDevServer
    ? 'bookswap_super_secret_jwt_key_for_development_2026_at_least_32_chars'
    : JWT_SECRET_PLACEHOLDER);
unset($isDevServer);
defined('CORS_ORIGINS') || define('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://bookswap-eta.vercel.app',
]);
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
defined('BREVO_API_KEY')    || define('BREVO_API_KEY',    'REPLACE_WITH_YOUR_BREVO_API_KEY');
defined('BREVO_FROM_EMAIL') || define('BREVO_FROM_EMAIL', 'als.jn05@gmail.com'); // ← must match a verified sender in Brevo
defined('BREVO_FROM_NAME')  || define('BREVO_FROM_NAME',  'BookSwap');

// ── App URL (used in email links) ─────────────────────────────────────────────
// The Vercel site; set BOOKSWAP_APP_URL on the server to override.
defined('BOOKSWAP_APP_URL') || define('BOOKSWAP_APP_URL', 'http://localhost:3000');

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

// ── Security API (HaveIBeenPwned Passwords API) ───────────────────────────────
define('HIBP_PWNED_API_URL',        'https://api.pwnedpasswords.com/range/');

// ── Bot Protection API (Cloudflare Turnstile) ──────────────────────────────────
// Defaults to Cloudflare's official testing keys (always passes for local development).
// In production, set custom keys in config/local.php.
defined('TURNSTILE_SITE_KEY')   || define('TURNSTILE_SITE_KEY',   '1x00000000000000000000AA');
defined('TURNSTILE_SECRET_KEY') || define('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA');
define('TURNSTILE_VERIFY_URL',    'https://challenges.cloudflare.com/turnstile/v0/siteverify');

