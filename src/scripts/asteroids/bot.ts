/*
 * Autoplay bot: aim at the nearest rock, fire when lined up, veer off when one
 * gets close. Writes the same intent flags the player would, so ambient mode
 * reuses the exact ship-control path as play mode.
 */

import { normalizeAngle } from './math';
import type { Asteroid, GameState } from './types';

// ---- Autoplay bot: aim at the nearest threat (rock or saucer), fire when
//      lined up, veer off when a threat gets close or foe bullets are near.
//      Writes the same intent flags the player would. ----
export function botThink(state: GameState): void {
  const { input, ship, asteroids } = state;
  input.left = input.right = input.thrust = input.fire = false;

  // Find the nearest asteroid.
  let nearest: Asteroid | null = null;
  let best = Infinity;
  for (const a of asteroids) {
    const d = Math.hypot(a.x - ship.x, a.y - ship.y);
    if (d < best) {
      best = d;
      nearest = a;
    }
  }

  // The saucer is also a candidate target — pick whichever is closest.
  const saucerDist = state.saucer
    ? Math.hypot(state.saucer.x - ship.x, state.saucer.y - ship.y)
    : Infinity;
  const targetSaucer = saucerDist < best;

  let aimX: number, aimY: number, targetDist: number;
  if (targetSaucer && state.saucer) {
    aimX = state.saucer.x;
    aimY = state.saucer.y;
    targetDist = saucerDist;
  } else if (nearest) {
    aimX = nearest.x;
    aimY = nearest.y;
    targetDist = best;
  } else {
    input.thrust = Math.random() < 0.01;
    return;
  }

  const aim = Math.atan2(aimY - ship.y, aimX - ship.x);

  // Also treat very-close foe bullets as a danger signal so the bot reacts to
  // incoming saucer fire (cheap O(n) scan; ambient field stays small).
  const foeDanger = state.foeBullets.some((b) => Math.hypot(b.x - ship.x, b.y - ship.y) < 80);

  // When in danger, steer away from the threat; otherwise steer onto it.
  const danger = targetDist < 130 || foeDanger;
  const target = danger ? aim + Math.PI : aim;
  const diff = normalizeAngle(target - ship.angle);
  if (diff > 0.05) input.right = true;
  else if (diff < -0.05) input.left = true;
  input.thrust = danger || targetDist > 340;
  input.fire = !danger && Math.abs(normalizeAngle(aim - ship.angle)) < 0.16;
}
