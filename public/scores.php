<?php
/*
 * Asteroids leaderboard API.
 *
 * The site is a static Astro build; this PHP file is copied into the deploy root
 * and executed by Hostinger (same arrangement as contact.php). It keeps a small
 * shared high-score table for the background Asteroids game.
 *
 *   GET  /scores.php        → { ok: true, scores: [ {name, score, wave}, ... ] }
 *   POST /scores.php        → submit one run; body is JSON {name, score, wave}.
 *                             Returns the updated top list and the run's rank.
 *
 * Storage is a flat JSON file in the web root (scores.json). The dir above the
 * root isn't writable on this host, so — exactly like mail-secrets.php — the file
 * lives in the root but is protected three ways: denied by the root .htaccess,
 * never linked anywhere, and excluded from the deploy rsync so --delete can't
 * wipe it. All writes take an exclusive flock so concurrent submits can't
 * corrupt it.
 *
 * Scores come from the client and are therefore inherently spoofable — this is a
 * for-fun background toy, not a competitive ladder. We validate shape and clamp
 * ranges to keep the table sane and safe to render; we do not attempt real
 * anti-cheat.
 */

// --- Config ---------------------------------------------------------------
$STORE_PATH = __DIR__ . '/scores.json';

$MAX_STORED  = 50;  // rows kept on disk
$MAX_RETURN  = 10;  // rows handed back to clients
$MAX_NAME    = 3;   // characters — classic arcade initials
$MAX_SCORE   = 50000000;
$MAX_WAVE    = 9999;

header('Content-Type: application/json; charset=utf-8');

/** Emit a JSON response and exit. */
function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

/**
 * Read + decode the store under a shared lock. Returns a list of rows, each
 * {name, score, wave, ts}. Missing/corrupt file yields an empty list.
 */
function read_scores(string $path): array
{
    $fh = @fopen($path, 'r');
    if (!$fh) {
        return [];
    }
    try {
        flock($fh, LOCK_SH);
        $raw = stream_get_contents($fh);
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

/** Sort rows by score desc, then earliest timestamp first (ties keep the elder). */
function sort_scores(array &$rows): void
{
    usort($rows, function ($a, $b) {
        if ($a['score'] !== $b['score']) {
            return $b['score'] <=> $a['score'];
        }
        return ($a['ts'] ?? 0) <=> ($b['ts'] ?? 0);
    });
}

/** Public projection: drop the timestamp, cap to $MAX_RETURN. */
function public_view(array $rows, int $limit): array
{
    $out = [];
    foreach (array_slice($rows, 0, $limit) as $r) {
        $out[] = ['name' => $r['name'], 'score' => $r['score'], 'wave' => $r['wave']];
    }
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// --- GET: return the current table ----------------------------------------
if ($method === 'GET') {
    $rows = read_scores($STORE_PATH);
    sort_scores($rows);
    respond(200, ['ok' => true, 'scores' => public_view($rows, $MAX_RETURN)]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['ok' => false, 'message' => 'Method not allowed.']);
}

// --- POST: submit a run ---------------------------------------------------
// Accept a JSON body (the game posts JSON); fall back to form fields.
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}

// Name: classic arcade initials — strip to a safe set, drop whitespace,
// uppercase, clamp to 3 characters.
$name = is_string($input['name'] ?? null) ? $input['name'] : '';
$name = preg_replace('/[^A-Za-z0-9]/', '', $name);
$name = mb_strtoupper($name);
if (mb_strlen($name) > $MAX_NAME) {
    $name = mb_substr($name, 0, $MAX_NAME);
}
if ($name === '') {
    $name = 'AAA';
}

// Score + wave: must be finite non-negative integers within range.
$score = filter_var($input['score'] ?? null, FILTER_VALIDATE_INT);
$wave  = filter_var($input['wave'] ?? null, FILTER_VALIDATE_INT);
if ($score === false || $score < 0 || $score > $MAX_SCORE) {
    respond(422, ['ok' => false, 'message' => 'Invalid score.']);
}
if ($wave === false || $wave < 0 || $wave > $MAX_WAVE) {
    $wave = 0;
}

// Insert under an exclusive lock: read, merge, trim, write back atomically.
$fh = @fopen($STORE_PATH, 'c+');
if (!$fh) {
    error_log("scores.php: cannot open store at {$STORE_PATH}");
    respond(500, ['ok' => false, 'message' => 'Leaderboard is unavailable.']);
}

try {
    flock($fh, LOCK_EX);
    $raw  = stream_get_contents($fh);
    $rows = json_decode($raw ?: '[]', true);
    if (!is_array($rows)) {
        $rows = [];
    }

    $entry = ['name' => $name, 'score' => $score, 'wave' => $wave, 'ts' => time()];
    $rows[] = $entry;
    sort_scores($rows);

    // Rank is this run's 1-based position in the full sorted table.
    $rank = 0;
    foreach ($rows as $i => $r) {
        if ($r === $entry) {
            $rank = $i + 1;
            break;
        }
    }

    $rows = array_slice($rows, 0, $MAX_STORED);

    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($rows));
    fflush($fh);
} finally {
    flock($fh, LOCK_UN);
    fclose($fh);
}

respond(200, [
    'ok'     => true,
    'rank'   => $rank,
    'scores' => public_view($rows, $MAX_RETURN),
]);
