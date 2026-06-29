/*
 * Shared high-score leaderboard for the play-mode game. Talks to the PHP API in
 * public/scores.php: GET to read the top table, POST to submit a finished run.
 *
 * The table is cached on `state.leaderboard` (refreshed when a play session
 * starts and after each submit) so the game-over panel can decide locally
 * whether a run qualifies — without blocking the death screen on the network.
 *
 * Everything here is best-effort: the network may be unavailable (or the site
 * served from a host without the PHP endpoint, e.g. local `astro preview`), so
 * every request is wrapped and failures degrade to "no board / can't submit"
 * rather than throwing into the game loop.
 */

import { commitHighScore } from './persist';
import type { Env, GameState, ScoreEntry } from './types';

const ENDPOINT = '/scores.php';
/** Visible table size; must match scores.php $MAX_RETURN. */
const LEADER_SIZE = 10;
/** Remembers the last name a visitor entered, to prefill the form next time. */
const NAME_KEY = 'bw:asteroids:name';

/** Fetch the current top table into `state.leaderboard`. Silent on failure. */
export async function refreshLeaderboard(state: GameState): Promise<void> {
  try {
    const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data?.scores)) state.leaderboard = data.scores as ScoreEntry[];
  } catch {
    // Offline or no endpoint — keep whatever we had (possibly empty).
  }
}

/**
 * Does `score` earn a place on the visible table? True when the board has room
 * or the score beats its current tail. A zero score never qualifies.
 */
function qualifies(state: GameState, score: number): boolean {
  if (score <= 0) return false;
  const board = state.leaderboard;
  if (board.length < LEADER_SIZE) return true;
  return score > board[board.length - 1].score;
}

/** Format a score with thousands separators. */
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/** Read/write the remembered display name (best-effort; storage may be off). */
function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}
function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

/**
 * Render the cached table into the board element. `highlightRank` (1-based)
 * marks the visitor's freshly-submitted row.
 */
function renderBoard(env: Env, state: GameState, highlightRank = 0): void {
  const el = env.boardEl;
  if (!el) return;
  el.textContent = '';

  if (state.leaderboard.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'game-board-empty';
    empty.textContent = 'No scores yet';
    el.append(empty);
    return;
  }

  state.leaderboard.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'game-board-row';
    if (i + 1 === highlightRank) row.classList.add('is-you');

    const rank = document.createElement('span');
    rank.className = 'game-board-rank';
    rank.textContent = `${i + 1}`;

    const name = document.createElement('span');
    name.className = 'game-board-name';
    name.textContent = entry.name;

    const score = document.createElement('span');
    score.className = 'game-board-score';
    score.textContent = fmt(entry.score);

    row.append(rank, name, score);
    el.append(row);
  });
}

/**
 * Attach the new-score form's submit handler ONCE at startup. It reads the
 * finished run straight off `state` (frozen once gameOver is set) and only acts
 * while a qualifying game-over is on screen.
 */
export function wireLeaderboard(env: Env, state: GameState): void {
  const form = env.newScoreEl;
  const input = env.nameInputEl;
  if (!form || !input) return;

  // Live arcade-initials filter: uppercase, alphanumeric only, max 3.
  input.addEventListener('input', () => {
    const cleaned = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3);
    if (cleaned !== input.value) input.value = cleaned;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.gameOver) return;

    const name = input.value.trim().toUpperCase(); // classic arcade initials
    saveName(name);

    const btn = form.querySelector('button');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving…';
    }

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, score: state.score, wave: state.wave }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? 'submit failed');

      if (Array.isArray(data.scores)) state.leaderboard = data.scores as ScoreEntry[];
      form.hidden = true;
      renderBoard(env, state, typeof data.rank === 'number' ? data.rank : 0);
    } catch {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Retry';
      }
    }
  });
}

/**
 * Drive the game-over panel: render the board and — when the run qualifies —
 * reveal the name form with the field prefilled and focused. Idempotent per run
 * via `state.scoreSubmitted`.
 */
export function handleGameOver(env: Env, state: GameState): void {
  if (state.scoreSubmitted) return;
  state.scoreSubmitted = true;

  commitHighScore(state); // keep the local best in sync even if the post fails
  renderBoard(env, state);

  const form = env.newScoreEl;
  const input = env.nameInputEl;
  const btn = form?.querySelector('button');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Save';
  }

  if (!form || !input || !qualifies(state, state.score)) {
    if (form) form.hidden = true;
    return;
  }

  form.hidden = false;
  input.value = loadName();
  input.focus();
  input.select();
}

/** Called when a play session starts: prefetch the table and reset the panel. */
export function onEnterPlay(env: Env, state: GameState): void {
  state.scoreSubmitted = false;
  if (env.newScoreEl) env.newScoreEl.hidden = true;
  void refreshLeaderboard(state);
}

/**
 * DEBUG (config.DEBUG_GAME_OVER): force the game-over panel open on load with a
 * seeded sample table and the new-score form visible, so the panel can be
 * styled without playing a round. Not used in normal flow.
 */
export function debugShowGameOver(env: Env, state: GameState): void {
  state.leaderboard = [
    { name: 'ACE', score: 24680, wave: 9 },
    { name: 'STR', score: 18020, wave: 7 },
    { name: 'BEN', score: 13370, wave: 6 },
    { name: 'NVA', score: 11200, wave: 5 },
    { name: 'QQ', score: 9000, wave: 4 },
    { name: 'PXL', score: 7400, wave: 4 },
    { name: 'ZED', score: 5200, wave: 3 },
    { name: 'MUN', score: 3100, wave: 2 },
    { name: 'A', score: 1500, wave: 1 },
    { name: 'NEO', score: 420, wave: 1 },
  ];
  state.mode = 'play';
  env.root.dataset.game = 'play';
  state.score = 13370;
  state.wave = 6;
  state.gameOver = true;
  state.scoreSubmitted = true; // keep the loop from re-handling / refetching

  if (env.overEl) env.overEl.hidden = false;
  renderBoard(env, state, 3); // mark row 3 as the player's, to style the highlight
  if (env.newScoreEl && env.nameInputEl) {
    env.newScoreEl.hidden = false;
    env.nameInputEl.value = '';
  }
}
