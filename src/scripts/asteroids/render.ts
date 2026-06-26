/*
 * Render system for the Asteroids game — draws the current `GameState` onto the
 * canvas held in `Env`. Pure presentation: it reads state and theme colour, and
 * never mutates either. Stroke opacity follows the mode (faint in the ambient
 * background, near-opaque in the play overlay).
 */

import { SHIP_R, AMBIENT_ALPHA, AMBIENT_PARTICLE_ALPHA, PLAY_ALPHA } from './config';
import type { Asteroid, Env, GameState } from './types';

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
    env.ctx.translate(
      (Math.random() * 2 - 1) * state.shake,
      (Math.random() * 2 - 1) * state.shake,
    );
  }

  for (const a of state.asteroids) drawAsteroid(env, state, a, alpha);

  env.ctx.fillStyle = `rgba(${env.color.rgb}, ${alpha})`;
  for (const b of state.bullets) {
    env.ctx.beginPath();
    env.ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
    env.ctx.fill();
  }

  // Particles are rendered inside the shake transform so they shake with the scene.
  // In ambient mode `state.particles` is always empty, so this is a no-op there.
  drawParticles(env, state);

  // Ship blinks while invulnerable so a respawn is legible — play mode only;
  // in ambient the ship is never at risk, so the flash would just be noise.
  const blink =
    state.mode === 'play' &&
    state.ship.invuln > 0 &&
    Math.floor(state.ship.invuln * 8) % 2 === 0;
  if (!blink && !(state.mode === 'play' && state.gameOver)) drawShip(env, state, alpha);

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
  env.ctx.lineTo(
    x + Math.cos(angle + back) * SHIP_R,
    y + Math.sin(angle + back) * SHIP_R,
  );
  env.ctx.lineTo(
    x + Math.cos(angle - back) * SHIP_R,
    y + Math.sin(angle - back) * SHIP_R,
  );
  env.ctx.closePath();
  env.ctx.stroke();
  env.ctx.fill();

  // Thrust flame flickers behind the ship.
  if (state.input.thrust && Math.random() > 0.35) {
    const fl = SHIP_R + 6 + Math.random() * 4;
    env.ctx.beginPath();
    env.ctx.moveTo(
      x + Math.cos(angle + back * 0.7) * (SHIP_R - 2),
      y + Math.sin(angle + back * 0.7) * (SHIP_R - 2),
    );
    env.ctx.lineTo(x - Math.cos(angle) * fl, y - Math.sin(angle) * fl);
    env.ctx.lineTo(
      x + Math.cos(angle - back * 0.7) * (SHIP_R - 2),
      y + Math.sin(angle - back * 0.7) * (SHIP_R - 2),
    );
    env.ctx.stroke();
  }
}

function drawAsteroid(
  env: Env,
  state: GameState,
  a: Asteroid,
  alpha: number,
): void {
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
