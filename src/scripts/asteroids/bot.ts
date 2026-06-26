/*
 * Autoplay bot: aim at the nearest rock, fire when lined up, veer off when one
 * gets close. Writes the same intent flags the player would, so ambient mode
 * reuses the exact ship-control path as play mode.
 */

import { normalizeAngle } from './math';
import type { Asteroid, GameState } from './types';

// ---- Autoplay bot: aim at the nearest rock, fire when lined up, veer off
//      when one gets close. Writes the same intent flags the player would. ----
export function botThink(state: GameState): void {
  const { input, ship, asteroids } = state;
  input.left = input.right = input.thrust = input.fire = false;
  let nearest: Asteroid | null = null;
  let best = Infinity;
  for (const a of asteroids) {
    const d = Math.hypot(a.x - ship.x, a.y - ship.y);
    if (d < best) {
      best = d;
      nearest = a;
    }
  }
  if (!nearest) {
    input.thrust = Math.random() < 0.01;
    return;
  }
  const aim = Math.atan2(nearest.y - ship.y, nearest.x - ship.x);
  const danger = best < 130;
  // When in danger, steer away from the rock; otherwise steer onto it.
  const target = danger ? aim + Math.PI : aim;
  const diff = normalizeAngle(target - ship.angle);
  if (diff > 0.05) input.right = true;
  else if (diff < -0.05) input.left = true;
  input.thrust = danger || best > 340;
  input.fire = !danger && Math.abs(normalizeAngle(aim - ship.angle)) < 0.16;
}
