/*
 * Render system for the Asteroids game — draws the current `GameState` onto the
 * canvas held in `Env`. Pure presentation: it reads state and theme colour, and
 * never mutates either. Stroke opacity follows the mode (faint in the ambient
 * background, near-opaque in the play overlay).
 */

import {
  AMBIENT_ALPHA,
  AMBIENT_PARTICLE_ALPHA,
  PLAY_ALPHA,
  POWERUP_COLORS,
  POWERUP_GLYPHS,
  SHIP_R,
} from './config';
import type { Asteroid, Env, GameState, PowerupKind, Saucer } from './types';

// ---- Render ----
export function render(env: Env, state: GameState): void {
  // clearRect lives OUTSIDE the shake transform so the canvas border never shows.
  env.ctx.clearRect(0, 0, env.width, env.height);
  const alpha = state.mode === 'play' ? PLAY_ALPHA : AMBIENT_ALPHA;
  env.ctx.lineWidth = state.mode === 'play' ? 1.6 : 1.2;
  env.ctx.lineJoin = 'round';

  // Camera shake: nudge the whole scene by a random offset that decays each frame.
  const shaking = state.shake > 0;
  if (shaking) {
    env.ctx.save();
    env.ctx.translate((Math.random() * 2 - 1) * state.shake, (Math.random() * 2 - 1) * state.shake);
  }

  for (const a of state.asteroids) drawAsteroid(env, state, a, alpha);

  env.ctx.fillStyle = `rgba(${env.color.rgb}, ${alpha})`;
  for (const b of state.bullets) {
    env.ctx.beginPath();
    env.ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
    env.ctx.fill();
  }

  // Foe bullets: slightly larger filled dot + a 1px hollow ring to distinguish
  // incoming fire from the player's own shots.
  for (const b of state.foeBullets) {
    env.ctx.fillStyle = `rgba(${env.color.rgb}, ${alpha})`;
    env.ctx.beginPath();
    env.ctx.arc(b.x, b.y, 2.3, 0, Math.PI * 2);
    env.ctx.fill();
    env.ctx.strokeStyle = `rgba(${env.color.rgb}, ${alpha})`;
    const prevLW = env.ctx.lineWidth;
    env.ctx.lineWidth = 1;
    env.ctx.beginPath();
    env.ctx.arc(b.x, b.y, 3.8, 0, Math.PI * 2);
    env.ctx.stroke();
    env.ctx.lineWidth = prevLW;
  }

  if (state.saucer) drawSaucer(env, state, alpha);

  // Powerup field tokens (play only; always empty in ambient, but guard is cheap).
  if (state.mode === 'play') drawPowerups(env, state);

  // Particles are rendered inside the shake transform so they shake with the scene.
  // In ambient mode `state.particles` is always empty, so this is a no-op there.
  drawParticles(env, state);

  // Ship blinks while invulnerable so a respawn is legible — play mode only;
  // in ambient the ship is never at risk, so the flash would just be noise.
  const blink =
    state.mode === 'play' && state.ship.invuln > 0 && Math.floor(state.ship.invuln * 8) % 2 === 0;
  if (!blink && !(state.mode === 'play' && state.gameOver)) {
    // Shield bubble renders before the ship so the ship sits visually inside it.
    if (state.mode === 'play' && state.shieldTimer > 0) drawShieldBubble(env, state);
    drawShip(env, state, alpha);
    // Active rapid/spread chips rendered just below the ship (shield is shown as bubble).
    if (state.mode === 'play') drawEffectChips(env, state);
  }

  if (shaking) env.ctx.restore();
}

/** Filled dots for debris/thrust particles. Alpha fades as ttl runs out. */
function drawParticles(env: Env, state: GameState): void {
  // In ambient mode the sparks are drawn faintly so they read as background
  // motion rather than competing with the page.
  const scale = state.mode === 'play' ? 1 : AMBIENT_PARTICLE_ALPHA;
  for (const p of state.particles) {
    const a = Math.max(0, Math.min(1, p.ttl / p.life)) * scale;
    env.ctx.fillStyle = `rgba(${env.color.rgb}, ${a})`;
    env.ctx.beginPath();
    env.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    env.ctx.fill();
  }
}

