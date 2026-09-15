# BookSwap Backend — Engineering Progress Log

---

## Session 1 — 2026-09-11 (Member 3 — Backend Architecture Scaffold)

### What Was Built

Completed the full PHP backend scaffold for the BookSwap peer-to-peer book exchange platform. The backend is structured as a layered REST API designed to be database-ready without yet requiring a live MySQL connection. All database operations are stubbed with commented SQL so a separate developer can drop in PDO calls without touching the business logic.

---

### Architecture Decisions

**No framework, no Composer.**
The project is hosted on InfinityFree, which does not guarantee Composer support or consistent PHP extensions. The entire backend is written in vanilla PHP with no external dependencies. JWT is implemented manually using HMAC-SHA256 rather than relying on firebase/php-jwt or similar packages.

**Layered separation: config → helpers → middleware → models → controllers → routes.**
Each layer has one responsibility. The router maps URLs to controllers; controllers contain all business logic and call models for data; models contain only SQL stubs; helpers contain pure utility functions. This keeps individual files small and easy to read.

**Models are DB-agnostic shells.**
Every model method body is a documented stub. The SQL query is shown in a block comment immediately above the PDO code, which is also commented out. When the database is connected, the integrator only needs to uncomment the PDO block and remove the stub return value. No refactoring of controllers or routes is required.

**Role-based access control is enforced at the controller level.**
The `requireAuth()` middleware call at the top of each controller method decodes the JWT, checks expiry, and optionally enforces a role. This means the access check happens before any database query runs, which is both efficient and easy to audit.

**Activity logging is built into every state-change operation.**
All Admin and Staff actions write a record to `ReportModel::logActivity()`. This implements the audit trail required by the project document.

**Constants file as a single source of truth.**
All role names, status strings, and numeric limits are defined in `config/constants.php`. Controllers, models, and middleware all reference these constants, so changing a status label in one place propagates everywhere.

---

### Files Created in Session 1

| Layer | File | Purpose |
|---|---|---|
| Config | `config/database.php` | PDO connection placeholder |
| Config | `config/constants.php` | Roles, statuses, business-rule limits |
| Helper | `helpers/auth.php` | JWT generation/validation, password hashing |
| Helper | `helpers/response.php` | Standardized JSON response functions |
| Helper | `helpers/validator.php` | Input validation and sanitization |
| Helper | `helpers/upload.php` | Book photo upload and validation |
| Middleware | `middleware/auth_middleware.php` | Role-based access control |
| Model | `models/UserModel.php` | User CRUD stubs |
| Model | `models/ListingModel.php` | Listing CRUD + catalog search stubs |
| Model | `models/ExchangeModel.php` | Exchange request workflow stubs |
| Model | `models/TransactionModel.php` | Transaction + handover slot stubs |
| Model | `models/CategoryModel.php` | Genre, condition, location stubs |
| Model | `models/ReportModel.php` | Analytics + activity log stubs |
| Model | `models/NotificationModel.php` | Notification CRUD stubs |
| Controller | `controllers/AuthController.php` | Register, login, logout |
| Controller | `controllers/AdminController.php` | User management, reports, audit log |
| Controller | `controllers/StaffController.php` | Listing verification, request endorsement, handover scheduling |
| Controller | `controllers/UserController.php` | Profile, dashboard, notifications |
| Controller | `controllers/ListingController.php` | Public catalog, listing CRUD, watchlist |
| Controller | `controllers/ExchangeController.php` | Send, accept, decline, withdraw requests |
| Controller | `controllers/TransactionController.php` | Receipt confirmation, dispute filing |
| Controller | `controllers/CategoryController.php` | Taxonomy management |
| Route | `routes/api.php` | Central router — 40+ routes |
| Entry | `index.php` | Bootstrap, CORS headers, router dispatch |
| Apache | `.htaccess` | URL rewrite to index.php |

---

## Session 2 — 2026-09-11 (Member 4 — Database Design & Live Model Integration)

### What Was Built

Completed the full database schema implementation, seed data generator, ERD documentation, live PDO connection enablement, and model implementation for all database entities adhering to the official project ERD and `docs/DB_API_GUIDE.md`.

---

### Database Implementation Details

1. **MySQL Relational Schema (`backend/database/schema.sql`)**:
   - 11 core tables strictly normalized according to the project proposal ERD: `users`, `categories`, `conditions`, `meetup_locations`, `listings`, `exchange_requests`, `transactions`, `handover_slots`, `notifications`, `activity_log`, and `watchlist`.
   - Foreign key constraints with cascading rules and indexes for optimized query performance on `created_at`, `status`, and relational lookup keys.
2. **Comprehensive Seed Data (`backend/database/seed.sql`)**:
   - Seeded active Administrator, Staff/Moderator, and verified Customer test accounts with bcrypt password hashes (`Password123!`).
   - Populated standard genres (Academic, Computer Science, Engineering, Mathematics, Literature, General Education), condition grades, and designated campus meetup locations.
   - Populated sample listings across various statuses, complete exchange request cycles, active transactions, and audit trail logs.
