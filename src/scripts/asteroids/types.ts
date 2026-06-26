/*
 * Shared contract for the Asteroids game. Every system module imports from here,
 * so the entity shapes, the rendering/DOM context (`Env`), and the mutable
 * per-frame game data (`GameState`) all have one definition.
 *
 * `Env` is built once at startup (canvas, ctx, theme colour, cached DOM refs);
 * its `width`/`height`/`dpr` are refreshed on resize. `GameState` is everything
 * that changes as the game runs — entities, score, mode, and the input intent
 * flags the player (or the bot, in ambient mode) writes.
 */

import type { ThemeColor } from '../theme-color';

export type Mode = 'ambient' | 'play';

export interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // radians; nose points along (cos, sin)
  invuln: number; // s remaining
  cooldown: number; // s until next shot allowed
}

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tier: number; // 0..2
  r: number;
  verts: number[]; // per-vertex radius multipliers, for the jagged outline
  spin: number; // rad/s
  rot: number; // current rotation
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
}

/**
 * A single spark/debris particle emitted on explosions or thrust.
 * `life` is the initial ttl, kept so the alpha fade is proportional.
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  life: number; // initial ttl, for fade-out alpha
  r: number; // dot radius (px)
}

export interface Saucer {
  x: number;
  y: number;
  vx: number; // horizontal cross velocity (sign = travel direction)
  vy: number; // current vertical drift; re-rolled on each "jink"
  small: boolean; // true = small/aimed/deadlier; false = large/random
  r: number; // collision + draw radius
  fireTimer: number; // s until next shot
  jinkTimer: number; // s until next vertical-velocity change
}

/** Player intent. In ambient mode the bot writes these instead of the keyboard. */
export interface Input {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
}

/**
 * Stable rendering / DOM context, built once in `init()`. Sizing fields are
 * mutated on resize; everything else is fixed for the page's lifetime.
 */
export interface Env {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** Live theme colour ("r, g, b"); read `.rgb` each frame (see theme-color). */
  color: ThemeColor;
  /** Live page background colour ("r, g, b"), for filling occluding shapes. */
  bg: ThemeColor;
  width: number;
  height: number;
  dpr: number;
  /** <html>, for the `data-game` attribute that CSS keys the overlay off. */
  root: HTMLElement;
  // HUD / overlay DOM (lives in GameBackground.astro); any may be absent.
  scoreEl: HTMLElement | null;
  livesEl: HTMLElement | null;
  messageEl: HTMLElement | null;
  waveEl: HTMLElement | null;
  bestEl: HTMLElement | null;
  toggleBtn: HTMLButtonElement | null;
  /** Transient "Wave N" banner shown at the start of each play-mode wave. */
  bannerEl: HTMLElement | null;
}

/** All mutable per-frame game data. */
export interface GameState {
  mode: Mode;
  score: number;
  lives: number;
  gameOver: boolean;
  wave: number;
  highScore: number;
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  particles: Particle[]; // visual-only sparks; empty in ambient mode
  shake: number; // current camera-shake magnitude (px); decays each frame
  input: Input;
  saucer: Saucer | null;
  foeBullets: Bullet[]; // saucer-fired bullets (reuse the Bullet shape)
  saucerTimer: number; // s until the next saucer spawn is allowed
}