function drawShip(env: Env, state: GameState, alpha: number): void {
  const { x, y, angle } = state.ship;
  const nose = SHIP_R + 3;
  const back = 2.4; // rad spread of the rear corners
  env.ctx.strokeStyle = `rgba(${env.color.rgb}, ${alpha})`;
  env.ctx.fillStyle = `rgba(${env.color.rgb}, ${alpha})`;
  env.ctx.beginPath();
  env.ctx.moveTo(x + Math.cos(angle) * nose, y + Math.sin(angle) * nose);
  env.ctx.lineTo(x + Math.cos(angle + back) * SHIP_R, y + Math.sin(angle + back) * SHIP_R);
  env.ctx.lineTo(x + Math.cos(angle - back) * SHIP_R, y + Math.sin(angle - back) * SHIP_R);
  env.ctx.closePath();
  env.ctx.stroke();
  env.ctx.fill();

  // Thrust flame flickers behind the ship.
  if (state.input.thrust && Math.random() > 0.35) {
    const fl = SHIP_R + 6 + Math.random() * 4;
    env.ctx.beginPath();
    env.ctx.moveTo(
      x + Math.cos(angle + back * 1) * (SHIP_R - 2),
      y + Math.sin(angle + back * 1) * (SHIP_R - 2)
    );
    env.ctx.lineTo(x - Math.cos(angle) * fl, y - Math.sin(angle) * fl);
    env.ctx.lineTo(
      x + Math.cos(angle - back * 1) * (SHIP_R - 2),
      y + Math.sin(angle - back * 1) * (SHIP_R - 2)
    );
    env.ctx.stroke();
  }
}

/**
 * Classic saucer silhouette: a hexagonal disc hull (two mirrored trapezoids at
 * the waistline) with a small dome on top. All geometry scales off `saucer.r`.
 * In play mode the body is filled with the page background so it occludes the
 * grid behind it (same technique as asteroids).
 */
function drawSaucer(env: Env, state: GameState, alpha: number): void {
  const s = state.saucer as Saucer;
  const { x, y, r } = s;
  const { ctx } = env;
  const isPlay = state.mode === 'play';

  ctx.strokeStyle = `rgba(${env.color.rgb}, ${alpha})`;

  // Hull: hexagonal disc (two trapezoids meeting at the waistline).
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r * 0.5, y - r * 0.38);
  ctx.lineTo(x + r * 0.5, y - r * 0.38);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.5, y + r * 0.38);
  ctx.lineTo(x - r * 0.5, y + r * 0.38);
  ctx.closePath();
  if (isPlay) {
    ctx.fillStyle = `rgba(${env.bg.rgb}, 1)`;
    ctx.fill();
  }
  ctx.stroke();

  // Waistline divider — makes the two-trapezoid silhouette legible.
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();

  // Dome: semicircle sitting on the upper hull edge.
  ctx.beginPath();
  ctx.arc(x, y - r * 0.38, r * 0.3, Math.PI, 0, false);
  if (isPlay) {
    ctx.fillStyle = `rgba(${env.bg.rgb}, 1)`;
    ctx.fill();
  }
  ctx.stroke();
}

/**
 * Draw drifting powerup tokens on the play field. Each token is a small disc
 * filled with the page background (to occlude the grid) with a coloured ring
 * and a single glyph character identifying the effect type.
 */
