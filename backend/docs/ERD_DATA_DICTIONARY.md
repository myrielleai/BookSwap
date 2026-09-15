# BookSwap — ERD and Data Dictionary

Generated from the live `bookswap` schema (`backend/database/schema.sql`). The design follows Figure 2 of the Phase 1 project document.

![BookSwap ERD](../../docs/images/BookSwap_ERD.png)

**17 tables · 24 foreign keys · 4 CHECK constraints** · MySQL 8.0+ / MariaDB 10.4+, InnoDB, utf8mb4

## ERD names vs. schema names

The schema follows the ERD's structure. Where the ERD only renames an existing column, the existing name was kept:

| Phase 1 ERD | Schema |
|---|---|
| `<entity>_id` primary keys | `id` |
| USER.full_name | users.name |
| LISTING.owner_id | listings.user_id |
| CONDITION_GRADE.name | conditions.label |
| EXCHANGE_REQUEST.requested_listing_id | exchange_requests.target_listing_id |
| TRANSACTION.request_id | transactions.exchange_request_id |
| ACTIVITY_LOG.user_id / entity_type / entity_id / reason | activity_log.actor_id / record_type / record_id / note |

Beyond the ERD: `user_sessions`, `login_attempts`, `reports.request_id`, and `listings.is_open_offer` / `staff_note` (required by the Phase 1 text).

## Tables

### 1. `users`  ·  ERD: USER

Member accounts, credentials, role, and status.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `name` | varchar(100) | no |  | Full name (ERD: full_name). |
| `email` | varchar(255) | no | UNIQUE | Sign-in address, stored lower-case. |
| `phone` | varchar(20) | yes |  | Shown only to the other member of an accepted exchange. |
| `password_hash` | varchar(255) | no |  | Bcrypt hash (cost 12). The password itself is never stored. |
| `role` | enum('admin', 'staff', 'customer') | no | default customer | admin, staff, or customer. Read from here on every request. |
| `status` | enum('pending', 'active', 'inactive', 'suspended') | no | default pending | pending until approved; only active accounts can sign in. |
| `city` | varchar(100) | yes |  | Used for handover coordination and the city report. |
| `favorite_genres` | varchar(255) | yes |  | Comma-separated genre IDs; drives sort=relevance in the catalogue. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |
| `updated_at` | datetime | yes |  | When the row last changed. |

### 2. `genres`  ·  ERD: GENRE

Genre taxonomy used to classify every listing.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `name` | varchar(100) | no | UNIQUE | Display name, unique. |
| `is_active` | tinyint(1) | no | default 1 | 1 while offered; 0 once retired. Entries are never deleted, so old listings stay readable. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 3. `formats`  ·  ERD: FORMAT

Book formats such as paperback and hardcover.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `name` | varchar(100) | no | UNIQUE | Display name, unique. |
| `is_active` | tinyint(1) | no | default 1 | 1 while offered; 0 once retired. Entries are never deleted, so old listings stay readable. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 4. `age_categories`  ·  ERD: AGE_CATEGORY

Reader age categories such as Children's, Young Adult, and Adult.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `name` | varchar(100) | no | UNIQUE | Display name, unique. |
| `is_active` | tinyint(1) | no | default 1 | 1 while offered; 0 once retired. Entries are never deleted, so old listings stay readable. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 5. `conditions`  ·  ERD: CONDITION_GRADE

Condition grades with the rubric shown when listing.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `label` | varchar(50) | no | UNIQUE | Grade name, unique (ERD: name). |
| `description` | text | no |  | Rubric shown to members when listing. |
| `is_active` | tinyint(1) | no | default 1 | 1 while offered; 0 once retired. Entries are never deleted, so old listings stay readable. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 6. `meetup_locations`  ·  ERD: MEETUP_LOCATION

Approved handover venues.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `name` | varchar(150) | no |  | Venue name. |
| `address` | varchar(255) | no |  | Where exactly to meet. |
| `city` | varchar(100) | no |  | Venue city. |
| `is_active` | tinyint(1) | no | default 1 | 1 while offered; 0 once retired. Entries are never deleted, so old listings stay readable. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 7. `listings`  ·  ERD: LISTING