3. **Live PDO Singleton (`backend/config/database.php`)**:
   - Enabled UTF-8mb4 PDO singleton with prepared statement emulation disabled and exception mode activated.
4. **Complete Model Implementations**:
   - `models/UserModel.php`: Replaced all stubs with live PDO prepared statements for user lookup, registration, profile updates, status changes, role promotion, password updates, and exchange count increments.
   - `models/CategoryModel.php`: Replaced stubs with live queries for genres, condition grades, and meetup locations.
   - `models/ListingModel.php`: Implemented dynamic multi-parameter catalog filtering (keyword, genre, condition, sorting), user listing retrieval, pending verification queues, idle listing detection, and lifecycle status mutations.
   - `models/ExchangeModel.php`: Implemented multi-table joins for exchange requests, requester/target listing queries, pending staff endorsement queue, active request deduplication, and automated cancellation of expired requests.
   - `models/TransactionModel.php`: Implemented transaction lookups with handover slot and meetup location joins, user transaction history, staff daily schedule queries, handover slot assignment, atomic transaction-based reschedule logic, no-show recording, and dual-party receipt confirmation verification.
   - `models/ReportModel.php`: Implemented SQL aggregation for administrative summary metrics, top requested genres, regional city participation, and filtered activity log audits.
   - `models/NotificationModel.php`: Implemented notification creation, unread retrieval, mark-as-read, and mark-all-read operations.
   - `models/WatchlistModel.php`: Added dedicated model with duplicate-safe watchlist insertion (`INSERT IGNORE`), removal, user watchlist retrieval, and watcher notifications.
5. **Controller Business Rule & Security Wiring**:
   - `StaffController`: Target listing owner identification, strict staff self-transaction prohibition, automated listing lock/unlock on approval or cancellation, and automated notification dispatches.
   - `TransactionController`: Real Party A (listing owner) vs Party B (requester) verification, transaction completion trigger, user exchange count incrementation, automatic listing archiving, and staff-wide dispute broadcast.
   - `ExchangeController`: Validated listing owner identity before allowing request acceptance or decline.
   - `ListingController`: Wired up watchlist operations (`POST`, `DELETE`, `GET`) and connected to `routes/api.php`.
   - `AdminController`: Implemented safeguard against deactivating the platform's sole remaining active administrator.

---

### Files Created / Updated in Session 2

| Layer | File | Purpose |
|---|---|---|
| Database | `database/schema.sql` | 11-table DDL schema matching project ERD |
| Database | `database/seed.sql` | Comprehensive seed data for test workflows |
| Config | `config/database.php` | Active PDO singleton connection |
| Model | `models/UserModel.php` | Live PDO queries for users table |
| Model | `models/CategoryModel.php` | Live PDO queries for taxonomy tables |
| Model | `models/ListingModel.php` | Live PDO queries for catalog and listings |
| Model | `models/ExchangeModel.php` | Live PDO queries for exchange requests |
| Model | `models/TransactionModel.php` | Live PDO queries for transactions & handover slots |
| Model | `models/ReportModel.php` | Live PDO aggregation and activity logging |
| Model | `models/NotificationModel.php` | Live PDO queries for in-app notifications |
| Model | `models/WatchlistModel.php` | Watchlist table CRUD operations |
| Controller | `controllers/StaffController.php` | Fully wired with DB calls and notifications |
| Controller | `controllers/TransactionController.php` | Double-confirmation & dispute notifications |
| Controller | `controllers/ExchangeController.php` | Listing owner permission verification |
| Controller | `controllers/ListingController.php` | Watchlist endpoints and model wiring |
| Controller | `controllers/AdminController.php` | Sole administrator guard protection |
| Route | `routes/api.php` | Watchlist delete and get routes added |
| Documentation | `docs/ERD_DATA_DICTIONARY.md` | Data dictionary, relationships, and ERD mapping |
| Documentation | `docs/PROGRESS.md` | Session 2 engineering progress updates |

---

### Integration Checklist Status

- [x] Wire up the MySQL database connection in `config/database.php`
- [x] Create the MySQL database schema and seed data (`database/schema.sql`, `database/seed.sql`)
- [x] Implement PDO queries in all model methods (`UserModel`, `CategoryModel`, `ListingModel`, `ExchangeModel`, `TransactionModel`, `ReportModel`, `NotificationModel`)
- [x] Create the `activity_log`, `notifications`, and `watchlist` tables and models
- [x] Implement controller DB hooks (Party A vs B receipt confirmation, staff self-transaction guard, listing locking/unlocking)
- [ ] Integrate SendGrid or Mailgun for external transactional emails (in-app notifications are fully active)
- [ ] Replace default `JWT_SECRET` with generated production secret in `config/constants.php`
- [ ] Harden CORS to production Vercel frontend URL in `index.php`
- [ ] Deploy database and backend to live server (InfinityFree)

