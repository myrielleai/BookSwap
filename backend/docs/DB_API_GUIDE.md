# BookSwap Backend — Database & API Integration Guide

> **Who this is for:** The groupmate responsible for connecting the MySQL database
> and any third-party API calls (email, OAuth) to the backend that has already been built.

---

## Overview

The backend is fully structured but runs without a live database right now.
Every model method returns a stub value (`null`, `[]`, `0`, or `false`).
Your job is to replace those stubs with real PDO queries and wire in any APIs.

The good news: **you never need to touch controllers, routes, helpers, or middleware.**
All your work goes inside `config/database.php` and the `models/` folder.

---

## Step 1 — Set Up the Database Connection

Open [`config/database.php`](../config/database.php).

Fill in your credentials:

```php
define('DB_HOST', 'localhost');       // your MySQL host
define('DB_NAME', 'bookswap');        // your database name
define('DB_USER', 'your_username');   // your DB username
define('DB_PASS', 'your_password');   // your DB password
```

Then **uncomment the PDO block** inside `getDBConnection()`:

```php
// Remove the comment markers around this block:
try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    error_log('[BookSwap DB Error] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
    exit;
}
```

Also **remove the `return null;` stub** at the bottom of the function.

---

## Step 2 — Required Database Tables

Create these tables in MySQL (via phpMyAdmin or an `.sql` file).
The column names must match exactly what the model comments reference.

### `users`
```sql
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255)  NOT NULL,
    role            ENUM('admin','staff','customer') NOT NULL DEFAULT 'customer',
    status          ENUM('pending','active','inactive','suspended') NOT NULL DEFAULT 'pending',
    city            VARCHAR(100),
    favorite_genres TEXT,
    exchange_count  INT           NOT NULL DEFAULT 0,
    created_at      DATETIME      NOT NULL,
    updated_at      DATETIME
);
```

### `categories`
```sql
CREATE TABLE categories (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    type      ENUM('genre','age','format') NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL
);
```

### `conditions`
```sql
CREATE TABLE conditions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    label       VARCHAR(50)  NOT NULL,
    description TEXT         NOT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    created_at  DATETIME     NOT NULL
);
```

### `meetup_locations`
```sql
CREATE TABLE meetup_locations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    address    TEXT         NOT NULL,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL
);
```

### `listings`
```sql
CREATE TABLE listings (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT          NOT NULL,
    title            VARCHAR(255) NOT NULL,
    author           VARCHAR(255) NOT NULL,
    edition          VARCHAR(100),
    publisher        VARCHAR(150),
    genre_id         INT          NOT NULL,
    condition_id     INT          NOT NULL,
    preferred_return TEXT,
    is_open_offer    TINYINT(1)   NOT NULL DEFAULT 0,
    photo_path       VARCHAR(500) NOT NULL,
    status           ENUM('unverified','available','locked','returned','rejected','archived','withdrawn') NOT NULL DEFAULT 'unverified',
    staff_note       TEXT,
    created_at       DATETIME     NOT NULL,
    updated_at       DATETIME,
    FOREIGN KEY (user_id)      REFERENCES users(id),
    FOREIGN KEY (genre_id)     REFERENCES categories(id),
    FOREIGN KEY (condition_id) REFERENCES conditions(id)
);
```

### `exchange_requests`
```sql
CREATE TABLE exchange_requests (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    requester_id        INT  NOT NULL,
    target_listing_id   INT  NOT NULL,
    offered_listing_id  INT  NOT NULL,
    message             TEXT,
    status              ENUM('pending','endorsed','accepted','declined','rejected','held','withdrawn','cancelled') NOT NULL DEFAULT 'pending',
    decline_reason      TEXT,
    staff_note          TEXT,
    created_at          DATETIME NOT NULL,
    updated_at          DATETIME,
    FOREIGN KEY (requester_id)       REFERENCES users(id),
    FOREIGN KEY (target_listing_id)  REFERENCES listings(id),
    FOREIGN KEY (offered_listing_id) REFERENCES listings(id)
);
```

