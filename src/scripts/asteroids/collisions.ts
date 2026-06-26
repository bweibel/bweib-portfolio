/*
 * Collision resolution for the Asteroids game.
 *
 * `handleCollisions` runs once per frame after movement: it resolves bullet
 * hits (scoring and splitting in play mode), the ship/asteroid crash (lives,
 * respawn, game over), and triggers the next wave once the field is cleared.
 */

import {
  AMBIENT_EXPLOSION_COUNT,
  AMBIENT_EXPLOSION_SPEED,
  AST_SCORE,
  EXPLOSION_BASE_COUNT,
  EXPLOSION_SPEED,
  SHAKE_ROCK,
  SHAKE_SHIP,
  SHIP_R,
} from './config';
import { addShake, spawnExplosion } from './effects';
import { makeAsteroid } from './entities';
import { updateHud } from './hud';
import { commitHighScore } from './persist';
import { advanceWave, waveSpeedMul } from './progression';
import { spawnShip } from './state';
import type { Env, GameState } from './types';

export function handleCollisions(env: Env, state: GameState): void {
  // Bullet → asteroid.
  for (let i = state.asteroids.length - 1; i >= 0; i--) {
    const a = state.asteroids[i];
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r) {
        state.bullets.splice(j, 1);
        state.asteroids.splice(i, 1);
        if (state.mode === 'play') {
          state.score += AST_SCORE[a.tier];
          updateHud(env, state);
          // Spawn debris; largest rocks also add a gentle shake.
          spawnExplosion(state, a.x, a.y, EXPLOSION_BASE_COUNT + a.tier * 3, EXPLOSION_SPEED);
          if (a.tier === 2) addShake(state, SHAKE_ROCK);
        } else {
          // Ambient: a toned-down spark burst (no shake), drawn faintly in render.
          spawnExplosion(state, a.x, a.y, AMBIENT_EXPLOSION_COUNT, AMBIENT_EXPLOSION_SPEED);
        }
        if (a.tier > 0) {
          // Fragments inherit the current wave's speed so difficulty stays consistent.
          const mul = waveSpeedMul(state);
          state.asteroids.push(makeAsteroid(env, a.tier - 1, a.x, a.y, mul));
          state.asteroids.push(makeAsteroid(env, a.tier - 1, a.x, a.y, mul));
        }
        break;
      }
    }
  }

  // Asteroid → ship (only consequential while playing and vulnerable).
  if (state.mode === 'play' && !state.gameOver && state.ship.invuln <= 0) {
    for (const a of state.asteroids) {
      if (Math.hypot(a.x - state.ship.x, a.y - state.ship.y) < a.r + SHIP_R) {
        state.lives -= 1;
        // Ship destruction burst + shake (always in play mode per guard above).
        spawnExplosion(state, state.ship.x, state.ship.y, 14, EXPLOSION_SPEED * 1.3);
        addShake(state, SHAKE_SHIP);
        if (state.lives <= 0) {
          state.gameOver = true;
          commitHighScore(state);
        } else {
          state.ship = spawnShip(env);
        }
        updateHud(env, state);
        break;
      }
    }
  }

  // Cleared the field in play mode → advance to next wave.
  if (state.mode === 'play' && !state.gameOver && state.asteroids.length === 0) {
    advanceWave(env, state);
  }
}
