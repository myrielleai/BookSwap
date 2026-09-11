<?php

/**
 * constants.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Application-wide constants for BookSwap.
 *
 * All roles, statuses, and limits live here so every file in the project
 * uses the same vocabulary. Do NOT hard-code these strings elsewhere.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── User Roles ────────────────────────────────────────────────────────────────
// Must match the `role` column values in the `users` table.
define('ROLE_ADMIN',    'admin');    // Platform Administrator
define('ROLE_STAFF',    'staff');    // Exchange Moderator / Volunteer
define('ROLE_CUSTOMER', 'customer'); // Reader / Book Enthusiast

// ── Account Statuses ─────────────────────────────────────────────────────────
// Must match the `status` column values in the `users` table.
define('ACCOUNT_PENDING',    'pending');    // Awaiting admin approval
define('ACCOUNT_ACTIVE',     'active');     // Approved and usable
define('ACCOUNT_INACTIVE',   'inactive');   // Deactivated by admin or user
define('ACCOUNT_SUSPENDED',  'suspended');  // Locked due to violation

// ── Listing Statuses ──────────────────────────────────────────────────────────
// Must match the `status` column values in the `listings` table.
define('LISTING_UNVERIFIED', 'unverified'); // Just submitted, awaiting staff review
define('LISTING_AVAILABLE',  'available');  // Approved and visible in catalog
define('LISTING_LOCKED',     'locked');     // Part of an active approved exchange
define('LISTING_RETURNED',   'returned');   // Revision requested by staff
define('LISTING_REJECTED',   'rejected');   // Rejected by staff
define('LISTING_ARCHIVED',   'archived');   // Archived at end of reporting period
define('LISTING_WITHDRAWN',  'withdrawn');  // Pulled by the owner

// ── Exchange Request Statuses ─────────────────────────────────────────────────
// Must match the `status` column values in the `exchange_requests` table.
define('REQUEST_PENDING',   'pending');   // Submitted, awaiting staff endorsement
define('REQUEST_ENDORSED',  'endorsed');  // Staff approved, waiting on owner
define('REQUEST_ACCEPTED',  'accepted');  // Owner accepted
define('REQUEST_DECLINED',  'declined');  // Owner declined
define('REQUEST_REJECTED',  'rejected');  // Staff rejected
define('REQUEST_HELD',      'held');      // Staff placed on hold for clarification
define('REQUEST_WITHDRAWN', 'withdrawn'); // Requester pulled back before endorsement
define('REQUEST_CANCELLED', 'cancelled'); // Expired (no response within window)

// ── Transaction Statuses ──────────────────────────────────────────────────────
// Follows the staff-controlled workflow: Pending → Approved → Scheduled → Completed|Cancelled
// Must match the `status` column values in the `transactions` table.
define('TX_PENDING',   'pending');   // Request accepted, awaiting staff action
define('TX_APPROVED',  'approved');  // Staff approved; both listings are now locked
define('TX_SCHEDULED', 'scheduled'); // Handover date/time/location assigned
define('TX_COMPLETED', 'completed'); // Both parties confirmed receipt
define('TX_CANCELLED', 'cancelled'); // Cancelled at any point; reason required

// ── Business Rules ────────────────────────────────────────────────────────────
define('MAX_RESCHEDULES',        1);    // Maximum allowed reschedule per transaction
define('REQUEST_RESPONSE_DAYS',  7);    // Days before an unanswered request auto-cancels
define('IDLE_LISTING_DAYS',      30);   // Days before a listing is flagged as idle by staff
define('MAX_ACTIVE_REQUESTS',    1);    // A reader may hold at most 1 active request per listing

// ── JWT Settings ──────────────────────────────────────────────────────────────
// TODO (API): Replace JWT_SECRET with a strong random string before going live.
define('JWT_SECRET',      'REPLACE_WITH_A_STRONG_SECRET_KEY');
define('JWT_EXPIRY_SECS', 3600); // Token valid for 1 hour (3 600 seconds)

// ── File Upload Settings ──────────────────────────────────────────────────────
define('UPLOAD_DIR',      __DIR__ . '/../../uploads/books/'); // Storage path
define('UPLOAD_MAX_MB',   5);                                 // Max file size in MB
define('UPLOAD_ALLOWED',  ['image/jpeg', 'image/png', 'image/webp']); // MIME types
