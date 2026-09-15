# BookSwap Backend — Setup, Conventions, and API Reference

Plain PHP 8 (no framework, no Composer) on MySQL 8.0 / MariaDB 10.4. The endpoint reference at the end is generated from `backend/routes/api.php`.

## 1. Local setup (XAMPP)

1. **Free port 3306.** If a separate MySQL 8.0 service (`MySQL80`) is installed, it starts on boot and blocks XAMPP's MariaDB. Set it to Manual (Services → MySQL80 → Startup type), or run once in an administrator terminal: `sc config MySQL80 start= demand`.
2. **Create `backend/config/local.php`** by copying `local.example.php`, then set a real `JWT_SECRET` (`php -r "echo bin2hex(random_bytes(32));"`). Sign-in is refused while the placeholder secret is in place. The file is gitignored.
3. **Load the database:** `mysql -u root < backend/database/schema.sql`, then `mysql -u root < backend/database/seed.sql`. Reloading resets all data.
4. **Serve the API**, either:
   - `php -S 127.0.0.1:8765 -t backend backend/index.php` → `http://127.0.0.1:8765/api/...`, or
   - Apache: put the project under `htdocs` → `http://localhost/<folder>/backend/api/...` (`.htaccess` handles routing and the Authorization header).

Seed accounts (password for all: `Password123!`):

| Email | Role | Notes |
|---|---|---|
| admin@bookswap.test | admin |  |
| moderator@bookswap.test | staff | Handles most seeded exchanges |
| moderator2@bookswap.test | staff |  |
| ana@bookswap.test | customer | Favourite genres: Fantasy, Mystery |
| marco@bookswap.test | customer |  |
| bea@bookswap.test | customer |  |
| jon@bookswap.test | customer |  |
| pending@bookswap.test | customer | Pending approval, cannot sign in |

## 2. Request lifecycle

`index.php` (error handling, security + CORS headers) → `routes/api.php` → controller → `requireAuth()` (token, session, account, role) → model (prepared SQL) → JSON response.

## 3. Conventions for contributors

- **SQL only in models**, always through `runQuery()` with named placeholders (each name used once per statement). Use `fetchPage()` for lists, `bindInList()` for `IN (...)`, `likeContains()` for keyword search.
- **Multi-table changes** go inside `withTransaction(function () { ... })`. Inside it, stop a request with `throw new ApiException('message', 409)`, never `sendError()`, so the rollback runs.
- **List endpoints** call `readListQuery($sortOptions, $defaultSort, $statusOptions)` and answer with `sendPaginated($rows, paginationMeta($total, $query))`. Only whitelisted sort keys may reach `ORDER BY`.
- **Constants** for every role, status, and limit live in `config/constants.php`.
- **Audit:** every state change calls `ReportModel::logActivity()`.
- **Strings:** wrap variables in braces when text follows immediately, e.g. `"{$start}–{$end}"`; PHP otherwise reads the following bytes as part of the variable name.

## 4. Responses and errors

Success: `{ "success": true, "message": "...", "data": ... }`, plus `"meta": { page, per_page, total, total_pages }` on lists.
Error: `{ "success": false, "message": "...", "errors"?: { field: message } }`.

| Status | Meaning |
|---|---|
| 401 | No token, or the session has ended |
| 403 | Wrong role, or acting on something you are part of |
| 404 | Not found, or not visible to you |
| 409 | Conflicts with the current state |
| 422 | Validation failed |
| 429 | Too many failed sign-ins (see `Retry-After`) |
| 500 | Unexpected error (details only when `APP_DEBUG` is true) |

**Authentication:** send `Authorization: Bearer <token>` from `POST /api/auth/login`. Tokens last one hour and stop working on logout, deactivation, role change, or password reset.

**Lists** accept `page`, `per_page` (max 50), `sort`, `status`, `date_from`, `date_to` (YYYY-MM-DD), and `keyword`.

**Photos:** `photos[].id` and `cover_photo_id` on a listing are fetched with `GET /api/photos/{id}`. Photos of listings that are not available need the owner's or a moderator's token, so fetch them with the header and display a blob URL.

## 5. Endpoint reference (66 routes)

### Auth

| Method | Path | Access | Handler |
|---|---|---|---|
| POST | `/api/auth/register` | Public | AuthController::register |
| POST | `/api/auth/login` | Public | AuthController::login |
| POST | `/api/auth/logout` | Any signed-in user | AuthController::logout |

### Public Catalog (no auth)

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/listings` | Public (more with a token) | ListingController::index |
| GET | `/api/listings/{id}` | Public (more with a token) | ListingController::show |
| GET | `/api/photos/{id}` | Public (more with a token) | ListingController::photo |

### Public Taxonomy (no auth)

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/genres` | Public | CategoryController::listGenres |
| GET | `/api/formats` | Public | CategoryController::listFormats |
| GET | `/api/age-categories` | Public | CategoryController::listAgeCategories |
| GET | `/api/conditions` | Public | CategoryController::listConditions |
| GET | `/api/meetup-locations` | Public | CategoryController::listMeetupLocations |

