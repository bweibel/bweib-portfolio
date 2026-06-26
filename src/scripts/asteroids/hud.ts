/*
 * HUD + mode switching. `updateHud` syncs the score/lives/wave/best DOM to the
 * current state; `enterPlay`/`exitPlay` flip between the ambient background and
 * the foreground play overlay (coordinating with the grid loop via document
 * events); `resetPlay` starts a fresh play session.
 */

import { START_LIVES } from './config';
import { commitHighScore } from './persist';
import { advanceWave } from './progression';
import { spawnShip } from './state';
import type { Env, GameState } from './types';

export function updateHud(env: Env, state: GameState): void {
  if (env.scoreEl) env.scoreEl.textContent = String(state.score);
  if (env.livesEl) env.livesEl.textContent = String(Math.max(0, state.lives));
  if (env.messageEl) env.messageEl.hidden = !state.gameOver;
  if (env.waveEl) env.waveEl.textContent = String(state.wave);
  if (env.bestEl) env.bestEl.textContent = String(Math.max(state.score, state.highScore));
}

export function resetPlay(env: Env, state: GameState): void {
  state.score = 0;
  state.lives = START_LIVES;
  state.gameOver = false;
  state.bullets = [];
  state.asteroids = [];
  state.particles = [];
  state.shake = 0;
  state.wave = 0; // advanceWave will increment to 1
  // Clear held rotation/fire so a key still down from the restart (Space fires,
  // arrows turn) doesn't carry into the fresh game.
  state.input.left = state.input.right = state.input.fire = false;
  state.ship = spawnShip(env);
  advanceWave(env, state); // seeds wave 1 and calls updateHud
}

/** Flash the "Wave N" banner at the top of the overlay for one animation cycle. */
export function showWaveBanner(env: Env, n: number): void {
  const el = env.bannerEl;
  if (!el) return;
  el.textContent = `Wave ${n}`;
  // Force a reflow between class removal and re-add to replay the keyframe.
  el.classList.remove('is-shown');
  void el.offsetWidth;
  el.classList.add('is-shown');
}

// ---- Mode switching ----
export function enterPlay(env: Env, state: GameState): void {
  if (state.mode === 'play') return;
  state.mode = 'play';
  env.root.dataset.game = 'play';
  env.toggleBtn?.setAttribute('aria-pressed', 'true');
  document.dispatchEvent(new CustomEvent('grid:pause'));
  resetPlay(env, state);
}

export function exitPlay(env: Env, state: GameState): void {
  if (state.mode !== 'play') return;
  commitHighScore(state); // persist a record even if the player quits mid-game
  state.mode = 'ambient';
  delete env.root.dataset.game;
  env.toggleBtn?.setAttribute('aria-pressed', 'false');
  document.dispatchEvent(new CustomEvent('grid:resume'));
  state.input.left = state.input.right = state.input.thrust = state.input.fire = false;
  // Hand the field back to the bot with a calm number of rocks, no particles or shake.
  state.bullets = [];
  state.particles = [];
  state.shake = 0;
  state.ship = spawnShip(env);
}
