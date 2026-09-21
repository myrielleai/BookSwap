<?php

/**
 * email.php — Brevo (Sendinblue) Email Helper for BookSwap
 * ─────────────────────────────────────────────────────────────────────────────
 * All outgoing emails are sent through this file.
 *
 * SETUP:
 *   1. Sign up free at https://app.brevo.com  (no credit card needed)
 *   2. Go to: Profile → SMTP & API → API Keys → Generate a new API key
 *   3. Under Senders & IP → Senders, add & verify the email you want to send from
 *   4. Paste your key and sender email into config/constants.php
 *
 * IMPORTANT: No external library required — uses PHP's built-in cURL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../config/constants.php';

// ── Core Sender ───────────────────────────────────────────────────────────────

/**
 * Send a single email via Brevo's v3 Transactional Email API.
 *
 * @param  string $to          Recipient email address.
 * @param  string $toName      Recipient display name.
 * @param  string $subject     Email subject line.
 * @param  string $htmlBody    HTML content of the email.
 * @param  string $plainBody   Plain-text fallback content.
 * @return bool                True if accepted by Brevo (HTTP 201), false otherwise.
 */
function sendEmail(string $to, string $toName, string $subject, string $htmlBody, string $plainBody = ''): bool {
    if (!defined('BREVO_API_KEY') || BREVO_API_KEY === 'REPLACE_WITH_YOUR_BREVO_API_KEY') {
        // Email not configured — log and silently skip so the app still works.
        error_log("[BookSwap Email] Brevo API key is not configured. Skipping email to: $to");
        return false;
    }

    if (empty($plainBody)) {
        $plainBody = strip_tags($htmlBody);
    }

    // Brevo transactional email payload format.
    $payload = json_encode([
        'sender'     => ['email' => BREVO_FROM_EMAIL, 'name' => BREVO_FROM_NAME],
        'to'         => [['email' => $to, 'name' => $toName]],
        'subject'    => $subject,
        'htmlContent' => $htmlBody,
        'textContent' => $plainBody,
    ]);

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt($ch, CURLOPT_POST,           true);
    curl_setopt($ch, CURLOPT_POSTFIELDS,     $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER,     [
        'api-key: ' . BREVO_API_KEY,
        'Content-Type: application/json',
        'Accept: application/json',
        'Content-Length: ' . strlen($payload),
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT,        10); // fail fast — don't block the API response

    $responseBody = curl_exec($ch);
    $httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 201) {
        error_log("[BookSwap Email] Brevo returned HTTP $httpCode for email to $to. Body: $responseBody");
        return false;
    }

    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Email Template Functions ─────────────────────────────────────────────────
// Each function wraps sendEmail() with a specific template and subject.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sent to a new user immediately after they register.
 * Informs them their account is pending admin approval.
 */
function sendEmail_registrationPending(string $toEmail, string $toName): bool {
    $subject = 'BookSwap — Registration Received';
    $html    = emailLayout("Hi $toName, welcome to BookSwap!", "
        <p>Thank you for registering on <strong>BookSwap</strong>!</p>
        <p>Your account is currently <strong>pending Administrator approval</strong>.
           You will receive another email once your account has been reviewed.</p>
        <p>In the meantime, feel free to browse our book catalog while you wait.</p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to a user when an Admin approves (activates) their account.
 */
function sendEmail_accountApproved(string $toEmail, string $toName): bool {
    $subject = 'BookSwap — Your Account Has Been Approved!';
    $html    = emailLayout("Great news, $toName!", "
        <p>Your <strong>BookSwap</strong> account has been approved by an Administrator.</p>
        <p>You can now log in, list your books, and start exchanging!</p>
        <p style='text-align:center; margin-top:24px;'>
            <a href='" . BOOKSWAP_APP_URL . "/login'
               style='background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;'>
               Log In Now
            </a>
        </p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to a user when an Admin suspends, deactivates, or reactivates their account.
 */
function sendEmail_accountStatusChanged(string $toEmail, string $toName, string $newStatus): bool {
    $statusMessages = [
        'inactive'  => 'Your account has been <strong>deactivated</strong>. If you believe this is a mistake, please contact support.',
        'suspended' => 'Your account has been <strong>suspended</strong> due to a violation of our community guidelines. Please contact support if you have questions.',
        'active'    => 'Your account has been <strong>reactivated</strong>. You can log in and continue exchanging books!',
    ];
    $message = $statusMessages[$newStatus] ?? "Your account status has been updated to <strong>$newStatus</strong>.";
    $subject = 'BookSwap — Account Status Update';
    $html    = emailLayout("Account Update, $toName", "<p>$message</p>");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to a listing owner when staff approves, returns, or rejects their listing.
 */
function sendEmail_listingVerified(string $toEmail, string $toName, string $listingTitle, string $action, string $note = ''): bool {
    $messages = [
        'approve' => "<p>Your listing <strong>\"$listingTitle\"</strong> has been <strong>approved</strong> and is now visible in the BookSwap catalog!</p>",
        'return'  => "<p>Your listing <strong>\"$listingTitle\"</strong> has been <strong>returned for revision</strong>.</p>"
                   . ($note ? "<p><strong>Staff note:</strong> $note</p>" : ''),
        'reject'  => "<p>Your listing <strong>\"$listingTitle\"</strong> has been <strong>rejected</strong>.</p>"
                   . ($note ? "<p><strong>Reason:</strong> $note</p>" : ''),
    ];
    $titles = [
        'approve' => 'Listing Approved',
        'return'  => 'Listing Needs Revision',
        'reject'  => 'Listing Rejected',
    ];
    $subject = "BookSwap — {$titles[$action]}: $listingTitle";
    $html    = emailLayout("{$titles[$action]}", $messages[$action] ?? '');
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to a listing owner when someone sends them an exchange request.
 */
function sendEmail_exchangeRequestReceived(string $toEmail, string $toName, string $requesterName, string $targetTitle): bool {
    $subject = 'BookSwap — New Exchange Request';
    $html    = emailLayout("You have a new exchange request, $toName!", "
        <p><strong>$requesterName</strong> wants to exchange a book with you for your listing
           <strong>\"$targetTitle\"</strong>.</p>
        <p>Log in to BookSwap to review their offered book and accept or decline.</p>
        <p style='text-align:center; margin-top:24px;'>
            <a href='" . BOOKSWAP_APP_URL . "'
               style='background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;'>
               Review Request
            </a>
        </p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to the requester when the listing owner accepts their exchange request.
 */
function sendEmail_exchangeRequestAccepted(string $toEmail, string $toName, string $targetTitle): bool {
    $subject = "BookSwap — Your Exchange Request Was Accepted!";
    $html    = emailLayout("Good news, $toName!", "
        <p>The owner of <strong>\"$targetTitle\"</strong> has <strong>accepted</strong> your exchange request!</p>
        <p>A moderator will review and endorse the exchange shortly.
           You'll receive another notification once a handover is scheduled.</p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to the requester when the listing owner declines their exchange request.
 */
function sendEmail_exchangeRequestDeclined(string $toEmail, string $toName, string $targetTitle, string $reason = ''): bool {
    $subject = "BookSwap — Exchange Request Declined";
    $html    = emailLayout("Update on your exchange request", "
        <p>Unfortunately, the owner of <strong>\"$targetTitle\"</strong> has <strong>declined</strong> your exchange request.</p>
        " . ($reason ? "<p><strong>Reason:</strong> $reason</p>" : '') . "
        <p>Don't worry — there are plenty more books in the catalog!</p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to both parties when staff endorses an exchange and a transaction is created.
 */
function sendEmail_requestEndorsed(string $toEmail, string $toName): bool {
    $subject = "BookSwap — Exchange Endorsed by Moderator";
    $html    = emailLayout("Your exchange has been endorsed, $toName!", "
        <p>A BookSwap moderator has <strong>endorsed</strong> your exchange.
           A transaction has been created and will be reviewed for final approval shortly.</p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to both parties when a handover slot is scheduled or rescheduled.
 */
function sendEmail_handoverScheduled(
    string $toEmail,
    string $toName,
    string $location,
    string $date,
    string $time,
    bool   $isReschedule = false
): bool {
    $verb    = $isReschedule ? 'Rescheduled' : 'Scheduled';
    $subject = "BookSwap — Handover $verb";
    $html    = emailLayout("Handover $verb, $toName!", "
        <p>Your book exchange handover has been <strong>" . strtolower($verb) . "</strong>:</p>
        <table style='margin:16px 0; border-collapse:collapse; width:100%;'>
            <tr>
                <td style='padding:8px; font-weight:600; width:120px;'>Location</td>
                <td style='padding:8px;'>$location</td>
            </tr>
            <tr style='background:#f9fafb;'>
                <td style='padding:8px; font-weight:600;'>Date</td>
                <td style='padding:8px;'>$date</td>
            </tr>
            <tr>
                <td style='padding:8px; font-weight:600;'>Time</td>
                <td style='padding:8px;'>$time</td>
            </tr>
        </table>
        <p>Please make sure to bring the book listed in your exchange. After the handover,
           log in to BookSwap to confirm receipt.</p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

/**
 * Sent to both parties if a no-show is recorded and the transaction is cancelled.
 */
function sendEmail_noShowRecorded(string $toEmail, string $toName): bool {
    $subject = "BookSwap — Handover No-Show Recorded";
    $html    = emailLayout("No-show recorded, $toName", "
        <p>A moderator has recorded a <strong>no-show</strong> for your scheduled handover.</p>
        <p>The transaction has been cancelled and your listing has been returned to available status.</p>
        <p>If you believe this was recorded in error, please contact BookSwap support.</p>
    ");
    return sendEmail($toEmail, $toName, $subject, $html);
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Internal: HTML Layout ────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps content in a branded HTML email layout.
 *
 * @param  string $heading  Bold heading shown at the top of the email body.
 * @param  string $body     HTML body content.
 * @return string           Complete HTML email string.
 */
function emailLayout(string $heading, string $body): string {
    $appUrl = defined('BOOKSWAP_APP_URL') ? BOOKSWAP_APP_URL : '#';
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BookSwap</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.08); max-width:600px;">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%); padding:32px 40px; text-align:center;">
                            <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;">BookSwap</h1>
                            <p style="margin:6px 0 0; color:rgba(255,255,255,0.8); font-size:14px;">Exchange books, share stories</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <h2 style="margin:0 0 16px; font-size:20px; font-weight:600; color:#111827;">$heading</h2>
                            <div style="color:#374151; font-size:15px; line-height:1.6;">
                                $body
                            </div>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background:#f9fafb; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
                            <p style="margin:0; color:#9ca3af; font-size:12px;">
                                You're receiving this email because you have an account on BookSwap.<br>
                                &copy; 2025 BookSwap. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
}
