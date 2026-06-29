/*
 * Tunables for the Asteroids game — gathered here so the systems that read them
 * (physics, entities, collisions, render) stay free of magic numbers and the feel
 * of the game can be adjusted in one place.
 */

import type { PowerupKind } from './types';

// ---- Debug ----
// TEMPORARY: start the page already in play mode for easier testing. Set back
// to false (or remove) before shipping — the site should load in ambient.
export const START_IN_PLAY = false;

// TEMPORARY: on load, open the game-over panel with a seeded sample leaderboard
// and the new-high-score form visible, so the panel can be styled without
// playing a round. Set back to false before shipping.
export const DEBUG_GAME_OVER = false;

// ---- Ship / flight ----
export const SHIP_R = 13; // px — ship size / collision radius
export const TURN_RATE = 4.2; // rad/s
export const THRUST = 340; // px/s² acceleration under thrust
export const FRICTION = 0.7; // velocity retained per second (space drag, gentle)
export const BULLET_SPEED = 470; // px/s
export const BULLET_TTL = 1.05; // s a bullet lives
export const FIRE_COOLDOWN = 0.26; // s between shots
export const RESPAWN_INVULN = 2.4; // s of invulnerability after (re)spawn
export const START_LIVES = 3;

// Asteroid tiers: index 0 = small … 2 = large. Splitting steps down a tier.
export const AST_RADIUS = [16, 30, 52];
export const AST_SCORE = [100, 50, 20];
export const AST_BASE_SPEED = 34; // px/s for the largest; smaller move faster
export const AMBIENT_TARGET = 5; // asteroids kept on screen while idling
export const AMBIENT_MAX = 40; // cap so click-spawning can't flood the field
export const PLAY_WAVE = 4; // large asteroids per wave in play mode

export const AMBIENT_ALPHA = 0.2; // stroke opacity in the background
export const PLAY_ALPHA = 0.92; // stroke opacity in the overlay

// ---- Wave progression (play mode only) ----
// Each wave adds WAVE_GROWTH extra large rocks, capped at WAVE_MAX_ASTEROIDS.
export const WAVE_GROWTH = 1; // extra large asteroids per wave
export const WAVE_MAX_ASTEROIDS = 9; // field cap so the screen never floods
// Asteroid speed scales by WAVE_SPEED_RAMP per wave, capped at WAVE_SPEED_MAX.
export const WAVE_SPEED_RAMP = 0.06; // speed multiplier added per wave
export const WAVE_SPEED_MAX = 1.6; // maximum speed multiplier

// ---- Visual juice ----
// Camera shake and thrust trails stay play-only; particle bursts on a rock kill
// also play, toned down, in the ambient background (see AMBIENT_* below).
export const EXPLOSION_BASE_COUNT = 6; // sparks per hit (scaled by asteroid tier)
export const EXPLOSION_SPEED = 90; // px/s max speed for explosion particles
export const PARTICLE_TTL = 0.55; // s a debris particle lives
export const PARTICLE_DRAG = 0.86; // velocity retained per-second (apply via Math.pow(drag, dt))
export const THRUST_EMIT_CHANCE = 0.6; // probability of emitting a thrust spark each frame
export const SHAKE_ROCK = 2.5; // px shake magnitude when the largest asteroid (tier 2) is hit
export const SHAKE_SHIP = 7; // px shake magnitude on ship life loss / game over
export const SHAKE_DECAY = 12; // px/s rate at which shake decays toward zero

// Toned-down debris for ambient (passive) mode — fewer, slower sparks, and
// drawn faintly (AMBIENT_PARTICLE_ALPHA scales their opacity) so they read as
// background motion rather than competing with the page. Experimental.
export const AMBIENT_EXPLOSION_COUNT = 3; // sparks per rock kill in ambient
export const AMBIENT_EXPLOSION_SPEED = 45; // px/s max speed for ambient sparks
export const AMBIENT_PARTICLE_ALPHA = 0.3; // opacity multiplier for ambient particles

