/*
 * Simulation-only effects for play mode: particle emission (explosions, thrust
 * sparks) and camera shake. Nothing here draws to the canvas — rendering is
 * handled by `render.ts`. All exported functions guard against ambient mode at
 * their call sites; this module is kept side-effect free.
 */

import {
  PARTICLE_DRAG,
  PARTICLE_TTL,
  SHAKE_DECAY,
  SHIP_R,
  THRUST_EMIT_CHANCE,
} from './config';
import type { Env, GameState, Particle } from './types';

/**
 * Push `count` debris particles outward from (x, y) in random directions,
 * at random speeds up to `speed`. Call only in play mode.
 */
export function spawnExplosion(
  state: GameState,
  x: number,
  y: number,
  count: number,
  speed: number,
): void {
  for (let i = 0; i < count; i++) {
    const dir = Math.random() * Math.PI * 2;
    const spd = speed * (0.4 + Math.random() * 0.6);
    const ttl = PARTICLE_TTL * (0.8 + Math.random() * 0.4);
    const p: Particle = {
      x,
      y,
      vx: Math.cos(dir) * spd,
      vy: Math.sin(dir) * spd,
      ttl,
      life: ttl,
      r: 1 + Math.random(),
    };
    state.particles.push(p);
  }
}

/**
 * With probability `THRUST_EMIT_CHANCE`, emit one small particle from the
 * ship's exhaust port (opposite the nose) with velocity opposing the heading
 * plus a little lateral jitter. `env` is accepted for future use (e.g.
 * wrapping particles around the canvas edges).
 */
export function spawnThrust(state: GameState, env: Env): void {
  if (Math.random() > THRUST_EMIT_CHANCE) return;
  // Flame originates behind the ship — opposite the nose direction.
  const { x, y, angle, vx, vy } = state.ship;
  const fl = SHIP_R + 7; // distance behind centre (matches render.ts flame length)
  const px = x - Math.cos(angle) * fl;
  const py = y - Math.sin(angle) * fl;
  // Velocity: away from the ship's heading, plus a small lateral scatter.
  const jitter = (Math.random() - 0.5) * 30;
  const thrustSpd = 55 + Math.random() * 25;
  const ttl = 0.18 + Math.random() * 0.12;
  const p: Particle = {
    x: px,
    y: py,
    vx: vx - Math.cos(angle) * thrustSpd + Math.cos(angle + Math.PI / 2) * jitter,
    vy: vy - Math.sin(angle) * thrustSpd + Math.sin(angle + Math.PI / 2) * jitter,
    ttl,
    life: ttl,
    r: 0.9 + Math.random() * 0.6,
  };
  state.particles.push(p);
}

/**
 * Set the shake magnitude to the greater of its current value and `amount`.
 * Shake decays passively in `updateEffects`.
 */
export function addShake(state: GameState, amount: number): void {
  state.shake = Math.max(state.shake, amount);
}

/**
 * Advance all particles by `dt` seconds (movement, drag, lifetime) and
 * decay the camera shake. Must run each frame while in play mode, even on
 * game-over, so the death burst has time to finish.
 */
export function updateEffects(state: GameState, dt: number): void {
  // Advance particles and prune expired ones (iterate backwards to splice safely).
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = Math.pow(PARTICLE_DRAG, dt);
    p.vx *= drag;
    p.vy *= drag;
    p.ttl -= dt;
    if (p.ttl <= 0) state.particles.splice(i, 1);
  }

  // Decay shake toward zero.
  state.shake = Math.max(0, state.shake - SHAKE_DECAY * dt);
}
