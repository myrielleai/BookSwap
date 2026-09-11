<?php

/**
 * auth_middleware.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-based access control middleware for BookSwap.
 *
 * Every controller that requires authentication calls requireAuth() at the top.
 * The function returns the decoded JWT payload so the controller knows which
 * user is making the request and what role they hold.
 *
 * USAGE:
 *   // Require any authenticated user:
 *   $authUser = requireAuth();
 *
 *   // Require a specific role:
 *   $authUser = requireAuth(ROLE_ADMIN);
 *
 *   // Require one of several roles:
 *   $authUser = requireAuth([ROLE_ADMIN, ROLE_STAFF]);
 *
 *   // After calling requireAuth(), $authUser has:
 *   //   $authUser['sub']  → user ID (int)
 *   //   $authUser['role'] → role string (ROLE_ADMIN | ROLE_STAFF | ROLE_CUSTOMER)
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../config/constants.php';

/**
 * Verify the Bearer JWT and optionally enforce a required role.
 *
 * @param string|array|null $requiredRole  A single role constant, an array of
 *                                         allowed roles, or null to allow any
 *                                         authenticated user.
 * @return array  The decoded JWT payload containing 'sub' (user ID) and 'role'.
 */
function requireAuth($requiredRole = null): array {
    // Step 1: Extract the token from the Authorization header.
    $token = getBearerToken();

    if ($token === null) {
        sendUnauthorized('Authentication token missing. Please log in.');
    }

    // Step 2: Validate the token signature and expiry.
    $payload = validateJWT($token);

    if ($payload === null) {
        sendUnauthorized('Invalid or expired token. Please log in again.');
    }

    // Step 3: If a required role is specified, enforce it.
    if ($requiredRole !== null) {
        $allowedRoles = is_array($requiredRole) ? $requiredRole : [$requiredRole];

        if (!in_array($payload['role'], $allowedRoles, true)) {
            sendForbidden(
                'You do not have permission to perform this action. ' .
                'Required role: ' . implode(' or ', $allowedRoles) . '.'
            );
        }
    }

    // Return the payload so the controller can use the user's ID and role.
    return $payload;
}

/**
 * Prevent a Staff member from acting on a transaction they are personally
 * involved in. Called inside Staff controller methods.
 *
 * The rule (from the project document, Role Separation Rules):
 *   "The system blocks a Staff member from verifying, endorsing, or completing
 *    any transaction in which they are a party."
 *
 * @param int   $staffUserId        The logged-in Staff member's user ID.
 * @param array $transactionParties Array of user IDs involved in the transaction
 *                                  (requester + listing owner).
 */
function blockStaffSelfTransaction(int $staffUserId, array $transactionParties): void {
    if (in_array($staffUserId, $transactionParties, true)) {
        sendForbidden(
            'Staff members cannot process transactions in which they are a party.'
        );
    }
}
