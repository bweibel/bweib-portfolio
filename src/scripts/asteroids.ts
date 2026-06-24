/*
 * A small Asteroids-style game that lives behind the site.
 *
 * Two modes share one canvas and one loop:
 *   ambient — autoplay. A bot flies the ship and clears asteroids, drawn faintly
 *             so it reads as background motion over the dot grid.
 *   play    — the visitor takes control via the header button. The canvas is
 *             promoted to a foreground overlay (CSS keys off <html data-game>),
 *             with score, lives, and game-over. Keyboard + on-screen touch.
 *
 * Vanilla Canvas 2D, no dependencies — same shape as `grid-background.ts`
 * (DPR-aware sizing, theme colour read-back, reduced-motion gate). The two
 * coordinate via document events: this dispatches `grid:pause` / `grid:resume`
 * so the grid loop idles while the overlay is open, and listens for
 * `game:toggle` from the header button.
 *
 * Reduced-motion / no-JS safety: nothing runs and the header button stays
 * hidden, so those visitors see exactly the prior page.
 */

type Mode = 'ambient' | 'play';

// ---- Tunables ----
const SHIP_R = 13; // px — ship size / collision radius
const TURN_RATE = 4.2; // rad/s
const THRUST = 340; // px/s² acceleration under thrust
const FRICTION = 0.7; // velocity retained per second (space drag, gentle)
const BULLET_SPEED = 470; // px/s
const BULLET_TTL = 1.05; // s a bullet lives
const FIRE_COOLDOWN = 0.26; // s between shots
const RESPAWN_INVULN = 2.4; // s of invulnerability after (re)spawn
const START_LIVES = 3;

// Asteroid tiers: index 0 = small … 2 = large. Splitting steps down a tier.
const AST_RADIUS = [16, 30, 52];
const AST_SCORE = [100, 50, 20];
const AST_BASE_SPEED = 34; // px/s for the largest; smaller move faster
const AMBIENT_TARGET = 5; // asteroids kept on screen while idling
const AMBIENT_MAX = 40; // cap so click-spawning can't flood the field
const PLAY_WAVE = 4; // large asteroids per wave in play mode

const AMBIENT_ALPHA = 0.3; // stroke opacity in the background
const PLAY_ALPHA = 0.92; // stroke opacity in the overlay

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // radians; nose points along (cos, sin)
  invuln: number; // s remaining
  cooldown: number; // s until next shot allowed
}
interface Asteroid {
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
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
}

