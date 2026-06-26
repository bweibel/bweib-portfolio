/*
 * Flying-saucer lifecycle: spawn scheduling, movement (jink + drift), firing
 * cadence, and despawn. Called from the update loop in `index.ts` in both modes.
 *
 * Score-scaling helpers (`smallChance`, `aimSpread`) live in `progression.ts`
 * alongside the asteroid-wave helpers so all difficulty scaling is co-located.
 */

import {
  SAUCER_EDGE_MARGIN,
  SAUCER_FIRE_INTERVAL,
  SAUCER_FIRE_INTERVAL_SMALL,
  SAUCER_JINK_MAX,
  SAUCER_JINK_MIN,
  SAUCER_SPAWN_MAX_AMBIENT,
  SAUCER_SPAWN_MAX_PLAY,
  SAUCER_SPAWN_MIN_AMBIENT,
  SAUCER_SPAWN_MIN_PLAY,
  SAUCER_VY_MAX,
} from './config';
import { fireSaucer, makeSaucer } from './entities';
import { wrap } from './math';
import type { Env, GameState, Mode } from './types';

/** Roll a random spawn delay appropriate for the given mode. */
export function saucerDelay(mode: Mode): number {
  const [min, max] =
    mode === 'play'
      ? [SAUCER_SPAWN_MIN_PLAY, SAUCER_SPAWN_MAX_PLAY]
      : [SAUCER_SPAWN_MIN_AMBIENT, SAUCER_SPAWN_MAX_AMBIENT];
  return min + Math.random() * (max - min);
}

/** Advance saucer state by `dt` seconds (spawn scheduling, movement, firing, despawn). */
export function updateSaucer(env: Env, state: GameState, dt: number): void {
  if (!state.saucer) {
    // Don't spawn a new saucer in play mode once the game is over.
    if (state.mode === 'play' && state.gameOver) return;
    state.saucerTimer -= dt;
    if (state.saucerTimer <= 0) {
      state.saucer = makeSaucer(env, state);
    }
    return;
  }

  const s = state.saucer;

  // Movement: horizontal travel without wrap; vertical travel with wrap.
  s.x += s.vx * dt;
  s.y = wrap(s.y + s.vy * dt, env.height);

  // Jink: periodically re-roll the vertical velocity.
  s.jinkTimer -= dt;
  if (s.jinkTimer <= 0) {
    s.vy = (Math.random() * 2 - 1) * SAUCER_VY_MAX;
    s.jinkTimer = SAUCER_JINK_MIN + Math.random() * (SAUCER_JINK_MAX - SAUCER_JINK_MIN);
  }

  // Firing.
  s.fireTimer -= dt;
  if (s.fireTimer <= 0) {
    fireSaucer(state, s);
    s.fireTimer = s.small ? SAUCER_FIRE_INTERVAL_SMALL : SAUCER_FIRE_INTERVAL;
  }

  // Despawn when the saucer crosses past the far edge.
  if (s.x < -SAUCER_EDGE_MARGIN || s.x > env.width + SAUCER_EDGE_MARGIN) {
    state.saucer = null;
    state.saucerTimer = saucerDelay(state.mode);
  }
}
