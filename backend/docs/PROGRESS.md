# BookSwap Backend — Engineering Progress Log

---

## Session 1 — 2026-09-11

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

### Files Created

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

### Known Gaps — TODOs for Integration

The following items are marked with `TODO` comments throughout the codebase:

1. **All model methods** — SQL stubs must be replaced with live PDO calls after the DB is connected.
2. **`TransactionController::confirmReceipt()`** — `$isPartyA` determination is stubbed; needs the exchange_request join.
3. **`StaffController::endorseRequest()`** — role-separation check needs the target listing owner's ID from DB.
4. **`StaffController::updateTransactionStatus()`** — listing lock/unlock requires fetching both listing IDs from exchange_request.
5. **`ListingController::addToWatchlist()`** — requires a `watchlist` table and model.
6. **Email notifications** — `AuthController::register()` has a `TODO (API - Email)` marker.
7. **CORS origin** — `index.php` uses `*`; update to Vercel URL before going live.
8. **`JWT_SECRET`** — replace with a strong random string in `config/constants.php`.
9. **Error reporting** — `display_errors` set to `1`; must be `0` in production.

---

### Next Steps

- [ ] Wire up the MySQL database connection in `config/database.php`
- [ ] Implement PDO queries in all model methods (see `docs/DB_API_GUIDE.md`)
- [ ] Create the `activity_log`, `notifications`, and `watchlist` tables
- [ ] Integrate SendGrid or Mailgun for transactional emails
- [ ] Replace `JWT_SECRET` with a generated secret
- [ ] Harden CORS to the Vercel production URL
- [ ] Run end-to-end tests against each endpoint