// ---- Flying saucer ----
export const SAUCER_R_LARGE = 18;
export const SAUCER_R_SMALL = 11;
export const SAUCER_SPEED = 92; // px/s horizontal cross speed
export const SAUCER_VY_MAX = 46; // px/s max vertical drift magnitude
export const SAUCER_JINK_MIN = 0.7; // s between vertical-direction changes
export const SAUCER_JINK_MAX = 1.6;
export const SAUCER_BULLET_SPEED = 300; // px/s
export const SAUCER_BULLET_TTL = 1.4; // s
export const SAUCER_FIRE_INTERVAL = 1.25; // s between shots (large)
export const SAUCER_FIRE_INTERVAL_SMALL = 1.05;
export const SAUCER_SCORE_LARGE = 150;
export const SAUCER_SCORE_SMALL = 400;

// Small-saucer aim spread (rad): wide at low score, tightens as the player scores.
export const SAUCER_AIM_SPREAD_MAX = 0.35; // at score 0
export const SAUCER_AIM_SPREAD_MIN = 0.06; // at/above SAUCER_AIM_TIGHTEN_AT
export const SAUCER_AIM_TIGHTEN_AT = 6000; // score at which spread bottoms out

// Probability a given spawn is the small (aimed) saucer; rises with score.
export const SAUCER_SMALL_CHANCE_BASE = 0.2;
export const SAUCER_SMALL_CHANCE_MAX = 0.85;
export const SAUCER_SMALL_CHANCE_AT = 8000; // score at which the max is reached

// Spawn cadence (seconds, randomised in range). Play is frequent; ambient calm.
export const SAUCER_SPAWN_MIN_PLAY = 8;
export const SAUCER_SPAWN_MAX_PLAY = 16;
export const SAUCER_SPAWN_MIN_AMBIENT = 18;
export const SAUCER_SPAWN_MAX_AMBIENT = 36;

export const SAUCER_EDGE_MARGIN = 40; // px off-screen for spawn / despawn
export const SAUCER_SHAKE = 3; // px shake on a saucer kill (play)
export const SAUCER_EXPLOSION_COUNT = 10; // sparks on a saucer kill (play)

// ---- Powerups ----
export const POWERUP_DROP_CHANCE = 1; // probability a destroyed saucer drops a token
export const POWERUP_DURATION = 10; // s a timed effect (rapid, spread, shield) lasts
export const POWERUP_FIELD_TTL = 8; // s before an uncollected field token expires
export const POWERUP_R = 11; // collision + draw radius (px)
export const POWERUP_DRIFT = 16; // px/s slow drift speed for field tokens
// Magnetic pull: once the ship is within POWERUP_PULL_RADIUS, tokens accelerate
// toward it (strength rises as it gets closer), capped at POWERUP_PULL_MAX_SPEED
// so they home in smoothly rather than slingshotting past.
export const POWERUP_PULL_RADIUS = 100; // px — range at which the pull kicks in
export const POWERUP_PULL_ACCEL = 1200; // px/s² toward the ship at the edge → centre
export const POWERUP_PULL_MAX_SPEED = 320; // px/s cap on pull-induced token speed
export const RAPID_FIRE_COOLDOWN = 0.1; // s between shots while rapid-fire is active (vs FIRE_COOLDOWN)
export const SPREAD_BULLETS = 3; // number of bullets in the fan shot
export const SPREAD_ANGLE = 0.18; // rad between adjacent fan bullets

// Per-kind colours as "r, g, b" strings — muted hues, one tasteful departure per type.
export const POWERUP_COLORS: Record<PowerupKind, string> = {
  rapid: '210, 160,  50', // amber
  spread: ' 55, 190, 200', // cyan
  shield: ' 55, 185, 110', // green
  life: '220,  75, 140', // pink
};

// Single-character glyph drawn inside the token icon.
export const POWERUP_GLYPHS: Record<PowerupKind, string> = {
  rapid: 'R',
  spread: '3',
  shield: 'S',
  life: '+',
};

// Weighted drop table: life ≈ 12 % of drops; the other three share the rest evenly.
// Total = 88, life = 12  → life / (88 + 12) = 12 %.
export const POWERUP_WEIGHTS: Record<PowerupKind, number> = {
  rapid: 45,
  spread: 30,
  shield: 20,
  life: 5,
};
