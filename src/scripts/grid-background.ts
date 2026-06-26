/*
 * Interactive dot grid. Each node has a fixed "home" on a regular grid; the
 * pointer warps nearby nodes, and they ease back home with a simple lerp. Tuned
 * to be felt more than seen — in keeping with the restrained motion in
 * `animate.ts`.
 *
 * Three variants, chosen via the canvas's `data-variant` attribute:
 *   pull   — nodes drift toward the pointer (default)
 *   repel  — nodes push away from the pointer
 *   lines  — pull, plus a connecting mesh that flexes with it (constellation)
 *
 * Reduced-motion / no-JS safety: nothing renders unless the visitor allows
 * motion, so the page looks identical to before for everyone else.
 */

import { trackThemeColor } from './theme-color';

type Variant = 'pull' | 'repel' | 'lines';

// ---- Tunables (small offsets, like the rest of the site's motion). ----
const SPACING = 38; // px between nodes
const DOT_RADIUS = 1.4; // px
const PULL_RADIUS = 230; // px — how close the pointer must be to affect a node
const MAX_PULL = 5; // px — furthest a node travels toward the pointer
const MAX_PUSH = 22; // px — furthest a node is shoved away (repel reads stronger)
const EASE = 0.12; // 0..1 — return-to-home stiffness per frame
const BASE_ALPHA = 0.05; // dot opacity at rest
const ACTIVE_ALPHA = 0.55; // dot opacity when fully affected
const LINE_ALPHA = 0.04; // mesh line opacity at rest (lines variant)

// ---- Scroll motion. Parallax drifts the whole field; the ripple is a
// transient vertical shove the nodes ease back from on a fast scroll. ----
const PARALLAX = 0.15; // grid drift per px scrolled (wrapped to SPACING → seamless)
const SCROLL_FORCE = 0.18; // how much a scroll delta feeds the ripple impulse
const MAX_SCROLL_PUSH = 14; // px — cap on the ripple displacement
const SCROLL_FRICTION = 0.9; // per-frame decay of the ripple toward rest
const SCROLL_ALPHA_GAIN = 0.25; // how much the ripple brightens nodes (0 = none)

interface Dot {
  hx: number; // home x
  hy: number; // home y
  x: number; // current x
  y: number; // current y
}