Books offered for exchange.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `user_id` | int(11) | no | FK → users | Owner (ERD: owner_id). |
| `genre_id` | int(11) | no | FK → genres | Required genre. |
| `format_id` | int(11) | yes | FK → formats | Optional format. |
| `age_category_id` | int(11) | yes | FK → age_categories | Optional age category; drives the age-group report. |
| `condition_id` | int(11) | no | FK → conditions | Required condition grade. |
| `verified_by` | int(11) | yes | FK → users | Moderator who approved, returned, or rejected it. |
| `title` | varchar(255) | no |  |  |
| `author` | varchar(255) | no |  |  |
| `edition` | varchar(100) | yes |  |  |
| `publisher` | varchar(150) | yes |  |  |
| `preferred_return` | varchar(255) | yes |  | What the owner would like in return. |
| `is_open_offer` | tinyint(1) | no | default 0 | 1 if the owner is open to any offer (Phase 1 §3.3.2). |
| `status` | enum('unverified', 'available', 'locked', 'returned', 'rejected', 'archived', 'withdrawn') | no | default unverified | unverified → available → locked → archived; also returned, rejected, withdrawn. |
| `staff_note` | text | yes |  | Reason given when returned or rejected (Phase 1 §3.2.1). |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |
| `updated_at` | datetime | yes |  | When the row last changed. |

### 8. `listing_photos`  ·  ERD: LISTING_PHOTO

Photographs of the actual copy, 1 to 5 per listing.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `listing_id` | int(11) | no | FK → listings | Listing the photo belongs to. |
| `file_path` | varchar(500) | no |  | Relative path under uploads/books/; served by GET /api/photos/{id}. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 9. `exchange_requests`  ·  ERD: EXCHANGE_REQUEST

One-to-one swap proposals, decided by the listing owner.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `requester_id` | int(11) | no | FK → users | Member making the offer. |
| `target_listing_id` | int(11) | no | FK → listings | Book being requested (ERD: requested_listing_id). |
| `offered_listing_id` | int(11) | no | FK → listings | Requester's book offered in return. |
| `message` | text | yes |  | Optional note to the owner. |
| `status` | enum('pending', 'accepted', 'declined', 'rejected', 'withdrawn', 'cancelled') | no | default pending | pending, accepted, declined, rejected, withdrawn, or cancelled. |
| `decline_reason` | varchar(255) | yes |  | Reason shown to the requester. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |
| `responded_at` | datetime | yes |  | When the owner accepted or declined. |
| `updated_at` | datetime | yes |  | When the row last changed. |

### 10. `handover_slots`  ·  ERD: HANDOVER_SLOT

Administrator-defined pool of dated time slots at each venue.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `location_id` | int(11) | no | FK → meetup_locations | Venue of the slot. |
| `slot_date` | date | no |  | Date of the handover. |
| `start_time` | time | no |  | Start time. |
| `end_time` | time | no |  | End time; must be after start_time. |
| `is_available` | tinyint(1) | no | default 1 | 1 while open; 0 once booked or retired. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 11. `transactions`  ·  ERD: TRANSACTION

Exchanges opened on acceptance: Accepted → Scheduled → Completed | Cancelled.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `exchange_request_id` | int(11) | no | UNIQUE, FK → exchange_requests | The accepted request (1:1; ERD: request_id). |
| `handled_by` | int(11) | yes | FK → users | Moderator handling the handover. |
| `slot_id` | int(11) | yes | FK → handover_slots | Booked handover slot. |
| `status` | enum('accepted', 'scheduled', 'completed', 'cancelled') | no | default accepted | accepted, scheduled, completed, or cancelled. Changed only by Staff. |
| `reschedule_count` | int(11) | no | default 0 | Times rescheduled; at most 1. |
| `cancel_reason` | varchar(255) | yes |  | Required when cancelled (no_show for no-shows). |
| `requester_confirmed` | tinyint(1) | no | default 0 | Requester confirmed receipt. |
| `owner_confirmed` | tinyint(1) | no | default 0 | Owner confirmed receipt. |
| `completed_at` | datetime | yes |  | When Staff recorded completion. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |
| `updated_at` | datetime | yes |  | When the row last changed. |

### 12. `reports`  ·  ERD: REPORT

Disputes, no-shows, inappropriate listings, and spam requests.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `reporter_id` | int(11) | no | FK → users | Who filed it. |
| `transaction_id` | int(11) | yes | FK → transactions | Subject, for condition and no-show reports. |
| `listing_id` | int(11) | yes | FK → listings | Subject, for inappropriate-listing reports. |
| `request_id` | int(11) | yes | FK → exchange_requests | Subject, for spam-request reports (beyond the ERD). |
| `handled_by` | int(11) | yes | FK → users | Moderator or Administrator who resolved it. |
| `report_type` | enum('misdescribed_condition', 'no_show', 'inappropriate_listing', 'spam_request') | no |  | misdescribed_condition, no_show, inappropriate_listing, or spam_request. |
| `description` | text | no |  | Reporter's account of the problem. |
| `resolution` | text | yes |  | Findings and outcome. |
| `status` | enum('open', 'resolved', 'escalated') | no | default open | open, resolved, or escalated to the Administrator. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |
| `updated_at` | datetime | yes |  | When the row last changed. |

### 13. `notifications`  ·  ERD: NOTIFICATION