function init() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('game-bg') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;

  let mode: Mode = 'ambient';
  let score = 0;
  let lives = START_LIVES;
  let gameOver = false;

  let ship = spawnShip();
  let asteroids: Asteroid[] = [];
  let bullets: Bullet[] = [];

  // Player intent. In ambient mode the bot writes these instead.
  const input = { left: false, right: false, thrust: false, fire: false };

  // Dot colour pulled from the resolved theme (canvas CSS `color`), so the game
  // tracks light/dark — identical trick to the grid background.
  let rgb = '28, 24, 18';
  function readThemeColor() {
    const parsed = toRgb(getComputedStyle(canvas!).color);
    if (parsed) rgb = parsed;
  }

  // ---- HUD / overlay DOM (lives in GameBackground.astro) ----
  const root = document.documentElement;
  const scoreEl = document.querySelector<HTMLElement>('[data-game-score]');
  const livesEl = document.querySelector<HTMLElement>('[data-game-lives]');
  const messageEl = document.querySelector<HTMLElement>('[data-game-message]');
  const toggleBtn = document.querySelector<HTMLButtonElement>('.game-toggle');

  function spawnShip(): Ship {
    return {
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      invuln: RESPAWN_INVULN,
      cooldown: 0,
    };
  }

  function makeAsteroid(tier: number, x?: number, y?: number): Asteroid {
    const r = AST_RADIUS[tier];
    const verts: number[] = [];
    const n = 9 + tier;
    for (let i = 0; i < n; i++) verts.push(0.78 + Math.random() * 0.42);
    const speed = AST_BASE_SPEED * (1 + (2 - tier) * 0.45);
    const dir = Math.random() * Math.PI * 2;
    return {
      x: x ?? Math.random() * width,
      y: y ?? Math.random() * height,
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
  function spawnAwayFromShip(tier: number): Asteroid {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = Math.random() * width;
      y = Math.random() * height;
      tries++;
    } while (Math.hypot(x - ship.x, y - ship.y) < 180 && tries < 20);
    return makeAsteroid(tier, x, y);
  }

  function startWave(count: number) {
    for (let i = 0; i < count; i++) asteroids.push(spawnAwayFromShip(2));
  }

  function resetPlay() {
    score = 0;
    lives = START_LIVES;
    gameOver = false;
    bullets = [];
    asteroids = [];
    ship = spawnShip();
    startWave(PLAY_WAVE);
    updateHud();
  }

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (livesEl) livesEl.textContent = String(Math.max(0, lives));
    if (messageEl) messageEl.hidden = !gameOver;
  }

  // ---- Mode switching ----
  function enterPlay() {
    if (mode === 'play') return;
    mode = 'play';
    root.dataset.game = 'play';
    toggleBtn?.setAttribute('aria-pressed', 'true');
    document.dispatchEvent(new CustomEvent('grid:pause'));
    resetPlay();
  }

  function exitPlay() {
    if (mode !== 'play') return;
    mode = 'ambient';
    delete root.dataset.game;
    toggleBtn?.setAttribute('aria-pressed', 'false');
    document.dispatchEvent(new CustomEvent('grid:resume'));
    input.left = input.right = input.thrust = input.fire = false;
    // Hand the field back to the bot with a calm number of rocks.
    bullets = [];
    ship = spawnShip();
  }

  function fire() {
    if (ship.cooldown > 0) return;
    ship.cooldown = FIRE_COOLDOWN;
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * SHIP_R,
      y: ship.y + Math.sin(ship.angle) * SHIP_R,
      vx: ship.vx + Math.cos(ship.angle) * BULLET_SPEED,
      vy: ship.vy + Math.sin(ship.angle) * BULLET_SPEED,
      ttl: BULLET_TTL,
    });
  }

  // ---- Autoplay bot: aim at the nearest rock, fire when lined up, veer off
  //      when one gets close. Writes the same intent flags the player would. ----
  function botThink() {
    input.left = input.right = input.thrust = input.fire = false;
    let nearest: Asteroid | null = null;
    let best = Infinity;
    for (const a of asteroids) {
      const d = Math.hypot(a.x - ship.x, a.y - ship.y);
      if (d < best) {
        best = d;
        nearest = a;
      }
    }
    if (!nearest) {
      input.thrust = Math.random() < 0.01;
      return;
    }
    const aim = Math.atan2(nearest.y - ship.y, nearest.x - ship.x);
    const danger = best < 130;
    // When in danger, steer away from the rock; otherwise steer onto it.
    const target = danger ? aim + Math.PI : aim;
    const diff = normalizeAngle(target - ship.angle);
    if (diff > 0.05) input.right = true;
    else if (diff < -0.05) input.left = true;
    input.thrust = danger || best > 340;
    input.fire = !danger && Math.abs(normalizeAngle(aim - ship.angle)) < 0.16;
  }

  // ---- Per-frame update ----
  function update(dt: number) {
    if (mode === 'ambient') {
      botThink();
      // Keep the idle field populated.
      if (asteroids.length < AMBIENT_TARGET) asteroids.push(spawnAwayFromShip(2));
    }

    const piloting = mode === 'ambient' || !gameOver;

    if (piloting) {
      if (input.left) ship.angle -= TURN_RATE * dt;
      if (input.right) ship.angle += TURN_RATE * dt;
      if (input.thrust) {
        ship.vx += Math.cos(ship.angle) * THRUST * dt;
        ship.vy += Math.sin(ship.angle) * THRUST * dt;
      }
      if (input.fire) fire();

      const drag = Math.pow(FRICTION, dt);
      ship.vx *= drag;
      ship.vy *= drag;
      ship.x = wrap(ship.x + ship.vx * dt, width);
      ship.y = wrap(ship.y + ship.vy * dt, height);
      ship.cooldown = Math.max(0, ship.cooldown - dt);
      ship.invuln = Math.max(0, ship.invuln - dt);
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x = wrap(b.x + b.vx * dt, width);
      b.y = wrap(b.y + b.vy * dt, height);
      b.ttl -= dt;
      if (b.ttl <= 0) bullets.splice(i, 1);
    }

    // Asteroids
    for (const a of asteroids) {
      a.x = wrap(a.x + a.vx * dt, width);
      a.y = wrap(a.y + a.vy * dt, height);
      a.rot += a.spin * dt;
    }

    handleCollisions();
  }

  function handleCollisions() {
    // Bullet → asteroid.
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < a.r) {
          bullets.splice(j, 1);
          asteroids.splice(i, 1);
          if (mode === 'play') {
            score += AST_SCORE[a.tier];
            updateHud();
          }
          if (a.tier > 0) {
            asteroids.push(makeAsteroid(a.tier - 1, a.x, a.y));
            asteroids.push(makeAsteroid(a.tier - 1, a.x, a.y));
          }
          break;
        }
      }
    }

    // Asteroid → ship (only consequential while playing and vulnerable).
    if (mode === 'play' && !gameOver && ship.invuln <= 0) {
      for (const a of asteroids) {
        if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.r + SHIP_R) {
          lives -= 1;
          if (lives <= 0) {
            gameOver = true;
          } else {
            ship = spawnShip();
          }
          updateHud();
          break;
        }
      }
    }

    // Cleared the field in play mode → next wave.
    if (mode === 'play' && !gameOver && asteroids.length === 0) {
      startWave(PLAY_WAVE);
    }
  }

  // ---- Render ----
  function render() {
    ctx!.clearRect(0, 0, width, height);
    const alpha = mode === 'play' ? PLAY_ALPHA : AMBIENT_ALPHA;
    ctx!.lineWidth = mode === 'play' ? 1.6 : 1.2;
    ctx!.lineJoin = 'round';

    for (const a of asteroids) drawAsteroid(a, alpha);

    ctx!.fillStyle = `rgba(${rgb}, ${alpha})`;
    for (const b of bullets) {
      ctx!.beginPath();
      ctx!.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
      ctx!.fill();
    }

    // Ship blinks while invulnerable so a respawn is legible.
    const blink = ship.invuln > 0 && Math.floor(ship.invuln * 8) % 2 === 0;
    if (!blink && !(mode === 'play' && gameOver)) drawShip(alpha);
  }

  function drawShip(alpha: number) {
    const { x, y, angle } = ship;
    const nose = SHIP_R + 3;
    const back = 2.6; // rad spread of the rear corners
    ctx!.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx!.beginPath();
    ctx!.moveTo(x + Math.cos(angle) * nose, y + Math.sin(angle) * nose);
    ctx!.lineTo(
      x + Math.cos(angle + back) * SHIP_R,
      y + Math.sin(angle + back) * SHIP_R,
    );
    ctx!.lineTo(
      x + Math.cos(angle - back) * SHIP_R,
      y + Math.sin(angle - back) * SHIP_R,
    );
    ctx!.closePath();
    ctx!.stroke();

    // Thrust flame flickers behind the ship.
    if (input.thrust && Math.random() > 0.35) {
      const fl = SHIP_R + 6 + Math.random() * 4;
      ctx!.beginPath();
      ctx!.moveTo(
        x + Math.cos(angle + back * 0.7) * (SHIP_R - 2),
        y + Math.sin(angle + back * 0.7) * (SHIP_R - 2),
      );
      ctx!.lineTo(x - Math.cos(angle) * fl, y - Math.sin(angle) * fl);
      ctx!.lineTo(
        x + Math.cos(angle - back * 0.7) * (SHIP_R - 2),
        y + Math.sin(angle - back * 0.7) * (SHIP_R - 2),
      );
      ctx!.stroke();
    }
  }

  function drawAsteroid(a: Asteroid, alpha: number) {
    ctx!.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx!.beginPath();
    const n = a.verts.length;
    for (let i = 0; i < n; i++) {
      const ang = a.rot + (i / n) * Math.PI * 2;
      const rr = a.r * a.verts[i];
      const px = a.x + Math.cos(ang) * rr;
      const py = a.y + Math.sin(ang) * rr;
      if (i === 0) ctx!.moveTo(px, py);
      else ctx!.lineTo(px, py);
    }
    ctx!.closePath();
    ctx!.stroke();
  }

  // ---- Main loop ----
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  // ---- Sizing ----
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas!.width = Math.floor(width * dpr);
    canvas!.height = Math.floor(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- Wiring ----
  resize();
  readThemeColor();
  ship = spawnShip();
  startWave(AMBIENT_TARGET);
  canvas.classList.add('is-ready');
  toggleBtn?.removeAttribute('hidden'); // reveal the header button (motion is allowed here)
  requestAnimationFrame(frame);

  let resizeTimer: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });

  new MutationObserver(readThemeColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // Header button (and any other trigger) toggles play.
  document.addEventListener('game:toggle', () => {
    if (mode === 'play') exitPlay();
    else enterPlay();
  });

  // ---- Keyboard (only while playing, so the rest of the page is untouched) ----
  function keyFlag(e: KeyboardEvent, down: boolean): boolean {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        input.left = down;
        return true;
      case 'ArrowRight':
      case 'd':
      case 'D':
        input.right = down;
        return true;
      case 'ArrowUp':
      case 'w':
      case 'W':
        input.thrust = down;
        return true;
      case ' ':
      case 'Spacebar':
        input.fire = down;
        return true;
      default:
        return false;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (mode !== 'play') return;
    if (e.key === 'Escape') {
      exitPlay();
      return;
    }
    if (gameOver && (e.key === ' ' || e.key === 'Enter')) {
      resetPlay();
      e.preventDefault();
      return;
    }
    if (keyFlag(e, true)) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    if (mode !== 'play') return;
    if (keyFlag(e, false)) e.preventDefault();
  });

  // ---- On-screen touch controls (shown in the overlay on coarse pointers) ----
  document.querySelectorAll<HTMLElement>('[data-game-control]').forEach((btn) => {
    const action = btn.dataset.gameControl as keyof typeof input;
    const set = (down: boolean) => (e: Event) => {
      e.preventDefault();
      if (gameOver) {
        if (down) resetPlay();
        return;
      }
      if (action in input) input[action] = down;
    };
    btn.addEventListener('pointerdown', set(true));
    btn.addEventListener('pointerup', set(false));
    btn.addEventListener('pointercancel', set(false));
    btn.addEventListener('pointerleave', set(false));
  });

  // Close button in the overlay.
  document
    .querySelector<HTMLButtonElement>('[data-game-close]')
    ?.addEventListener('click', exitPlay);

  // While idling, a click on the page background (not on a link/button/field)
  // drops a fresh asteroid at the cursor for the bot to chase.
  const INTERACTIVE =
    'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable]';
  window.addEventListener('click', (e) => {
    if (mode !== 'ambient') return;
    if (asteroids.length >= AMBIENT_MAX) return;
    if ((e.target as HTMLElement | null)?.closest(INTERACTIVE)) return;
    asteroids.push(makeAsteroid(2, e.clientX, e.clientY));
  });
}

/** Wrap a coordinate into [0, size) for the toroidal playfield. */
function wrap(v: number, size: number): number {
  if (v < 0) return v + size;
  if (v >= size) return v - size;
  return v;
}

/** Normalise an angle to (-π, π]. */
function normalizeAngle(a: number): number {
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

/** Normalise a CSS colour (hex or rgb()) to an "r, g, b" string, or null. */
function toRgb(value: string): string | null {
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.replace(/./g, (ch) => ch + ch);
    if (hex.length !== 6) return null;
    const num = parseInt(hex, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }
  const m = value.match(/(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return m ? `${m[1]}, ${m[2]}, ${m[3]}` : null;
}

try {
  init();
} catch (error) {
  console.error('[asteroids] disabled after error:', error);
}

export {};
