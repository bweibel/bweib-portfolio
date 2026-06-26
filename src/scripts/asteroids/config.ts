/*
 * Tunables for the Asteroids game — gathered here so the systems that read them
 * (physics, entities, collisions, render) stay free of magic numbers and the feel
 * of the game can be adjusted in one place.
 */

// ---- Debug ----
// TEMPORARY: start the page already in play mode for easier testing. Set back
// to false (or remove) before shipping — the site should load in ambient.
export const START_IN_PLAY = true;

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
