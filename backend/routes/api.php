<?php

/**
 * api.php — Central Router for BookSwap
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps incoming HTTP method + URL path to the correct controller method.
 *
 * HOW ROUTING WORKS:
 *   1. index.php receives every request (via .htaccess rewrite rules).
 *   2. index.php calls routeRequest() defined here.
 *   3. This file matches the method and path, then calls the right controller.
 *   4. If no route matches, a 404 JSON response is sent.
 *
 * ADDING A NEW ROUTE:
 *   Add a new entry inside the $routes array below.
 *   Format: 'METHOD /path' => ['ControllerClass', 'methodName']
 *   For dynamic segments (like {id}), they are extracted from the path
 *   and passed as the first argument to the controller method.
 *
 * EXAMPLE:
 *   'GET /api/listings/{id}' => ['ListingController', 'show']
 *   → calls (new ListingController())->show($id)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/AdminController.php';
require_once __DIR__ . '/../controllers/StaffController.php';
require_once __DIR__ . '/../controllers/UserController.php';
require_once __DIR__ . '/../controllers/ListingController.php';
require_once __DIR__ . '/../controllers/ExchangeController.php';
require_once __DIR__ . '/../controllers/TransactionController.php';
require_once __DIR__ . '/../controllers/CategoryController.php';
require_once __DIR__ . '/../helpers/response.php';

// ── Route Table ───────────────────────────────────────────────────────────────
// Format: 'METHOD /api/path'     → ['Controller', 'method']
//         'METHOD /api/path/{id}'→ ['Controller', 'method']  ← {id} auto-extracted
$routes = [

    // ── Auth ──────────────────────────────────────────────────────────────────
    'POST /api/auth/register' => ['AuthController', 'register'],
    'POST /api/auth/login'    => ['AuthController', 'login'],
    'POST /api/auth/logout'   => ['AuthController', 'logout'],

    // ── Public Catalog (no auth) ──────────────────────────────────────────────
    'GET  /api/listings'       => ['ListingController', 'index'],
    'GET  /api/listings/{id}'  => ['ListingController', 'show'],
    'GET  /api/photos/{id}'    => ['ListingController', 'photo'],

    // ── Public Taxonomy (no auth) ─────────────────────────────────────────────
    'GET  /api/genres'            => ['CategoryController', 'listGenres'],
    'GET  /api/formats'           => ['CategoryController', 'listFormats'],
    'GET  /api/age-categories'    => ['CategoryController', 'listAgeCategories'],
    'GET  /api/conditions'        => ['CategoryController', 'listConditions'],
    'GET  /api/meetup-locations'  => ['CategoryController', 'listMeetupLocations'],

    // ── Member: Profile, Dashboard, Account ───────────────────────────────────
    'GET  /api/user/profile'     => ['UserController', 'getProfile'],
    'PUT  /api/user/profile'     => ['UserController', 'updateProfile'],
    'GET  /api/user/dashboard'   => ['UserController', 'dashboard'],
    'PUT  /api/user/deactivate'  => ['UserController', 'deactivateAccount'],

    // ── Member: Notifications ─────────────────────────────────────────────────
    'GET  /api/user/notifications'            => ['UserController', 'getNotifications'],
    'PUT  /api/user/notifications/{id}/read'  => ['UserController', 'markNotificationRead'],
    'PUT  /api/user/notifications/read-all'   => ['UserController', 'markAllNotificationsRead'],

    // ── Member: Listings & Watchlist ──────────────────────────────────────────
    'POST   /api/listings'                 => ['ListingController', 'create'],
    'PUT    /api/listings/{id}'            => ['ListingController', 'update'],
    'DELETE /api/listings/{id}'            => ['ListingController', 'withdraw'],
    'POST   /api/listings/{id}/watchlist'  => ['ListingController', 'addToWatchlist'],
    'DELETE /api/listings/{id}/watchlist'  => ['ListingController', 'removeFromWatchlist'],
    'GET    /api/user/watchlist'           => ['ListingController', 'getWatchlist'],

    // ── Member: Exchange Requests (decided by the listing owner) ──────────────
    'POST /api/exchanges'                => ['ExchangeController', 'sendRequest'],
    'GET  /api/exchanges/{id}'           => ['ExchangeController', 'show'],
    'PUT  /api/exchanges/{id}/accept'    => ['ExchangeController', 'acceptRequest'],
    'PUT  /api/exchanges/{id}/decline'   => ['ExchangeController', 'declineRequest'],
    'PUT  /api/exchanges/{id}/withdraw'  => ['ExchangeController', 'withdrawRequest'],

    // ── Member: Transactions & Reports ────────────────────────────────────────
    'GET  /api/transactions/{id}'          => ['TransactionController', 'show'],
    'PUT  /api/transactions/{id}/confirm'  => ['TransactionController', 'confirmReceipt'],
    'POST /api/reports'                    => ['UserController', 'fileReport'],

    // ── Staff: Moderation ─────────────────────────────────────────────────────
    'GET  /api/staff/dashboard'                     => ['StaffController', 'dashboard'],
    'PUT  /api/staff/listings/{id}/verify'          => ['StaffController', 'verifyListing'],
    'GET  /api/staff/requests'                      => ['StaffController', 'listRequests'],
    'GET  /api/staff/transactions'                  => ['StaffController', 'listTransactions'],
    'POST /api/staff/transactions/{id}/schedule'    => ['StaffController', 'scheduleHandover'],
    'PUT  /api/staff/transactions/{id}/reschedule'  => ['StaffController', 'rescheduleHandover'],
    'PUT  /api/staff/transactions/{id}/status'      => ['StaffController', 'updateTransactionStatus'],
    'PUT  /api/staff/transactions/{id}/no-show'     => ['StaffController', 'recordNoShow'],
    'GET  /api/staff/reports'                       => ['StaffController', 'listReports'],
    'PUT  /api/staff/reports/{id}'                  => ['StaffController', 'resolveReport'],
    'GET  /api/staff/handover-slots'                => ['CategoryController', 'listAvailableSlots'],

    // ── Admin: User Management ────────────────────────────────────────────────
    'GET  /api/admin/users'                      => ['AdminController', 'listUsers'],
    'PUT  /api/admin/users/{id}/status'          => ['AdminController', 'updateUserStatus'],
    'PUT  /api/admin/users/{id}/role'            => ['AdminController', 'updateUserRole'],
    'POST /api/admin/users/{id}/reset-password'  => ['AdminController', 'resetPassword'],

    // ── Admin: Dashboard, Reports, Audit ──────────────────────────────────────
    'GET /api/admin/dashboard'           => ['AdminController', 'dashboard'],
    'GET /api/admin/reports/summary'     => ['AdminController', 'reportSummary'],
    'GET /api/admin/reports/genres'      => ['AdminController', 'reportTopGenres'],
    'GET /api/admin/reports/cities'      => ['AdminController', 'reportByCity'],
    'GET /api/admin/reports/age-groups'  => ['AdminController', 'reportByAgeGroup'],
    'GET /api/admin/activity-log'        => ['AdminController', 'activityLog'],

    // ── Admin: Taxonomy & Reference Data ──────────────────────────────────────
    'POST /api/admin/genres'                        => ['CategoryController', 'createGenre'],
    'PUT  /api/admin/genres/{id}/retire'            => ['CategoryController', 'retireGenre'],
    'POST /api/admin/formats'                       => ['CategoryController', 'createFormat'],
    'PUT  /api/admin/formats/{id}/retire'           => ['CategoryController', 'retireFormat'],
    'POST /api/admin/age-categories'                => ['CategoryController', 'createAgeCategory'],
    'PUT  /api/admin/age-categories/{id}/retire'    => ['CategoryController', 'retireAgeCategory'],
    'POST /api/admin/conditions'                    => ['CategoryController', 'createCondition'],
    'PUT  /api/admin/conditions/{id}/retire'        => ['CategoryController', 'retireCondition'],
    'POST /api/admin/meetup-locations'              => ['CategoryController', 'createMeetupLocation'],
    'PUT  /api/admin/meetup-locations/{id}/retire'  => ['CategoryController', 'retireMeetupLocation'],

    // ── Admin: Handover Slot Pool ─────────────────────────────────────────────
    'GET  /api/admin/handover-slots'              => ['CategoryController', 'listSlots'],
    'POST /api/admin/handover-slots'              => ['CategoryController', 'createSlot'],
    'PUT  /api/admin/handover-slots/{id}/retire'  => ['CategoryController', 'retireSlot'],
];

// ── Router ────────────────────────────────────────────────────────────────────

/**
 * Match the current request against the route table and dispatch it.
 * Called once from index.php.
 */
