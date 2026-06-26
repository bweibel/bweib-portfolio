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
  SAUCER_EXPLOSION_COUNT,
  SAUCER_SCORE_LARGE,
  SAUCER_SCORE_SMALL,
  SAUCER_SHAKE,
  SHAKE_ROCK,
  SHAKE_SHIP,
  SHIP_R,
} from './config';
import { addShake, spawnExplosion } from './effects';
import { makeAsteroid } from './entities';
import { updateHud } from './hud';
import { commitHighScore } from './persist';
import { advanceWave, waveSpeedMul } from './progression';
import { saucerDelay } from './saucer';
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

  // --- Saucer collision pairs ---

  if (state.saucer) {
    const s = state.saucer;

    // Player bullet → saucer.
    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (Math.hypot(s.x - b.x, s.y - b.y) < s.r) {
        state.bullets.splice(j, 1);
        state.saucer = null;
        state.saucerTimer = saucerDelay(state.mode);
        if (state.mode === 'play') {
          state.score += s.small ? SAUCER_SCORE_SMALL : SAUCER_SCORE_LARGE;
          spawnExplosion(state, s.x, s.y, SAUCER_EXPLOSION_COUNT, EXPLOSION_SPEED);
          addShake(state, SAUCER_SHAKE);
          updateHud(env, state);
        } else {
          spawnExplosion(state, s.x, s.y, AMBIENT_EXPLOSION_COUNT, AMBIENT_EXPLOSION_SPEED);
        }
        break; // saucer is gone; exit the bullet loop
      }
    }
  }

  // Foe bullet → asteroid.
  for (let i = state.asteroids.length - 1; i >= 0; i--) {
    const a = state.asteroids[i];
    for (let j = state.foeBullets.length - 1; j >= 0; j--) {
      const b = state.foeBullets[j];
      if (Math.hypot(a.x - b.x, a.y - b.y) < a.r) {
        state.foeBullets.splice(j, 1);
        state.asteroids.splice(i, 1);
        // No score — saucer-cleared rocks award nothing.
        if (state.mode === 'play') {
          spawnExplosion(state, a.x, a.y, EXPLOSION_BASE_COUNT + a.tier * 3, EXPLOSION_SPEED);
          if (a.tier === 2) addShake(state, SHAKE_ROCK);
        } else {
          spawnExplosion(state, a.x, a.y, AMBIENT_EXPLOSION_COUNT, AMBIENT_EXPLOSION_SPEED);
        }
        if (a.tier > 0) {
          const mul = waveSpeedMul(state);
          state.asteroids.push(makeAsteroid(env, a.tier - 1, a.x, a.y, mul));
          state.asteroids.push(makeAsteroid(env, a.tier - 1, a.x, a.y, mul));
        }
        break;
      }
    }
  }

  // Foe bullet → ship (play mode only, while the ship is vulnerable).
  if (state.mode === 'play' && !state.gameOver && state.ship.invuln <= 0) {
    for (let j = state.foeBullets.length - 1; j >= 0; j--) {
      const b = state.foeBullets[j];
      if (Math.hypot(state.ship.x - b.x, state.ship.y - b.y) < SHIP_R) {
        state.foeBullets.splice(j, 1);
        state.lives -= 1;
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

  // Ship → saucer body (play mode only, while the ship is vulnerable).
  if (state.saucer && state.mode === 'play' && !state.gameOver && state.ship.invuln <= 0) {
    const s = state.saucer;
    if (Math.hypot(state.ship.x - s.x, state.ship.y - s.y) < s.r + SHIP_R) {
      // Saucer explodes (no score for a ram).
      state.saucer = null;
      state.saucerTimer = saucerDelay(state.mode);
      spawnExplosion(state, s.x, s.y, SAUCER_EXPLOSION_COUNT, EXPLOSION_SPEED);
      addShake(state, SAUCER_SHAKE);
      // Ship loses a life.
      state.lives -= 1;
      spawnExplosion(state, state.ship.x, state.ship.y, 14, EXPLOSION_SPEED * 1.3);
      addShake(state, SHAKE_SHIP);
      if (state.lives <= 0) {
        state.gameOver = true;
        commitHighScore(state);
      } else {
        state.ship = spawnShip(env);
      }
      updateHud(env, state);
    }
  }
}
