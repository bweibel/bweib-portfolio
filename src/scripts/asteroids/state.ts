/*
 * Game-state factory. `spawnShip` places a fresh, invulnerable ship at the centre
 * of the field; `createState` builds the initial ambient-mode state around it.
 */

import { RESPAWN_INVULN, START_LIVES } from './config';
import { loadHighScore } from './persist';
import { saucerDelay } from './saucer';
import type { Env, GameState, Ship } from './types';

/** A fresh ship at the centre of the field, nose up, briefly invulnerable. */
export function spawnShip(env: Env): Ship {
  return {
    x: env.width / 2,
    y: env.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    invuln: RESPAWN_INVULN,
    cooldown: 0,
  };
}

/** Initial state: ambient mode, full lives, empty field (the loop populates it). */
export function createState(env: Env): GameState {
  return {
    mode: 'ambient',
    score: 0,
    lives: START_LIVES,
    gameOver: false,
    wave: 0,
    highScore: loadHighScore(),
    ship: spawnShip(env),
    asteroids: [],
    bullets: [],
    particles: [],
    shake: 0,
    input: { left: false, right: false, thrust: false, fire: false },
    saucer: null,
    foeBullets: [],
    saucerTimer: saucerDelay('ambient'),
    powerups: [],
    rapidTimer: 0,
    spreadTimer: 0,
    shieldTimer: 0,
    leaderboard: [],
    scoreSubmitted: false,
  };
}