---

## Session 3 — 2026-09-15 (Phase 2 completion, aligned to the Phase 1 document)

### What Changed and Why

The Session 1–2 backend was built from an older campus (ULSVO) design. It was rebuilt against **[Phase 1] BookSwap_Project_Document_Group_3.pdf** (text, Figure 1 architecture, Figure 2 ERD) and the gaps in the **Final Project Guide** were closed.

**Database, now matching the Phase 1 ERD (16 tables, 24 foreign keys, 4 CHECK constraints)**
- `categories` split into `genres`, `formats`, `age_categories`; listings carry all three plus `verified_by`.
- New `listing_photos` (1–5 photos per listing), `reports` (disputes, no-shows, inappropriate listings, spam requests), and `user_sessions`.
- `handover_slots` is now an Administrator-defined pool; transactions book a slot and store both receipt confirmations and `completed_at`.
- Campus-era user columns and the stored `exchange_count` removed; completed exchanges are counted from transactions.
- Column names kept where the ERD only renames them; the Phase 2 document carries the ERD-to-schema name map.

**Workflow, now following Phase 1 rules**
- Requests are decided by the listing owner only; the staff endorsement step is gone (§3.2.2, §4.4).
- Transactions run Accepted → Scheduled → Completed | Cancelled (§3.2.3). Acceptance locks both books, opens the transaction, and auto-declines competing requests in one database transaction.
- Only Staff change transaction state (§4.2); members confirm receipt, then Staff record completion.
- Staff cannot verify, schedule, reschedule, complete, cancel, or record a no-show on anything they are part of (§4.5).
- Unanswered requests expire, watchers are notified when a book becomes available, members can deactivate their own account, and counterpart phone numbers are shared only after acceptance.

**Guide requirements**
- Sessions: each JWT is tied to a `user_sessions` row, so logout, deactivation, role change, and password reset end sessions immediately.
- Search, filter, sort, pagination on the catalogue and every staff/admin list, with whitelisted sort and status values and validated dates.
- Admin dashboard (totals, 12-month chart data, most requested genres, recent activity) and reports by genre, city, and age group.
- Global JSON error handling, security headers, CORS allow-list, output escaping, and the JWT secret moved to `config/local.php` (not committed).

### New Files in Session 3

| Layer | File | Purpose |
|---|---|---|
| Config | `config/local.example.php` | Template for the uncommitted `config/local.php` (secret, debug, CORS, DB) |
| Helper | `helpers/errors.php` | Global exception, warning, and fatal-error handling |
| Model | `models/SessionModel.php` | Server-side sessions behind JWTs |
| Model | `models/HandoverSlotModel.php` | Administrator-defined handover slot pool |
| Model | `models/IncidentReportModel.php` | Member and staff reports (`reports` table) |

All other backend files, `database/schema.sql`, `database/seed.sql`, and `docs/images/*.png` (replaced with the Phase 1 figures) were rewritten or updated.

### Verification

Local Apache/MariaDB/PHP, live database, 234 end-to-end checks across authentication and sessions, role-based access, search and pagination, dashboard and reports, listings, requests, transactions, reports, reference data, accounts, and error handling. All 234 pass. Two defects found during the run were fixed:
- An accepted request whose exchange was later cancelled still counted as "active", blocking the member from requesting that book again.
- Creating a handover slot returned 500 because an en dash directly after `$startTime` in a string was read as part of the variable name.

### Integration Checklist Status

- [x] Replace default `JWT_SECRET` — now read from `config/local.php`; login is refused while the placeholder is in use
- [x] Harden CORS — origins come from `CORS_ORIGINS` in `config/local.php` instead of `*`
- [ ] Add the production Vercel URL to `CORS_ORIGINS` on the live server
- [ ] Integrate SendGrid or Mailgun for external transactional emails (in-app notifications are fully active)
- [ ] OAuth 2.0 (Google / Facebook) login from Figure 1
- [ ] Deploy database and backend to live server (InfinityFree)
- [ ] Update `docs/ERD_DATA_DICTIONARY.md` and `docs/DB_API_GUIDE.md`, which still describe the Session 1–2 design

### Deep Check — 2026-09-15

Re-ran everything through real XAMPP Apache (not only PHP's built-in server) and added 34 security probes: SQL injection, forged/expired/`alg=none` tokens, mass assignment, access to other members' records, disguised PHP uploads, and stored XSS. Two deployment defects were found and fixed:
- **Apache dropped the `Authorization` header**, so every protected endpoint would have returned 401 once deployed. `.htaccess` now passes it through.
- **PHP and the database disagreed on the time** (php.ini Europe/Berlin vs. database Asia/Singapore, 6 hours apart), which could put slots and report ranges on the wrong day. Both now use `APP_TIMEZONE` (default `Asia/Manila`, set in `config/local.php`).

After the fixes: 234/234 functional and 34/34 security checks pass on both Apache and the built-in server. Every route maps to a real method, and every non-public endpoint requires authentication.
