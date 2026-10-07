# BookSwap — Remaining Tasks

Gaps found by cross-checking the code against the Phase 1–4 documents (Oct 7, 2026).

**Already done (don't redo):** Accept button fix, safe config defaults, hidden server version header,
approval / exchange-request / handover emails, Reader "Report Issue", Reader "Deactivate Account",
Admin "Reset Password", Cloudflare Turnstile bot protection (frontend widget + backend verify),
HaveIBeenPwned password breach check on register, Google Auth buttons removed (design decision),
Sign-in/Register unified onto the homepage hero card, `/login` and `/register` redirect to `/`.

**Before you start**

- Pull the latest `main`.
- Local setup: React on port 3000 (`npm run dev`) + PHP API on port 8765 (`npm run backend`) + XAMPP MariaDB.
  If you run the API through XAMPP **Apache** instead, copy `backend/config/local.example.php` to
  `local.php` and set a 64-char `JWT_SECRET` (`php -r "echo bin2hex(random_bytes(32));"`), or login is refused.
- Every backend endpoint below already exists unless marked **NEW**. Most tasks only need a button/form in React.
  The matching function is in `src/services/api.js`.
- Sample accounts (`backend/database/seed.sql`) use the password `Password123!`.

---

## A. Connect existing backend features to the UI

| # | Phase 1 | Task | Page to edit | API (already in `api.js`) |
|---|---|---|---|---|
| A2 | §3.3.2 | **Edit listing** while it is `unverified` or `returned`. Add an Edit button on the reader's own listings, then reuse the Add Listing form pre-filled. | `UserDashboard.jsx` (My Listings), `AddListing.jsx` | `listingService.updateListing(id, data)` → `PUT /api/listings/{id}` |
| A4 | §3.2.4 | **Reschedule handover**, once per transaction. Show the button only for `scheduled` transactions with `reschedule_count = 0`, and pick a new slot like Schedule does. | `StaffDashboard.jsx` | `staffService.rescheduleHandover(id, { slot_id })` |
| A5 | §3.2.2 | **Request monitoring**: a read-only list of exchange requests with a status filter. Staff only watch requests; they don't approve them. | `StaffDashboard.jsx` (new tab) | `staffService.getRequests({ status })` → `GET /api/staff/requests` |
| A6 | §3.2.6 | **Idle listings** and an **items processed** count on the staff dashboard. The data is already in the response, just not shown. | `StaffDashboard.jsx` | `GET /api/staff/dashboard` → `data.idle_listings`, `data.counts.idle_listings`, `data.counts.items_processed_by_you` |
| A8 | §3.1.3 | **Formats** and **Age categories**: add/retire forms, copied from the existing Genres form. | `AdminDashboard.jsx` (Taxonomies tab) | `adminService.createFormat`, `retireFormat`, `createAgeCategory`, `retireAgeCategory` |
| A9 | §3.1.5 | **Participation by age group** report, next to the existing "by city" report. | `AdminDashboard.jsx` (Reports tab) | `adminService.getByAgeGroupReport({ from, to })` |

**Done when:** each button works end to end, and backend error messages show inside the form, not as a generic popup.

## B. Missing features (no backend yet unless noted)

| # | Phase 1 | Task | Notes |
|---|---|---|---|
| C1 | §3.1.6 | **Announcements / exchange policy / community guidelines**: the Admin writes them and the landing page shows them. | **NEW**: an `announcements` table (id, type, title, body, is_active, created_by, created_at), `GET /api/announcements` (public) and `POST`/`PUT /api/admin/announcements`, plus an Admin form and a landing-page section. Log admin changes with `ReportModel->logActivity()`. Add the table to `schema.sql` **and** `initSqliteDatabase()` in `database.php`. |
| C2 | §3.1.5 | **Printable report export.** | Simplest: a "Print report" button on the Reports tab that calls `window.print()`, plus `@media print` CSS that hides the sidebar and navbar. |
| C3 | §3.1.4 | **Admin corrects records + archives at the end of a period.** | **NEW**: `PUT /api/admin/listings/{id}` (fix genre, format, age category or condition) and `POST /api/admin/archive` (archive `available` listings older than a date). Both are logged to the activity log. |
| C4 | §3.2.1 | **Staff flags a policy violation** (pirated or unauthorized copy). | Option: a "Flag as violation" action that rejects the listing with a preset note **and** files an `inappropriate_listing` report, so it shows up for escalation. |
| ~~C5~~ | Tech stack | ~~**Google sign-in.**~~ | **Removed by design decision.** Google Auth buttons were intentionally taken out — auth is now handled entirely through the homepage sign-in card. The backend endpoint (`POST /api/auth/google`) still exists but is unused. Facebook login was never built. Update Phase 1 §6 to remove both from the tech stack description. |

## C. Security follow-ups

| # | Task | Where |
|---|---|---|
| S1 | **Turnstile can be skipped**: the backend only verifies it when a `turnstile_token` is sent. Make the token **required** on login and register, while keeping local dev working (local dev uses Cloudflare's test keys, which always pass). | `AuthController.php`, the `if (isset($body['turnstile_token']))` blocks (~line 62 and ~155) |
| S2 | Turnstile **lets requests through** when Cloudflare can't be reached. Current behavior: fail open (request proceeds). Decide whether to block instead — safer for prod, but risks false-positive lockouts if Cloudflare is down. | `helpers/turnstile.php` |
| S3 | **Mock API still public** at `bookswap-eta.vercel.app/api/*` and accepts any password. The site doesn't use it anymore. Delete `api/index.js` and `mock-backend.cjs`, and remove the `/api/(.*)` rewrite in `vercel.json`. | repo root |
| S4 | Demo Quick Fill on the sign-in card exposes the admin login on the live site. **Kept on purpose for the class demo**; remove it or change the sample passwords on Aiven after the demo. | `HeroAuthCard.jsx` |

## D. Document corrections (if resubmitting)

| Doc | Change |
|---|---|
| Phase 1 §6 | Hosting: InfinityFree → **Render (backend, Docker) + Aiven (MySQL)**. CSS: Tailwind/Bootstrap → **Vanilla CSS**. PHP Sessions → JWT + `user_sessions` table. OAuth: remove Google/Facebook — auth is now email/password only via the homepage sign-in card. |
| Phase 2 §2 | **17 tables + 2 from migrations** (genres, formats, age_categories are separate; add reports, login_attempts, user_sessions, email_log, book_lookup_cache…). |
| Phase 2 §2 / §6.3 | States: request = pending/accepted/declined/rejected/withdrawn/cancelled; transaction = accepted/scheduled/completed/cancelled. **No "endorsed", "held", "approved".** Remove the endorsement and approval steps from the verified journey. |
| Phase 2 §3 / §6 | **24 FKs, 73 routes, 10 controllers, 13 models.** |
| Phase 3 | Emails now sent: registration, approval, exchange request, handover schedule (+ reschedule). The sample JSON uses `cover_photo_id`, not `photo_url`. Login/Register are now the home-page sign-in card. |
| Phase 4 | F-14: lock is **15 minutes**, not 1. §6 says "11 bugs total" but the table total says 3; make them agree. BUG-11 has no figure. C/D tests: `/login` now redirects to `/`. F-07 (Accept) was broken after testing and has been fixed since. |

## E. Not wired (declare only, no action needed)

Email templates that exist but are never sent: listing verified, request accepted/declined, no-show recorded,
account deactivated/suspended. Extras beyond the docs: Cloudflare Turnstile, HaveIBeenPwned password check,
Open Library ISBN lookup, login throttling, SQLite fallback.

---

## Deploying your changes

1. Push to `main`. **Vercel** (frontend) redeploys automatically.
2. **Render** (backend) does **not**: Render dashboard → `bookswap-api` → **Manual Deploy → Deploy latest commit**.
3. A new database table (C1, C3) must also be created on **Aiven**: run the `CREATE TABLE` with the MySQL 8 client.
   - The XAMPP client is too old for Aiven's login method.
   - Mapúa Wi-Fi blocks Aiven's port, so use a phone hotspot.
4. Live URLs:
   - Frontend: https://bookswap-eta.vercel.app
   - API: https://bookswap-api-6z0y.onrender.com/api. The first request after 15 idle minutes takes about 30 seconds.
