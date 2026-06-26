/*
 * Entity factories and ship actions for the Asteroids game: building asteroids
 * (jagged, randomly-velocitied rocks), spawning them clear of the ship, and
 * firing a bullet from the ship's nose.
 */

import {
  AST_BASE_SPEED,
  AST_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  FIRE_COOLDOWN,
  SAUCER_BULLET_SPEED,
  SHIP_R,
  SAUCER_BULLET_TTL,
  SAUCER_EDGE_MARGIN,
  SAUCER_FIRE_INTERVAL,
  SAUCER_FIRE_INTERVAL_SMALL,
  SAUCER_JINK_MAX,
  SAUCER_JINK_MIN,
  SAUCER_R_LARGE,
  SAUCER_R_SMALL,
  SAUCER_SMALL_CHANCE_BASE,
  SAUCER_SPEED,
} from './config';
import { aimSpread, smallChance, waveSpeedMul } from './progression';
import type { Asteroid, Env, GameState, Saucer } from './types';

export function makeAsteroid(
  env: Env,
  tier: number,
  x?: number,
  y?: number,
  speedMul = 1
): Asteroid {
  const r = AST_RADIUS[tier];
  const verts: number[] = [];
  const n = 9 + tier;
  for (let i = 0; i < n; i++) verts.push(0.78 + Math.random() * 0.42);
  const speed = AST_BASE_SPEED * (1 + (2 - tier) * 0.45) * speedMul;
  const dir = Math.random() * Math.PI * 2;
  return {
    x: x ?? Math.random() * env.width,
    y: y ?? Math.random() * env.height,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    tier,
    r,
    verts,
    spin: (Math.random() - 0.5) * 1.4,
    rot: Math.random() * Math.PI * 2,
  };
}

/** Spawn a large asteroid away from the ship so it doesn't appear on top of it. */
export function spawnAwayFromShip(env: Env, state: GameState, tier: number): Asteroid {
  let x = 0;
  let y = 0;
  let tries = 0;
  do {
    x = Math.random() * env.width;
    y = Math.random() * env.height;
    tries++;
  } while (Math.hypot(x - state.ship.x, y - state.ship.y) < 180 && tries < 20);
  return makeAsteroid(env, tier, x, y, waveSpeedMul(state));
}

/** Push `count` large asteroids onto the field, each placed away from the ship. */
export function seedAsteroids(env: Env, state: GameState, count: number): void {
  for (let i = 0; i < count; i++) state.asteroids.push(spawnAwayFromShip(env, state, 2));
}

/** Spawn a flying saucer entering from a random side of the screen. */
export function makeSaucer(env: Env, state: GameState): Saucer {
  const isSmall =
    state.mode === 'play'
      ? Math.random() < smallChance(state.score)
      : Math.random() < SAUCER_SMALL_CHANCE_BASE;
  const goRight = Math.random() < 0.5;
  const x = goRight ? -SAUCER_EDGE_MARGIN : env.width + SAUCER_EDGE_MARGIN;
  const vx = goRight ? SAUCER_SPEED : -SAUCER_SPEED;
  return {
    x,
    y: Math.random() * env.height,
    vx,
    vy: 0,
    small: isSmall,
    r: isSmall ? SAUCER_R_SMALL : SAUCER_R_LARGE,
    fireTimer: isSmall ? SAUCER_FIRE_INTERVAL_SMALL : SAUCER_FIRE_INTERVAL,
    jinkTimer: SAUCER_JINK_MIN + Math.random() * (SAUCER_JINK_MAX - SAUCER_JINK_MIN),
  };
}

/**
 * Fire a bullet from the saucer: large = random direction, small = aimed at
 * the ship with a spread that tightens as the player's score climbs.
 */
export function fireSaucer(state: GameState, saucer: Saucer): void {
  let angle: number;
  if (saucer.small) {
    const { ship } = state;
    const base = Math.atan2(ship.y - saucer.y, ship.x - saucer.x);
    const spread = aimSpread(state.mode === 'play' ? state.score : 0);
    angle = base + (Math.random() - 0.5) * spread;
  } else {
    angle = Math.random() * Math.PI * 2;
  }
  state.foeBullets.push({
    x: saucer.x,
    y: saucer.y,
    vx: Math.cos(angle) * SAUCER_BULLET_SPEED,
    vy: Math.sin(angle) * SAUCER_BULLET_SPEED,
    ttl: SAUCER_BULLET_TTL,
  });
}

export function fire(env: Env, state: GameState): void {
  const ship = state.ship;
  if (ship.cooldown > 0) return;
  ship.cooldown = FIRE_COOLDOWN;
  state.bullets.push({
    x: ship.x + Math.cos(ship.angle) * SHIP_R,
    y: ship.y + Math.sin(ship.angle) * SHIP_R,
    vx: ship.vx + Math.cos(ship.angle) * BULLET_SPEED,
    vy: ship.vy + Math.sin(ship.angle) * BULLET_SPEED,
    ttl: BULLET_TTL,
  });
}