### `transactions`
```sql
CREATE TABLE transactions (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    exchange_request_id INT          NOT NULL UNIQUE,
    status              ENUM('pending','approved','scheduled','completed','cancelled') NOT NULL DEFAULT 'pending',
    cancel_reason       TEXT,
    reschedule_count    INT          NOT NULL DEFAULT 0,
    handled_by          INT,
    created_at          DATETIME     NOT NULL,
    updated_at          DATETIME,
    FOREIGN KEY (exchange_request_id) REFERENCES exchange_requests(id),
    FOREIGN KEY (handled_by)          REFERENCES users(id)
);
```

### `handover_slots`
```sql
CREATE TABLE handover_slots (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id   INT  NOT NULL UNIQUE,
    location_id      INT  NOT NULL,
    slot_date        DATE NOT NULL,
    slot_time        TIME NOT NULL,
    confirmed_by_a   TINYINT(1) NOT NULL DEFAULT 0,
    confirmed_by_b   TINYINT(1) NOT NULL DEFAULT 0,
    no_show_recorded TINYINT(1) NOT NULL DEFAULT 0,
    created_at       DATETIME NOT NULL,
    updated_at       DATETIME,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (location_id)    REFERENCES meetup_locations(id)
);
```

### `notifications`
```sql
CREATE TABLE notifications (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT          NOT NULL,
    type                VARCHAR(60)  NOT NULL,
    message             TEXT         NOT NULL,
    is_read             TINYINT(1)   NOT NULL DEFAULT 0,
    related_record_type VARCHAR(30),
    related_record_id   INT,
    created_at          DATETIME     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### `activity_log`
```sql
CREATE TABLE activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    actor_id    INT          NOT NULL,
    record_type VARCHAR(30)  NOT NULL,
    record_id   INT          NOT NULL,
    action      VARCHAR(60)  NOT NULL,
    note        TEXT,
    created_at  DATETIME     NOT NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id)
);
```

### `watchlist` (optional — for the watchlist feature)
```sql
CREATE TABLE watchlist (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    listing_id INT NOT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY unique_watchlist (user_id, listing_id),
    FOREIGN KEY (user_id)    REFERENCES users(id),
    FOREIGN KEY (listing_id) REFERENCES listings(id)
);
```

---

## Step 3 — Implement the Model Methods

Open each file in `models/`. Every method has a comment block showing the SQL and the PDO code to uncomment. Here is the pattern to follow for every method:

**Before (stub):**
```php
public function findByEmail(string $email): ?array {
    // TODO (DB):
    // SQL: SELECT * FROM users WHERE email = :email LIMIT 1
    //
    // $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    // $stmt->execute([':email' => $email]);
    // $result = $stmt->fetch();
    // return $result ?: null;

    return null; // stub
}
```

**After (live):**
```php
public function findByEmail(string $email): ?array {
    $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
    $stmt->execute([':email' => $email]);
    $result = $stmt->fetch();
    return $result ?: null;
}
```

Steps for each method:
1. Read the SQL comment to understand what the query does.
2. Uncomment the PDO lines.
3. Remove the `return null; // stub` (or `return false;` / `return [];`) line.
4. Done — the controller will automatically pick up the real data.

### Files to update (in recommended order):

| File | Methods to implement |
|---|---|
| `models/UserModel.php` | `findById`, `findByEmail`, `getAll`, `create`, `updateProfile`, `updateStatus`, `updateRole`, `updatePassword`, `incrementExchangeCount` |
| `models/CategoryModel.php` | All — these are needed for listings to work |
| `models/ListingModel.php` | `findById`, `getAvailable`, `getByUserId`, `getPending`, `getIdle`, `create`, `update`, `updateStatus`, `withdraw` |
| `models/ExchangeModel.php` | `findById`, `getByRequester`, `getByTargetListing`, `getPendingForStaff`, `hasActiveRequest`, `create`, `updateStatus`, `cancelExpired` |
| `models/TransactionModel.php` | `findById`, `getByUserId`, `getByStaffId`, `getScheduledToday`, `create`, `updateStatus`, `assignHandoverSlot`, `rescheduleHandoverSlot`, `recordNoShow`, `confirmReceipt`, `bothPartiesConfirmed` |
| `models/ReportModel.php` | `getSummary`, `getTopGenres`, `getParticipationByCity`, `getActivityLog`, `logActivity` |
| `models/NotificationModel.php` | `create`, `getUnread`, `getAll`, `markRead`, `markAllRead` |

---

