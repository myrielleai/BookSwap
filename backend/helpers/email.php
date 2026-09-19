<?php

/**
 * email.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Transactional email helper for BookSwap.
 *
 * Dual-mode delivery:
 *   1. Attempts PHP's built-in mail() if a mail server is configured.
 *   2. Always logs every email to the email_log table so the system has a
 *      complete, auditable record regardless of delivery success.
 *
 * For production with a service like SendGrid or Mailgun, replace the
 * attemptSendMail() function body with the appropriate API call.
 *
 * USAGE:
 *   sendBookSwapEmail('user@example.com', 'Welcome!', 'Your account is pending.');
 *   sendRegistrationEmail($userEmail, $userName);
 *   sendListingVerifiedEmail($userEmail, $userName, $bookTitle, 'approved', $note);
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/database.php';

// ── Settings ──────────────────────────────────────────────────────────────────
defined('MAIL_FROM_ADDRESS') || define('MAIL_FROM_ADDRESS', 'noreply@bookswap.test');
defined('MAIL_FROM_NAME')    || define('MAIL_FROM_NAME', 'BookSwap Platform');
defined('MAIL_ENABLED')      || define('MAIL_ENABLED', true);

// ── Core Send Function ───────────────────────────────────────────────────────

/**
 * Send a transactional email and log it.
 *
 * @param string $to      Recipient email.
 * @param string $subject Email subject line.
 * @param string $body    Plain-text email body.
 * @return bool True if mail() succeeded or logging completed.
 */
function sendBookSwapEmail(string $to, string $subject, string $body): bool {
    $status   = 'skipped';
    $errorMsg = null;

    if (MAIL_ENABLED) {
        try {
            $sent = attemptSendMail($to, $subject, $body);
            $status = $sent ? 'sent' : 'failed';
            if (!$sent) {
                $errorMsg = 'mail() returned false';
            }
        } catch (Throwable $e) {
            $status   = 'failed';
            $errorMsg = substr($e->getMessage(), 0, 500);
        }
    }

    // Always log the email attempt
    logEmail($to, $subject, $body, $status, $errorMsg);

    return $status === 'sent';
}

/**
 * Attempt to send an email using PHP's built-in mail().
 * Replace this function body with an API call (SendGrid, Mailgun, etc.)
 * for production use.
 */
function attemptSendMail(string $to, string $subject, string $body): bool {
    $headers  = "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_ADDRESS . ">\r\n";
    $headers .= "Reply-To: " . MAIL_FROM_ADDRESS . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Mailer: BookSwap/1.0\r\n";

    return @mail($to, $subject, $body, $headers);
}

/**
 * Record an email in the email_log table.
 */
function logEmail(string $to, string $subject, string $body, string $status, ?string $errorMsg): void {
    try {
        runQuery("
            INSERT INTO email_log (recipient, subject, body_text, status, error_msg, created_at)
            VALUES (:recipient, :subject, :body_text, :status, :error_msg, NOW())
        ", [
            ':recipient' => $to,
            ':subject'   => $subject,
            ':body_text' => $body,
            ':status'    => $status,
            ':error_msg' => $errorMsg,
        ]);
    } catch (Throwable $e) {
        error_log('[BookSwap Email Log Error] ' . $e->getMessage());
    }
}

// ── Template Functions ────────────────────────────────────────────────────────

/**
 * Email sent after registration (Phase 1 §3.3.1).
 */
function sendRegistrationEmail(string $email, string $name): void {
    $subject = 'Welcome to BookSwap — Registration Received';
    $body = <<<EOT
Hi $name,

Thank you for registering on BookSwap!

Your account has been created and is currently pending Administrator approval.
Once your identity has been verified, you'll receive another email confirming
that your account is active and ready to use.

In the meantime, feel free to browse the book catalog.

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when an Administrator approves a pending account.
 */
function sendAccountApprovedEmail(string $email, string $name): void {
    $subject = 'BookSwap — Your Account Has Been Approved!';
    $body = <<<EOT
Hi $name,

Great news! Your BookSwap account has been approved by an Administrator.

You can now sign in and start listing books, browsing the catalog, and
sending exchange requests to fellow bookworms.

Sign in at: http://localhost:3000/login

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when an Administrator deactivates or suspends an account.
 */
function sendAccountDeactivatedEmail(string $email, string $name, string $newStatus): void {
    $statusLabel = $newStatus === 'suspended' ? 'suspended' : 'deactivated';
    $subject = "BookSwap — Your Account Has Been " . ucfirst($statusLabel);
    $body = <<<EOT
Hi $name,

Your BookSwap account has been $statusLabel by an Administrator.

If you believe this was in error, please contact the platform support team
for assistance.

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when an Administrator resets a user's password.
 */
function sendPasswordResetEmail(string $email, string $name): void {
    $subject = 'BookSwap — Your Password Has Been Reset';
    $body = <<<EOT
Hi $name,

Your BookSwap password has been reset by an Administrator.

Please sign in with your new password. If you did not request this change,
contact the platform support team immediately.

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when Staff verifies a listing (approved, returned, or rejected).
 */
function sendListingVerifiedEmail(string $email, string $name, string $bookTitle, string $status, ?string $staffNote = null): void {
    $statusLabel = match($status) {
        'available' => 'Approved',
        'returned'  => 'Returned for Revision',
        'rejected'  => 'Rejected',
        default     => ucfirst($status),
    };

    $subject = "BookSwap — Your Listing \"$bookTitle\" Has Been $statusLabel";

    $noteSection = '';
    if ($staffNote) {
        $noteSection = "\nModerator's note:\n\"$staffNote\"\n";
    }

    $body = <<<EOT
Hi $name,

Your book listing "$bookTitle" has been reviewed by a moderator.

Status: $statusLabel
$noteSection
Sign in to your dashboard to view the details.

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when an exchange request is accepted.
 */
function sendExchangeAcceptedEmail(string $email, string $name, string $bookTitle): void {
    $subject = "BookSwap — Your Exchange Request for \"$bookTitle\" Was Accepted!";
    $body = <<<EOT
Hi $name,

Your exchange request for "$bookTitle" has been accepted by the listing owner!

A moderator will now schedule a handover time and location. You'll receive
another notification once the handover has been scheduled.

Check your dashboard for details.

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when a handover is scheduled.
 */
function sendHandoverScheduledEmail(string $email, string $name, string $bookTitle, string $location, string $date, string $time): void {
    $subject = "BookSwap — Handover Scheduled for \"$bookTitle\"";
    $body = <<<EOT
Hi $name,

A handover has been scheduled for your book exchange involving "$bookTitle".

Location: $location
Date: $date
Time: $time

Please arrive on time. If you need to reschedule, contact the moderator
through your dashboard (one reschedule allowed per transaction).

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}

/**
 * Email sent when a watched listing becomes available (Phase 1 §3.3.3).
 */
function sendWatchlistAvailableEmail(string $email, string $name, string $bookTitle): void {
    $subject = "BookSwap — A Book on Your Watchlist Is Available: \"$bookTitle\"";
    $body = <<<EOT
Hi $name,

Good news! A book on your watchlist is now available:

"$bookTitle"

Sign in to view the listing and send an exchange request before
someone else does!

— The BookSwap Team
EOT;
    sendBookSwapEmail($email, $subject, $body);
}
