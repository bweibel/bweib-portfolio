/*
 * Wave progression and difficulty scaling for play mode. Ambient autoplay is
 * intentionally untouched: `waveSpeedMul` returns 1 for non-play states, and
 * `advanceWave` is only ever called from play-mode paths.
 */

import {
  PLAY_WAVE,
  WAVE_GROWTH,
  WAVE_MAX_ASTEROIDS,
  WAVE_SPEED_MAX,
  WAVE_SPEED_RAMP,
} from './config';
import { seedAsteroids } from './entities';
import { showWaveBanner, updateHud } from './hud';
import type { Env, GameState } from './types';

/** Large-asteroid count for a given wave number (1-indexed). */
export function waveAsteroidCount(wave: number): number {
  return Math.min(WAVE_MAX_ASTEROIDS, PLAY_WAVE + (wave - 1) * WAVE_GROWTH);
}

/**
 * Speed multiplier applied to all asteroids on the current wave.
 * Returns 1 in ambient mode so the background field is always calm.
 */
export function waveSpeedMul(state: GameState): number {
  if (state.mode !== 'play') return 1;
  return Math.min(WAVE_SPEED_MAX, 1 + (state.wave - 1) * WAVE_SPEED_RAMP);
}

/**
 * Increment the wave counter, seed the correct number of rocks at the current
 * difficulty, and refresh the HUD.
 */
export function advanceWave(env: Env, state: GameState): void {
  state.wave += 1;
  const count = waveAsteroidCount(state.wave);
  seedAsteroids(env, state, count);
  updateHud(env, state);
  showWaveBanner(env, state.wave);
}
