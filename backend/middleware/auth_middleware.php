<?php

/**
 * auth_middleware.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication, session checks, and role-based access control for BookSwap.
 *
 * Every protected request passes three checks before a controller runs:
 *   1. The JWT signature and expiry are valid.
 *   2. The token's session in user_sessions exists, has not expired, and has
 *      not been revoked (logout, deactivation, role change, password reset).
 *   3. The account is still active.
 *
 * The role used for access checks is read from the database, not the token,
 * so promoting or demoting a user takes effect immediately.
 *
 * USAGE:
 *   $authUser = requireAuth();                        // any signed-in user
 *   $authUser = requireAuth(ROLE_ADMIN);              // one role
 *   $authUser = requireAuth([ROLE_ADMIN, ROLE_STAFF]); // several roles
 *
 *   // $authUser['sub']  → user ID (int)
 *   // $authUser['role'] → role string
 *   // $authUser['jti']  → token ID of the current session
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../models/SessionModel.php';

/**
 * Require a signed-in user with an active session, optionally of a given role.
 *
 * @param string|array|null $requiredRole  A single role constant, an array of
 *                                         allowed roles, or null to allow any
 *                                         authenticated user.
 * @return array  Keys: sub (user ID), role, jti.
 */
function requireAuth($requiredRole = null): array {
    // Step 1: Extract the token from the Authorization header.
    $token = getBearerToken();

    if ($token === null) {
        sendUnauthorized('Authentication token missing. Please log in.');
    }

    // Steps 2–3: Validate the token, its session, and the account.
    $authUser = authenticateToken($token);

    if ($authUser === null) {
        sendUnauthorized('Your session is invalid or has ended. Please log in again.');
    }

    // Step 4: If a required role is specified, enforce it.
    if ($requiredRole !== null) {
        $allowedRoles = is_array($requiredRole) ? $requiredRole : [$requiredRole];

        if (!in_array($authUser['role'], $allowedRoles, true)) {
            sendForbidden(
                'You do not have permission to perform this action. ' .
                'Required role: ' . implode(' or ', $allowedRoles) . '.'
            );
        }
    }

    return $authUser;
}

/**
 * Identify the caller if they sent a valid token, without requiring one.
 * Public endpoints use this to personalise results, such as sorting the
 * catalogue by the member's favourite genres.
 *
 * @return array|null Same shape as requireAuth(), or null for anonymous callers.
 */
function optionalAuth(): ?array {
    $token = getBearerToken();
    return $token === null ? null : authenticateToken($token);
}

/**
 * Check a token's signature, its session, and the account behind it.
 *
 * @param string $token Raw JWT.
 * @return array|null Keys: sub, role, jti. Null if any check fails.
 */
function authenticateToken(string $token): ?array {
    $claims = validateJWT($token);
    if ($claims === null) {
        return null;
    }

    $sessions = new SessionModel();
    $session  = $sessions->findActive($claims['jti']);

    if (
        $session === null
        || $session['user_status'] !== ACCOUNT_ACTIVE
        || (int) $session['user_id'] !== (int) $claims['sub']
    ) {
        return null;
    }

    $sessions->touch((int) $session['id']);

    return [
        'sub'  => (int) $session['user_id'],
        'role' => $session['user_role'],
        'jti'  => $claims['jti'],
    ];
}

/**
 * Prevent a moderator from acting on a listing or exchange they are part of.
 *
 * The rule (Phase 1 §4.5, Role Separation Rules):
 *   "The system blocks a Staff member from verifying, scheduling, or
 *    completing any transaction in which they are a party."
 *
 * @param int   $staffUserId The acting Staff or Admin user's ID.
 * @param array $parties     User IDs involved (listing owner, requester).
 */
function blockStaffSelfTransaction(int $staffUserId, array $parties): void {
    if (in_array($staffUserId, array_map('intval', $parties), true)) {
        sendForbidden('Staff members cannot process a listing or exchange in which they are a party.');
    }
}