### Member: Profile, Dashboard, Account

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/user/profile` | Any signed-in user | UserController::getProfile |
| PUT | `/api/user/profile` | Any signed-in user | UserController::updateProfile |
| GET | `/api/user/dashboard` | Member | UserController::dashboard |
| PUT | `/api/user/deactivate` | Member | UserController::deactivateAccount |

### Member: Notifications

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/user/notifications` | Any signed-in user | UserController::getNotifications |
| PUT | `/api/user/notifications/{id}/read` | Any signed-in user | UserController::markNotificationRead |
| PUT | `/api/user/notifications/read-all` | Any signed-in user | UserController::markAllNotificationsRead |

### Member: Listings & Watchlist

| Method | Path | Access | Handler |
|---|---|---|---|
| POST | `/api/listings` | Member | ListingController::create |
| PUT | `/api/listings/{id}` | Member | ListingController::update |
| DELETE | `/api/listings/{id}` | Member | ListingController::withdraw |
| POST | `/api/listings/{id}/watchlist` | Member | ListingController::addToWatchlist |
| DELETE | `/api/listings/{id}/watchlist` | Member | ListingController::removeFromWatchlist |
| GET | `/api/user/watchlist` | Member | ListingController::getWatchlist |

### Member: Exchange Requests (decided by the listing owner)

| Method | Path | Access | Handler |
|---|---|---|---|
| POST | `/api/exchanges` | Member | ExchangeController::sendRequest |
| GET | `/api/exchanges/{id}` | Any signed-in user | ExchangeController::show |
| PUT | `/api/exchanges/{id}/accept` | Member | ExchangeController::acceptRequest |
| PUT | `/api/exchanges/{id}/decline` | Member | ExchangeController::declineRequest |
| PUT | `/api/exchanges/{id}/withdraw` | Member | ExchangeController::withdrawRequest |

### Member: Transactions & Reports

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/transactions/{id}` | Any signed-in user | TransactionController::show |
| PUT | `/api/transactions/{id}/confirm` | Member | TransactionController::confirmReceipt |
| POST | `/api/reports` | Member | UserController::fileReport |

### Staff: Moderation

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/staff/dashboard` | Staff, Admin | StaffController::dashboard |
| PUT | `/api/staff/listings/{id}/verify` | Staff, Admin | StaffController::verifyListing |
| GET | `/api/staff/requests` | Staff, Admin | StaffController::listRequests |
| GET | `/api/staff/transactions` | Staff, Admin | StaffController::listTransactions |
| POST | `/api/staff/transactions/{id}/schedule` | Staff, Admin | StaffController::scheduleHandover |
| PUT | `/api/staff/transactions/{id}/reschedule` | Staff, Admin | StaffController::rescheduleHandover |
| PUT | `/api/staff/transactions/{id}/status` | Staff, Admin | StaffController::updateTransactionStatus |
| PUT | `/api/staff/transactions/{id}/no-show` | Staff, Admin | StaffController::recordNoShow |
| GET | `/api/staff/reports` | Staff, Admin | StaffController::listReports |
| PUT | `/api/staff/reports/{id}` | Staff, Admin | StaffController::resolveReport |
| GET | `/api/staff/handover-slots` | Staff, Admin | CategoryController::listAvailableSlots |

### Admin: User Management

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | AdminController::listUsers |
| PUT | `/api/admin/users/{id}/status` | Admin | AdminController::updateUserStatus |
| PUT | `/api/admin/users/{id}/role` | Admin | AdminController::updateUserRole |
| POST | `/api/admin/users/{id}/reset-password` | Admin | AdminController::resetPassword |

### Admin: Dashboard, Reports, Audit

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | AdminController::dashboard |
| GET | `/api/admin/reports/summary` | Admin | AdminController::reportSummary |
| GET | `/api/admin/reports/genres` | Admin | AdminController::reportTopGenres |
| GET | `/api/admin/reports/cities` | Admin | AdminController::reportByCity |
| GET | `/api/admin/reports/age-groups` | Admin | AdminController::reportByAgeGroup |
| GET | `/api/admin/activity-log` | Admin | AdminController::activityLog |

### Admin: Taxonomy & Reference Data

| Method | Path | Access | Handler |
|---|---|---|---|
| POST | `/api/admin/genres` | Admin | CategoryController::createGenre |
| PUT | `/api/admin/genres/{id}/retire` | Admin | CategoryController::retireGenre |
| POST | `/api/admin/formats` | Admin | CategoryController::createFormat |
| PUT | `/api/admin/formats/{id}/retire` | Admin | CategoryController::retireFormat |
| POST | `/api/admin/age-categories` | Admin | CategoryController::createAgeCategory |
| PUT | `/api/admin/age-categories/{id}/retire` | Admin | CategoryController::retireAgeCategory |
| POST | `/api/admin/conditions` | Admin | CategoryController::createCondition |
| PUT | `/api/admin/conditions/{id}/retire` | Admin | CategoryController::retireCondition |
| POST | `/api/admin/meetup-locations` | Admin | CategoryController::createMeetupLocation |
| PUT | `/api/admin/meetup-locations/{id}/retire` | Admin | CategoryController::retireMeetupLocation |

### Admin: Handover Slot Pool

| Method | Path | Access | Handler |
|---|---|---|---|
| GET | `/api/admin/handover-slots` | Admin | CategoryController::listSlots |
| POST | `/api/admin/handover-slots` | Admin | CategoryController::createSlot |
| PUT | `/api/admin/handover-slots/{id}/retire` | Admin | CategoryController::retireSlot |

