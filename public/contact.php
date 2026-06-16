<?php
/*
 * Contact form mail handler.
 *
 * The site is a static Astro build; this PHP file is copied into the deploy
 * root and executed by Hostinger. The recipient address lives ONLY here, so it
 * is never present in the served HTML/JS where scrapers could grab it.
 *
 * Front-end posts here via fetch() and expects JSON. Without JS the browser
 * navigates here with a normal form POST, so we also emit a minimal HTML page
 * as a fallback (chosen by the Accept header).
 */

// --- Config ---------------------------------------------------------------
$RECIPIENT  = 'ben@bweib.com';                 // where messages are delivered
$FROM       = 'noreply@bweib.com';             // must be an @bweib.com sender
                                               // (SPF/DKIM fail otherwise)
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

// --- Build + send mail ----------------------------------------------------
// Strip CR/LF from any value that ends up in a header to block injection.
$cleanName  = str_replace(["\r", "\n"], ' ', $name);
$cleanEmail = str_replace(["\r", "\n"], ' ', $email);

$subject = "Portfolio contact from {$cleanName}";
$body    = "Name: {$cleanName}\n"
         . "Email: {$cleanEmail}\n\n"
         . $message . "\n";

$headers = [
    "From: bweib.com contact <{$FROM}>",
    "Reply-To: {$cleanName} <{$cleanEmail}>",
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
];

$sent = mail($RECIPIENT, $subject, $body, implode("\r\n", $headers));

if (!$sent) {
    respond(false, 500, 'Sorry, something went wrong sending your message.');
}

respond(true, 200, 'Thanks — your message has been sent.');