function init() {
  // Listen to reduced motion prefrence from user
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('grid-bg') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  // All the mutable state the render loop and event handlers share. Grouping it
  // in one object makes the shared surface obvious at a glance — this is the
  // closure's stand-in for a class's fields. (`canvas`/`ctx` stay as consts
  // above: they're fixed for the lifetime of the grid, not state.)
  const state = {
    variant: (canvas.dataset.variant as Variant) || 'pull',

    nodes: [] as Dot[],
    cols: 0,
    rows: 0,
    width: 0,
    height: 0,
    dpr: 1,

    // Pointer kept off-screen until the user actually moves it.
    pointer: { x: -9999, y: -9999, active: false },

    // Scroll state. `scrollPush` is the live ripple displacement that decays
    // toward 0 each frame; `scrollY` tracks position for the parallax drift.
    scrollY: window.scrollY,
    scrollPush: 0,
    scrollQueued: false,

    // Idled while the Asteroids overlay is open (see scripts/asteroids/), so
    // two canvas loops don't run at once during play.
    running: true,
  };

  // Dot colour, pulled from the theme so it tracks light/dark (see theme-color).
  const color = trackThemeColor(canvas);

  function build() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas!.width = Math.floor(state.width * state.dpr);
    canvas!.height = Math.floor(state.height * state.dpr);
    ctx!.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    // Centre the grid so it sits evenly with a soft margin on every side. Two
    // extra rows/cols (and a one-cell head start on the offsets) cover the
    // ±SPACING the field travels under the wrapped parallax drift, so no gap
    // ever shows at the edges.
    state.cols = Math.ceil(state.width / SPACING) + 3;
    state.rows = Math.ceil(state.height / SPACING) + 3;
    const offX = (state.width - (state.cols - 1) * SPACING) / 2;
    const offY = (state.height - (state.rows - 1) * SPACING) / 2;
    state.nodes = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const hx = offX + c * SPACING;
        const hy = offY + r * SPACING;
        state.nodes.push({ hx, hy, x: hx, y: hy });
      }
    }
  }

  /** Advance one node toward its pointer-warped target; returns 0..1 strength. */
  function step(n: Dot): number {
    let tx = n.hx;
    let ty = n.hy;
    let strength = 0;

    if (state.pointer.active) {
      const dx = state.pointer.x - n.hx;
      const dy = state.pointer.y - n.hy;
      const dist = Math.hypot(dx, dy);
      if (dist < PULL_RADIUS && dist > 0.001) {
        // Linear falloff: full strength at the pointer, zero at the radius.
        strength = 1 - dist / PULL_RADIUS;
        // repel pushes the node the other way (negative travel).
        const travel =
          state.variant === 'repel' ? -strength * MAX_PUSH : strength * MAX_PULL;
        tx = n.hx + (dx / dist) * travel;
        ty = n.hy + (dy / dist) * travel;
      }
    }

    // Scroll ripple: a shared vertical shove that decays to 0, so the node's
    // target returns home on its own and the lerp below carries it back.
    ty += state.scrollPush;
    if (state.scrollPush !== 0) {
      strength = Math.min(
        1,
        strength +
          (Math.abs(state.scrollPush) / MAX_SCROLL_PUSH) * SCROLL_ALPHA_GAIN,
      );
    }

    n.x += (tx - n.x) * EASE;
    n.y += (ty - n.y) * EASE;
    return strength;
  }

  function frame() {
    // Ripple eases back to rest a little each frame.
    state.scrollPush *= SCROLL_FRICTION;
    if (Math.abs(state.scrollPush) < 0.01) state.scrollPush = 0;

    // Parallax: shift the whole field by a fraction of the scroll position,
    // wrapped to one cell so it tiles seamlessly however long the page is. A
    // single transform moves dots and mesh together; pointer math stays in
    // untranslated home space.
    const par = -((state.scrollY * PARALLAX) % SPACING);
    ctx!.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx!.clearRect(0, 0, state.width, state.height);
    ctx!.setTransform(state.dpr, 0, 0, state.dpr, 0, par * state.dpr);

    // Lines first, so dots sit on top of the mesh.
    if (state.variant === 'lines') drawMesh();

    for (const n of state.nodes) {
      const strength = step(n);
      const alpha = BASE_ALPHA + (ACTIVE_ALPHA - BASE_ALPHA) * strength;
      ctx!.fillStyle = `rgba(${color.rgb}, ${alpha})`;
      ctx!.beginPath();
      ctx!.arc(n.x, n.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx!.fill();
    }

    if (state.running) requestAnimationFrame(frame);
  }

  /**
   * Connect each node to its right and lower neighbour. The current (warped)
   * positions are used, so the whole mesh stretches as nodes drift — segments
   * fade as they stretch past their resting length.
   */
  function drawMesh() {
    ctx!.lineWidth = 1;
    const { nodes, cols, rows } = state;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = nodes[r * cols + c];
        if (c + 1 < cols) connect(a, nodes[r * cols + c + 1]);
        if (r + 1 < rows) connect(a, nodes[(r + 1) * cols + c]);
      }
    }
  }

  function connect(a: Dot, b: Dot) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    // Fade out as the segment stretches beyond ~1.6× its resting length.
    const slack = Math.max(0, 1 - (len - SPACING) / (SPACING * 0.6));
    if (slack <= 0) return;
    ctx!.strokeStyle = `rgba(${color.rgb}, ${LINE_ALPHA * slack})`;
    ctx!.beginPath();
    ctx!.moveTo(a.x, a.y);
    ctx!.lineTo(b.x, b.y);
    ctx!.stroke();
  }

  // ---- Wiring ----
  build();
  canvas.classList.add('is-ready');
  requestAnimationFrame(frame);

  window.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    state.pointer.active = true;
  });
  window.addEventListener('pointerleave', () => {
    state.pointer.active = false;
  });

  // Scroll feeds the parallax position and the ripple impulse. rAF-throttled,
  // mirroring the header's scroll handler.
  window.addEventListener(
    'scroll',
    () => {
      if (state.scrollQueued) return;
      state.scrollQueued = true;
      requestAnimationFrame(() => {
        state.scrollQueued = false;
        const y = window.scrollY;
        state.scrollPush += (y - state.scrollY) * SCROLL_FORCE;
        if (state.scrollPush > MAX_SCROLL_PUSH)
          state.scrollPush = MAX_SCROLL_PUSH;
        else if (state.scrollPush < -MAX_SCROLL_PUSH)
          state.scrollPush = -MAX_SCROLL_PUSH;
        state.scrollY = y;
      });
    },
    { passive: true },
  );

  // Debounced resize rebuild.
  let resizeTimer: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 150);
  });

  // The Asteroids overlay pauses us while it's open, then resumes us on exit.
  document.addEventListener('grid:pause', () => {
    state.running = false;
  });
  document.addEventListener('grid:resume', () => {
    if (!state.running) {
      state.running = true;
      requestAnimationFrame(frame);
    }
  });

  // Let the prototype page switch variants live without a reload.
  canvas.addEventListener('grid:variant', (e) => {
    state.variant = (e as CustomEvent<Variant>).detail;
  });
}

try {
  init();
} catch (error) {
  console.error('[grid-background] disabled after error:', error);
}

export {};
