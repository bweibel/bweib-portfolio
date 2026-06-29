/*
 * Movement integration for the Asteroids game: advances the ship, bullets, and
 * asteroids by one timestep. Collisions and the ambient bot live elsewhere — this
 * module only moves things and ages them.
 */

import {
  FRICTION,
  POWERUP_PULL_ACCEL,
  POWERUP_PULL_MAX_SPEED,
  POWERUP_PULL_RADIUS,
  THRUST,
  TURN_RATE,
} from './config';
import { wrap } from './math';
import { fire } from './entities';
import type { Env, GameState } from './types';

/** Advance the ship, bullets, and asteroids by `dt` seconds. */
export function updatePhysics(env: Env, state: GameState, dt: number): void {
  const piloting = state.mode === 'ambient' || !state.gameOver;

  if (piloting) {
    if (state.input.left) state.ship.angle -= TURN_RATE * dt;
    if (state.input.right) state.ship.angle += TURN_RATE * dt;
    if (state.input.thrust) {
      state.ship.vx += Math.cos(state.ship.angle) * THRUST * dt;
      state.ship.vy += Math.sin(state.ship.angle) * THRUST * dt;
    }
    if (state.input.fire) fire(env, state);

    const drag = Math.pow(FRICTION, dt);
    state.ship.vx *= drag;
    state.ship.vy *= drag;
    state.ship.x = wrap(state.ship.x + state.ship.vx * dt, env.width);
    state.ship.y = wrap(state.ship.y + state.ship.vy * dt, env.height);
    state.ship.cooldown = Math.max(0, state.ship.cooldown - dt);
    state.ship.invuln = Math.max(0, state.ship.invuln - dt);
    // Active powerup effect timers count down while the ship is being piloted.
    state.rapidTimer = Math.max(0, state.rapidTimer - dt);
    state.spreadTimer = Math.max(0, state.spreadTimer - dt);
    state.shieldTimer = Math.max(0, state.shieldTimer - dt);
  }

  // Bullets
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x = wrap(b.x + b.vx * dt, env.width);
    b.y = wrap(b.y + b.vy * dt, env.height);
    b.ttl -= dt;
    if (b.ttl <= 0) state.bullets.splice(i, 1);
  }

  // Foe bullets (saucer-fired; mirroring the player-bullet loop above)
  for (let i = state.foeBullets.length - 1; i >= 0; i--) {
    const b = state.foeBullets[i];
    b.x = wrap(b.x + b.vx * dt, env.width);
    b.y = wrap(b.y + b.vy * dt, env.height);
    b.ttl -= dt;
    if (b.ttl <= 0) state.foeBullets.splice(i, 1);
  }

  // Asteroids
  for (const a of state.asteroids) {
    a.x = wrap(a.x + a.vx * dt, env.width);
    a.y = wrap(a.y + a.vy * dt, env.height);
    a.rot += a.spin * dt;
  }

  // Powerup field tokens: drift with wrap and expire when their ttl runs out.
  // While the ship is alive, tokens within range are magnetically drawn to it.
  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const p = state.powerups[i];

    if (piloting) {
      const dx = state.ship.x - p.x;
      const dy = state.ship.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < POWERUP_PULL_RADIUS) {
        // Pull strengthens from 0 at the edge to full at the ship.
        const strength = 1 - dist / POWERUP_PULL_RADIUS;
        p.vx += (dx / dist) * POWERUP_PULL_ACCEL * strength * dt;
        p.vy += (dy / dist) * POWERUP_PULL_ACCEL * strength * dt;
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > POWERUP_PULL_MAX_SPEED) {
          p.vx = (p.vx / speed) * POWERUP_PULL_MAX_SPEED;
          p.vy = (p.vy / speed) * POWERUP_PULL_MAX_SPEED;
        }
      }
    }

    p.x = wrap(p.x + p.vx * dt, env.width);
    p.y = wrap(p.y + p.vy * dt, env.height);
    p.ttl -= dt;
    if (p.ttl <= 0) state.powerups.splice(i, 1);
  }
}
