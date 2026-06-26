/*
 * Input wiring for the Asteroids game. Attaches every document/window listener
 * that turns visitor intent into `state.input` flags or mode changes: the
 * keyboard (play mode only), the on-screen touch controls, the overlay close
 * button, and the ambient background-click that drops a rock for the bot.
 *
 * Mode switching itself (enter/exit/reset) lives elsewhere; this module only
 * calls the handlers it's given. The header `game:toggle` listener and the
 * toggle-button reveal are not wired here — they belong to index.ts.
 */

import { AMBIENT_MAX } from './config';
import { makeAsteroid } from './entities';
import type { Env, GameState, Input } from './types';

export function wireInput(
  env: Env,
  state: GameState,
  handlers: {
    enterPlay: () => void;
    exitPlay: () => void;
    resetPlay: () => void;
  },
): void {
  // ---- Keyboard (only while playing, so the rest of the page is untouched) ----
  function keyFlag(e: KeyboardEvent, down: boolean): boolean {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        state.input.left = down;
        return true;
      case 'ArrowRight':
      case 'd':
      case 'D':
        state.input.right = down;
        return true;
      case 'ArrowUp':
      case 'w':
      case 'W':
        state.input.thrust = down;
        return true;
      case ' ':
      case 'Spacebar':
        state.input.fire = down;
        return true;
      default:
        return false;
    }
  }

  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'play') return;
    if (e.key === 'Escape') {
      handlers.exitPlay();
      return;
    }
    if (state.gameOver && (e.key === ' ' || e.key === 'Enter')) {
      handlers.resetPlay();
      e.preventDefault();
      return;
    }
    if (keyFlag(e, true)) e.preventDefault();
  });
  document.addEventListener('keyup', (e) => {
    if (state.mode !== 'play') return;
    if (keyFlag(e, false)) e.preventDefault();
  });

  // ---- On-screen touch controls (shown in the overlay on coarse pointers) ----
  document.querySelectorAll<HTMLElement>('[data-game-control]').forEach((btn) => {
    const action = btn.dataset.gameControl as keyof Input;
    const set = (down: boolean) => (e: Event) => {
      e.preventDefault();
      if (state.gameOver) {
        if (down) handlers.resetPlay();
        return;
      }
      if (action in state.input) state.input[action] = down;
    };
    btn.addEventListener('pointerdown', set(true));
    btn.addEventListener('pointerup', set(false));
    btn.addEventListener('pointercancel', set(false));
    btn.addEventListener('pointerleave', set(false));
  });

  // Close button in the overlay.
  document
    .querySelector<HTMLButtonElement>('[data-game-close]')
    ?.addEventListener('click', handlers.exitPlay);

  // While idling, a click on the page background (not on a link/button/field)
  // drops a fresh asteroid at the cursor for the bot to chase.
  const INTERACTIVE =
    'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable]';
  window.addEventListener('click', (e) => {
    if (state.mode !== 'ambient') return;
    if (state.asteroids.length >= AMBIENT_MAX) return;
    if ((e.target as HTMLElement | null)?.closest(INTERACTIVE)) return;
    state.asteroids.push(makeAsteroid(env, 2, e.clientX, e.clientY));
  });
}
