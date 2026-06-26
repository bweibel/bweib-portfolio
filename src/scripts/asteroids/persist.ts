/*
 * localStorage persistence for the Asteroids high score. All reads and writes
 * are wrapped in try/catch so private-browsing restrictions or disabled storage
 * never crash the game.
 */

import type { GameState } from './types';

const KEY = 'bw:asteroids:highscore';

/** Read the stored high score; returns 0 on a miss, parse failure, or any error. */
export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist a high-score value; swallows any storage errors silently. */
export function saveHighScore(n: number): void {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    // Private mode or storage disabled — not fatal.
  }
}

/**
 * If the current score beats the stored high score, update `state.highScore`
 * in place and flush to localStorage.
 */
export function commitHighScore(state: GameState): void {
  if (state.score > state.highScore) {
    state.highScore = state.score;
    saveHighScore(state.highScore);
  }
}