function routeRequest(): void {
    global $routes;

    $method = strtoupper(trim($_SERVER['REQUEST_METHOD']));
    $path   = strtok($_SERVER['REQUEST_URI'], '?'); // strip query string

    // Work below the web root too (http://host/bookswap/backend/api/...): drop
    // the folder that holds index.php so routes always start at /api.
    $basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    if ($basePath !== '' && strpos($path, $basePath . '/') === 0) {
        $path = substr($path, strlen($basePath));
    }

    $path = rtrim($path, '/') ?: '/';               // normalize trailing slash

    foreach ($routes as $route => $handler) {
        // Normalize spaces in the route key (allows multi-space alignment above).
        $parts       = preg_split('/\s+/', trim($route), 2);
        $routeMethod = strtoupper($parts[0]);
        $routePath   = $parts[1];

        if ($routeMethod !== $method) {
            continue; // wrong HTTP method
        }

        // Convert route pattern like /api/listings/{id} to a regex.
        $pattern = preg_replace('/\{[^}]+\}/', '(\d+)', $routePath);
        $pattern = '@^' . $pattern . '$@';

        if (preg_match($pattern, $path, $matches)) {
            // $matches[0] = full path, $matches[1] = first {id} if present.
            $idParam = isset($matches[1]) ? (int) $matches[1] : null;

            [$controllerClass, $methodName] = $handler;
            $controller = new $controllerClass();

            // Call the controller method with or without the ID parameter.
            if ($idParam !== null) {
                $controller->$methodName($idParam);
            } else {
                $controller->$methodName();
            }
            return;
        }
    }

    // No route matched.
    sendError('Endpoint not found.', 404);
}
