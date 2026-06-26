/*
 * Shared theme-colour helper for the canvas scripts. Each animation draws in a
 * single ink colour that has to track the light/dark theme. The browser
 * resolves the canvas's CSS `color` (set to a theme token) to a concrete
 * rgb(), so we read it back and re-read whenever `data-theme` flips on <html>.
 *
 * Used by grid-background.ts, asteroids.ts, and any future canvas script: call
 * `trackThemeColor(canvas)` once, then read `.rgb` each frame.
 */

/** Normalise a CSS colour (hex or rgb()) to an "r, g, b" string, or null. */
export function toRgb(value: string): string | null {
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

/** Live "r, g, b" string read from an element. */
export interface ThemeColor {
  /** Current colour as an "r, g, b" string, ready for `rgba(${rgb}, a)`. */
  readonly rgb: string;
}

/**
 * Track an element's resolved CSS `color` as an "r, g, b" string, kept in sync
 * as the page theme toggles (a MutationObserver on `data-theme`). Reads once up
 * front; callers read `.rgb` each frame and get a value that follows light/dark
 * for free.
 *
 * @param el        element whose CSS `color` is read (usually the canvas)
 * @param fallback  used until the first successful read, or if parsing fails
 */
export function trackThemeColor(
  el: HTMLElement,
  fallback = '28, 24, 18', // --ink-900
): ThemeColor {
  return track(() => getComputedStyle(el).color, fallback);
}

/**
 * Like `trackThemeColor`, but reads the element's resolved `background-color`
 * (defaults to the page background). Useful for filling shapes with the page
 * colour so they occlude what's behind them, light/dark-aware.
 */
export function trackThemeBackground(
  el: HTMLElement = document.body,
  fallback = '239, 230, 213', // --paper-200
): ThemeColor {
  return track(() => getComputedStyle(el).backgroundColor, fallback);
}

/** Shared: keep `rgb` in sync with `read()`, re-reading on a `data-theme` flip. */
function track(read: () => string, fallback: string): ThemeColor {
  const state = { rgb: fallback };

  function update() {
    const parsed = toRgb(read());
    if (parsed) state.rgb = parsed;
  }

  update();

  // Re-read when the theme toggles (data-theme on <html>).
  new MutationObserver(update).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  return state;
}
