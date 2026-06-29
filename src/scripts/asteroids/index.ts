/*
 * A small Asteroids-style game that lives behind the site.
 *
 * Two modes share one canvas and one loop:
 *   ambient — autoplay. A bot flies the ship and clears asteroids, drawn faintly
 *             so it reads as background motion over the dot grid.
 *   play    — the visitor takes control via the header button. The canvas is
 *             promoted to a foreground overlay (CSS keys off <html data-game>),
 *             with score, lives, and game-over. Keyboard + on-screen touch.
 *
 * Vanilla Canvas 2D, no dependencies — same shape as `grid-background.ts`
 * (DPR-aware sizing, theme colour read-back, reduced-motion gate). The two
 * coordinate via document events: this dispatches `grid:pause` / `grid:resume`
 * so the grid loop idles while the overlay is open, and listens for
 * `game:toggle` from the header button.
 *
 * Reduced-motion / no-JS safety: nothing runs and the header button stays
 * hidden, so those visitors see exactly the prior page.
 *
 * This module is the entry point: it builds the `Env` (canvas + DOM context),
 * the `GameState`, runs the main loop, and wires events. The game's systems
 * live in sibling modules (physics, collisions, render, bot, hud, input,
 * entities) and operate on `Env` / `GameState` — see ./types.
 */

import { trackThemeBackground, trackThemeColor } from '../theme-color';
import { AMBIENT_TARGET, DEBUG_GAME_OVER, START_IN_PLAY } from './config';
import type { Env, GameState } from './types';
import { createState } from './state';
import { seedAsteroids, spawnAwayFromShip } from './entities';
import { updatePhysics } from './physics';
import { handleCollisions } from './collisions';
import { spawnThrust, updateEffects } from './effects';
import { botThink } from './bot';
import { render } from './render';
import { enterPlay, exitPlay, resetPlay } from './hud';
import { wireInput } from './input';
import { updateSaucer } from './saucer';
import { debugShowGameOver, handleGameOver, wireLeaderboard } from './leaderboard';

function init() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('game-bg') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  // Stable rendering / DOM context. Colour is pulled from the resolved theme
  // (canvas CSS `color`) so the game tracks light/dark — shared with the grid
  // background (see theme-color). HUD / overlay DOM lives in GameBackground.astro.
  const env: Env = {
    canvas,
    ctx,
    color: trackThemeColor(canvas),
    bg: trackThemeBackground(),
    width: 0,
    height: 0,
    dpr: 1,
    root: document.documentElement,
    scoreEl: document.querySelector<HTMLElement>('[data-game-score]'),
    livesEl: document.querySelector<HTMLElement>('[data-game-lives]'),
    waveEl: document.querySelector<HTMLElement>('[data-game-wave]'),
    bestEl: document.querySelector<HTMLElement>('[data-game-best]'),
    toggleBtn: document.querySelector<HTMLButtonElement>('.game-toggle'),
    bannerEl: document.querySelector<HTMLElement>('[data-game-wave-banner]'),
    overEl: document.querySelector<HTMLElement>('[data-game-over]'),
    boardEl: document.querySelector<HTMLElement>('[data-game-board]'),
    newScoreEl: document.querySelector<HTMLFormElement>('[data-game-newscore]'),
    nameInputEl: document.querySelector<HTMLInputElement>('[data-game-name]'),
  };

  // ---- Sizing ----
  function resize() {
    env.dpr = Math.min(window.devicePixelRatio || 1, 2);
    env.width = window.innerWidth;
    env.height = window.innerHeight;
    env.canvas.width = Math.floor(env.width * env.dpr);
    env.canvas.height = Math.floor(env.height * env.dpr);
    env.ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
  }

  resize(); // set dimensions before the first ship/field spawn
  const state: GameState = createState(env);

  // ---- Per-frame update ----
  function update(dt: number) {
    if (state.mode === 'ambient') {
      botThink(state);
      // Keep the idle field populated.
      if (state.asteroids.length < AMBIENT_TARGET) {
        state.asteroids.push(spawnAwayFromShip(env, state, 2));
      }
    }

    updatePhysics(env, state, dt);
    updateSaucer(env, state, dt);
    handleCollisions(env, state);
    // Effects run after collisions so the burst from a death hit is included
    // in the same frame. Runs in both modes (even when gameOver, so the death
    // explosion plays out); ambient only ever holds toned-down rock-kill sparks.
    updateEffects(state, dt);
    // Thrust sparks are emitted here (not in physics.ts) to keep physics pure.
    if (state.mode === 'play' && state.input.thrust) spawnThrust(state, env);

    // On the first frame a play run ends, drive the game-over panel: render the
    // leaderboard and, if the score qualifies, prompt for a name. handleGameOver
    // is one-shot via state.scoreSubmitted (reset on each new run).
    if (state.mode === 'play' && state.gameOver && !state.scoreSubmitted) {
      handleGameOver(env, state);
    }
  }

  // ---- Main loop ----
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render(env, state);
    requestAnimationFrame(frame);
  }

  // ---- Wiring ----
  wireLeaderboard(env, state); // attach the new-score form's submit handler once
  seedAsteroids(env, state, AMBIENT_TARGET);
  canvas.classList.add('is-ready');
  env.toggleBtn?.removeAttribute('hidden'); // reveal the header button (motion is allowed here)
  requestAnimationFrame(frame);

  let resizeTimer: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });

  // Header button (and any other trigger) toggles play.
  document.addEventListener('game:toggle', () => {
    if (state.mode === 'play') exitPlay(env, state);
    else enterPlay(env, state);
  });

  // Keyboard, touch, and the background-click ambient spawn.
  wireInput(env, state, {
    enterPlay: () => enterPlay(env, state),
    exitPlay: () => exitPlay(env, state),
    resetPlay: () => resetPlay(env, state),
  });

  // TEMPORARY (config.START_IN_PLAY): jump straight into play mode for testing.
  if (START_IN_PLAY) enterPlay(env, state);

  // TEMPORARY (config.DEBUG_GAME_OVER): open the game-over panel on load with a
  // seeded leaderboard so its visuals can be tweaked without playing.
  if (DEBUG_GAME_OVER) debugShowGameOver(env, state);
}

try {
  init();
} catch (error) {
  console.error('[asteroids] disabled after error:', error);
}

export {};
