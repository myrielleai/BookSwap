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
