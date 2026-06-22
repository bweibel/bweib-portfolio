<?php
/*
 * Contact form mail handler.
 *
 * The site is a static Astro build; this PHP file is copied into the deploy
 * root and executed by Hostinger. The recipient address lives ONLY here (and in
 * the off-webroot secrets file), so it is never present in the served HTML/JS
 * where scrapers could grab it.
 *
 * Mail is sent through Google Workspace SMTP (authenticated submission), NOT
 * PHP mail(). bweib.com's email lives on Google, so sending via Google means
 * the message is SPF- and DKIM-aligned and lands in the inbox. Sending from
 * Hostinger's local MTA would fail both and get spam-filtered.
 *
 * SMTP credentials are loaded from mail-secrets.php (see $SECRETS_PATH). On this
 * host the dir above the web root isn't writable, so the file lives IN the web
 * root but is kept safe three ways: it's denied by the root .htaccess, it only
 * `return`s an array (executing it emits nothing even if served raw), and the
 * deploy's rsync excludes it so --delete can't wipe it. It is gitignored.
 *
 * Front-end posts here via fetch() and expects JSON. Without JS the browser
 * navigates here with a normal form POST, so we also emit a minimal HTML page
 * as a fallback (chosen by the Accept header).
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

// --- Config ---------------------------------------------------------------
// Credentials + addresses live outside the web root. See docs/SPEC.md for the
// file's shape. Lives directly in the web root (the dir above isn't writable on
// this host); protected by the root .htaccess + rsync --exclude.
$SECRETS_PATH = __DIR__ . '/mail-secrets.php';

$MAX_NAME    = 100;
$MAX_EMAIL   = 254;
$MAX_MESSAGE = 5000;

// Does the caller want JSON (fetch) or an HTML page (no-JS form post)?
$wantsJson = isset($_SERVER['HTTP_ACCEPT'])
    && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false;

/** Send a response in the format the caller expects, then exit. */
function respond(bool $ok, int $status, string $message): void
{
    global $wantsJson;
    http_response_code($status);

    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message]);
        exit;
    }

    // Plain HTML fallback for no-JS submissions.
    header('Content-Type: text/html; charset=utf-8');
    $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo "<!doctype html><meta charset=utf-8><title>Contact</title>"
        . "<p>{$safe}</p><p><a href=\"/#contact\">Back</a></p>";
    exit;
}

// --- Method guard ---------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    respond(false, 405, 'Method not allowed.');
}

// --- Read + trim inputs ---------------------------------------------------
$name    = trim($_POST['name'] ?? '');
$email   = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');
$honey   = trim($_POST['company'] ?? ''); // honeypot: humans never see it

// --- Spam guard: honeypot filled => pretend success, send nothing ---------
if ($honey !== '') {
    respond(true, 200, 'Thanks — your message has been sent.');
}

// --- Validation -----------------------------------------------------------
if ($name === '' || $email === '' || $message === '') {
    respond(false, 422, 'Please fill in your name, email, and message.');
}
if (mb_strlen($name) > $MAX_NAME
    || mb_strlen($email) > $MAX_EMAIL
    || mb_strlen($message) > $MAX_MESSAGE) {
    respond(false, 422, 'One of the fields is too long.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 422, 'Please enter a valid email address.');
}

// --- Load SMTP config -----------------------------------------------------
if (!is_file($SECRETS_PATH)) {
    error_log("contact.php: secrets file missing at {$SECRETS_PATH}");
    respond(false, 500, 'Sorry, the contact form is not configured yet.');
}
$cfg = require $SECRETS_PATH;
foreach (['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'from', 'recipient'] as $key) {
    if (empty($cfg[$key])) {
        error_log("contact.php: secrets file missing key '{$key}'");
        respond(false, 500, 'Sorry, the contact form is not configured yet.');
    }
}

// --- Load PHPMailer (vendored, no Composer) -------------------------------
require __DIR__ . '/lib/phpmailer/Exception.php';
require __DIR__ . '/lib/phpmailer/PHPMailer.php';
require __DIR__ . '/lib/phpmailer/SMTP.php';

// --- Build + send mail ----------------------------------------------------
// PHPMailer handles header encoding/injection safety; no manual CR/LF stripping
// needed once values go through its API.
$subject = "Portfolio contact from {$name}";
$body    = "Name: {$name}\n"
         . "Email: {$email}\n\n"
         . $message . "\n";

$mailer = new PHPMailer(true); // true => throw exceptions on failure
try {
    $mailer->isSMTP();
    $mailer->Host       = $cfg['smtp_host'];
    $mailer->Port       = (int) $cfg['smtp_port'];
    $mailer->SMTPAuth   = true;
    $mailer->Username   = $cfg['smtp_user'];
    $mailer->Password   = $cfg['smtp_pass'];
    $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // 587 + STARTTLS
    $mailer->CharSet    = 'UTF-8';

    // From must be the authenticated mailbox or a verified Google "Send as"
    // alias, or Google will reject the submission.
    $mailer->setFrom($cfg['from'], 'bweib.com contact');
    $mailer->addAddress($cfg['recipient']);
    $mailer->addReplyTo($email, $name); // reply goes straight to the visitor

    $mailer->Subject = $subject;
    $mailer->Body    = $body;

    $mailer->send();
} catch (PHPMailerException $e) {
    // ErrorInfo carries the SMTP-level detail; the raw exception message is
    // less useful. Log server-side, stay vague to the visitor.
    error_log('contact.php: send failed: ' . $mailer->ErrorInfo);
    respond(false, 500, 'Sorry, something went wrong sending your message.');
}

respond(true, 200, 'Thanks — your message has been sent.');