function drawPowerups(env: Env, state: GameState): void {
  const { ctx } = env;
  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  const prevLW = ctx.lineWidth;

  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1.5;

  for (const p of state.powerups) {
    const color = POWERUP_COLORS[p.kind];
    // Fill disc with background so the token occludes the grid behind it.
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${env.bg.rgb}, 1)`;
    ctx.fill();
    // Coloured ring.
    ctx.strokeStyle = `rgba(${color}, ${PLAY_ALPHA})`;
    ctx.stroke();
    // Glyph letter centred inside.
    ctx.fillStyle = `rgba(${color}, ${PLAY_ALPHA})`;
    ctx.fillText(POWERUP_GLYPHS[p.kind], p.x, p.y);
  }

  // Restore canvas text state so subsequent draws aren't affected.
  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
  ctx.lineWidth = prevLW;
}

/**
 * Draw a faint coloured halo around the ship while the shield is active.
 * Flickers during the last 2 seconds to warn the player it's expiring.
 */
function drawShieldBubble(env: Env, state: GameState): void {
  const { x, y } = state.ship;
  const nearExpiry = state.shieldTimer < 2;
  // Flicker at ~6 Hz near expiry; always visible otherwise.
  if (nearExpiry && Math.floor(state.shieldTimer * 6) % 2 !== 0) return;
  const prevLW = env.ctx.lineWidth;
  env.ctx.strokeStyle = `rgba(${POWERUP_COLORS.shield}, 0.55)`;
  env.ctx.lineWidth = 1.5;
  env.ctx.beginPath();
  env.ctx.arc(x, y, SHIP_R + 8, 0, Math.PI * 2);
  env.ctx.stroke();
  env.ctx.lineWidth = prevLW;
}

/**
 * Draw small coloured glyph chips just below the ship to indicate active rapid
 * and spread effects. Shield is already shown as the bubble above, so it's
 * omitted here. Chips only appear while the respective timer is running.
 */
function drawEffectChips(env: Env, state: GameState): void {
  const active: PowerupKind[] = [];
  if (state.rapidTimer > 0) active.push('rapid');
  if (state.spreadTimer > 0) active.push('spread');
  if (active.length === 0) return;

  const { ctx } = env;
  const { x, y } = state.ship;
  const chipY = y + SHIP_R + 18;
  const spacing = 17;
  const half = (active.length - 1) * spacing * 0.5;

  const prevFont = ctx.font;
  const prevAlign = ctx.textAlign;
  const prevBaseline = ctx.textBaseline;
  const prevLW = ctx.lineWidth;

  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;

  active.forEach((kind, i) => {
    const cx = x - half + i * spacing;
    const color = POWERUP_COLORS[kind];
    ctx.beginPath();
    ctx.arc(cx, chipY, 7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${env.bg.rgb}, 1)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${color}, 0.8)`;
    ctx.stroke();
    ctx.fillStyle = `rgba(${color}, 0.8)`;
    ctx.fillText(POWERUP_GLYPHS[kind], cx, chipY);
  });

  ctx.font = prevFont;
  ctx.textAlign = prevAlign;
  ctx.textBaseline = prevBaseline;
  ctx.lineWidth = prevLW;
}

function drawAsteroid(env: Env, state: GameState, a: Asteroid, alpha: number): void {
  env.ctx.beginPath();
  const n = a.verts.length;
  for (let i = 0; i < n; i++) {
    const ang = a.rot + (i / n) * Math.PI * 2;
    const rr = a.r * a.verts[i];
    const px = a.x + Math.cos(ang) * rr;
    const py = a.y + Math.sin(ang) * rr;
    if (i === 0) env.ctx.moveTo(px, py);
    else env.ctx.lineTo(px, py);
  }
  env.ctx.closePath();
  // In play, fill with the page background so rocks read as solid and occlude
  // the grid/particles behind them. Ambient keeps its transparent outline.
  if (state.mode === 'play') {
    env.ctx.fillStyle = `rgba(${env.bg.rgb}, 1)`;
    env.ctx.fill();
  }
  env.ctx.strokeStyle = `rgba(${env.color.rgb}, ${alpha})`;
  env.ctx.stroke();
}