## Step 4 — Complete the TODOs in Controllers

A few controller methods have `TODO` comments where they need to fetch additional data from the DB to perform their logic. Search for `// TODO` in the `controllers/` folder to find them all.

The most important ones:

### `StaffController::endorseRequest()` — role-separation check
```php
// After you can query the DB, fetch the target listing's owner_id:
$targetListing = $this->listingModel->findById((int) $request['target_listing_id']);
blockStaffSelfTransaction($staff['sub'], [
    (int) $request['requester_id'],
    (int) $targetListing['user_id']
]);
```

### `StaffController::updateTransactionStatus()` — lock/unlock listings
```php
// Fetch the exchange request to get both listing IDs:
$exchangeReq = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
if ($body['status'] === TX_APPROVED) {
    $this->listingModel->updateStatus((int) $exchangeReq['target_listing_id'],  LISTING_LOCKED);
    $this->listingModel->updateStatus((int) $exchangeReq['offered_listing_id'], LISTING_LOCKED);
}
if ($body['status'] === TX_CANCELLED) {
    $this->listingModel->updateStatus((int) $exchangeReq['target_listing_id'],  LISTING_AVAILABLE);
    $this->listingModel->updateStatus((int) $exchangeReq['offered_listing_id'], LISTING_AVAILABLE);
}
```

### `TransactionController::confirmReceipt()` — determine Party A vs Party B
```php
// Fetch the exchange request to determine which party the user is:
$exchangeReq   = $this->exchangeModel->findById((int) $tx['exchange_request_id']);
$targetListing = $this->listingModel->findById((int) $exchangeReq['target_listing_id']);
$isPartyA = ((int) $targetListing['user_id'] === $userId); // Party A = listing owner
```

---

## Step 5 — Third-Party API Integration

### Email Notifications (SendGrid or Mailgun)

The registration and password-reset flows have `// TODO (API - Email)` markers in `AuthController.php`.

Example using SendGrid (add this where the TODO markers are):
```php
// Install via: composer require sendgrid/sendgrid
// OR use file_get_contents with a raw HTTP POST if Composer is unavailable.

$apiKey  = 'YOUR_SENDGRID_API_KEY';
$payload = json_encode([
    'personalizations' => [['to' => [['email' => $recipientEmail]]]],
    'from'    => ['email' => 'noreply@bookswap.app'],
    'subject' => 'BookSwap — Your registration is pending approval',
    'content' => [['type' => 'text/plain', 'value' => 'Thank you for registering...']],
]);

$ch = curl_init('https://api.sendgrid.com/v3/mail/send');
curl_setopt($ch, CURLOPT_POST,           true);
curl_setopt($ch, CURLOPT_POSTFIELDS,     $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER,     ["Authorization: Bearer $apiKey", "Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_exec($ch);
curl_close($ch);
```

### OAuth 2.0 (Google / Facebook Login)

The project document lists OAuth as a feature for future implementation.
It would be added as a new endpoint in `routes/api.php`:
```
'GET /api/auth/google'          → ['AuthController', 'googleRedirect']
'GET /api/auth/google/callback' → ['AuthController', 'googleCallback']
```
and new methods in `AuthController.php` that exchange the Google auth code for a user profile, find or create the user in `users`, then issue a JWT the same way the regular login does.

---

## Step 6 — Before Going Live (Checklist)

- [ ] Replace `JWT_SECRET` in `config/constants.php` with a long random string.
      Generate one: `php -r "echo bin2hex(random_bytes(32));"`
- [ ] Set `ini_set('display_errors', 0)` in `index.php`.
- [ ] Change `Access-Control-Allow-Origin: *` in `index.php` to your Vercel URL.
- [ ] Confirm `UPLOAD_DIR` in `config/constants.php` is writable on the server.
- [ ] Test all endpoints with a tool like Postman or Insomnia.

---

## Quick Reference — Response Format

Every endpoint returns JSON in this shape:

```json
{
  "success": true,
  "message": "Human-readable message.",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "What went wrong.",
  "errors": { "field": "Specific validation message." }
}
```

## Quick Reference — Auth Header

All protected endpoints expect:
```
Authorization: Bearer <jwt_token>
```

The token is obtained from `POST /api/auth/login` and must be stored on the client (e.g., in `localStorage` by the React frontend).