In-app alerts raised at each state change.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `user_id` | int(11) | no | FK → users | Recipient. |
| `type` | varchar(60) | no |  | Event name, e.g. request_accepted. |
| `message` | text | no |  | Text shown to the member. |
| `is_read` | tinyint(1) | no | default 0 | 1 once read. |
| `related_record_type` | varchar(30) | yes |  | Linked record type, e.g. transaction. |
| `related_record_id` | int(11) | yes |  | Linked record ID. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 14. `activity_log`  ·  ERD: ACTIVITY_LOG

Append-only audit trail.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `actor_id` | int(11) | no | FK → users | Who acted (ERD: user_id). |
| `record_type` | varchar(30) | no |  | Kind of record changed (ERD: entity_type). |
| `record_id` | int(11) | no |  | ID of the record changed (ERD: entity_id). |
| `action` | varchar(60) | no |  | What was done, e.g. approve, scheduled. |
| `note` | text | yes |  | Reason or detail (ERD: reason). |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 15. `watchlist`  ·  ERD: WATCHLIST

Listings a member is tracking (users ↔ listings, many-to-many).

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `user_id` | int(11) | no | FK → users | Watching member. |
| `listing_id` | int(11) | no | FK → listings | Watched listing. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |

### 16. `user_sessions`  ·  ERD: — (beyond the ERD)

Server-side sessions behind login tokens.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `user_id` | int(11) | no | FK → users | Signed-in user. |
| `token_hash` | char(64) | no | UNIQUE | SHA-256 of the token ID; the token itself is never stored. |
| `ip_address` | varchar(45) | yes |  | Client IP at sign-in. |
| `user_agent` | varchar(255) | yes |  | Client browser at sign-in. |
| `created_at` | datetime | no | default current_timestamp() | When the row was created. |
| `last_seen_at` | datetime | no | default current_timestamp() | Last authenticated request. |
| `expires_at` | datetime | no |  | Same expiry as the token. |
| `revoked_at` | datetime | yes |  | Set on logout, deactivation, role change, or password reset. |

### 17. `login_attempts`  ·  ERD: — (beyond the ERD)

Recent sign-in attempts, used to throttle password guessing.

| Column | Type | Null | Key / Default | Description |
|---|---|---|---|---|
| `id` | int(11) | no | PK, auto | Primary key. |
| `email` | varchar(255) | no |  | Email as typed, so guesses at unregistered addresses count too. |
| `ip_address` | varchar(45) | no |  | Client IP. |
| `succeeded` | tinyint(1) | no |  | 1 for a successful sign-in, which clears the failure count. |
| `attempted_at` | datetime | no | default current_timestamp() | When the attempt was made. |

## Relationships

| Child | Foreign key | Parent | On delete |
|---|---|---|---|
| activity_log | actor_id | users | RESTRICT |
| exchange_requests | offered_listing_id | listings | RESTRICT |
| exchange_requests | requester_id | users | RESTRICT |
| exchange_requests | target_listing_id | listings | RESTRICT |
| handover_slots | location_id | meetup_locations | RESTRICT |
| listings | age_category_id | age_categories | RESTRICT |
| listings | condition_id | conditions | RESTRICT |
| listings | format_id | formats | RESTRICT |
| listings | genre_id | genres | RESTRICT |
| listings | user_id | users | RESTRICT |
| listings | verified_by | users | SET NULL |
| listing_photos | listing_id | listings | CASCADE |
| notifications | user_id | users | CASCADE |
| reports | handled_by | users | SET NULL |
| reports | listing_id | listings | RESTRICT |
| reports | reporter_id | users | RESTRICT |
| reports | request_id | exchange_requests | RESTRICT |
| reports | transaction_id | transactions | RESTRICT |
| transactions | exchange_request_id | exchange_requests | RESTRICT |
| transactions | handled_by | users | SET NULL |
| transactions | slot_id | handover_slots | RESTRICT |
| user_sessions | user_id | users | CASCADE |
| watchlist | listing_id | listings | CASCADE |
| watchlist | user_id | users | CASCADE |

RESTRICT keeps records with history (an owner of listings or an audit-log actor cannot be deleted). CASCADE removes rows that mean nothing without their parent (photos, notifications, watchlist entries, sessions). SET NULL keeps a transaction or report when the moderator attached to it leaves.

## CHECK constraints

| Table | Constraint | Rule |
|---|---|---|
| exchange_requests | chk_request_distinct_books | ``target_listing_id` <> `offered_listing_id`` |
| handover_slots | chk_slot_times | ``end_time` > `start_time`` |
| reports | chk_report_has_subject | ``transaction_id` is not null or `listing_id` is not null or `request_id` is not null` |
| transactions | chk_reschedule_limit | ``reschedule_count` between 0 and 1` |
