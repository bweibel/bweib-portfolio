# Asteroids — Flying Saucer enemy (implementation spec)

Handoff spec for adding a classic flying-saucer enemy to the background Asteroids
game (`src/scripts/asteroids/`). Target implementer: Sonnet, medium thinking.
Pure-script feature — **no DOM/CSS changes** to `GameBackground.astro` are required.

Match the existing house style: small focused modules, a tunables-only `config.ts`,
no magic numbers in systems, theme-colour read-back, `wrap()` for toroidal motion,
and ambient-vs-play gating via `state.mode`.

## Decisions (locked)

- **Two-tier saucer.** Large = fires in roughly random directions, easier, fewer
  points. Small = aims at the ship with a tightening spread, deadlier, worth more.
  Small becomes more likely as the score climbs.
- **Appears in both modes.** Play mode: a real threat. Ambient: drifts across the
  background and the bot dogfights it; the saucer is *harmless to the ambient ship*
  (ambient ship is already invulnerable — keep it that way).
- **Saucer bullets also destroy asteroids.** They split rocks using the existing
  split logic but award **no player score** and are not "credited" to anyone.
- **One saucer at a time.** `state.saucer` is `Saucer | null`.

## Entity model (`types.ts`)

Add:

```ts
export interface Saucer {
  x: number;
  y: number;
  vx: number;            // horizontal cross velocity (sign = travel direction)
  vy: number;            // current vertical drift; re-rolled on each "jink"
  small: boolean;        // true = small/aimed/deadlier; false = large/random
  r: number;             // collision + draw radius
  fireTimer: number;     // s until next shot
  jinkTimer: number;     // s until next vertical-velocity change
}
```

Extend `GameState` with:

```ts
saucer: Saucer | null;
foeBullets: Bullet[];    // saucer-fired bullets (reuse the Bullet shape)
saucerTimer: number;     // s until the next saucer spawn is allowed
```

Foe bullets reuse `Bullet` (x, y, vx, vy, ttl) but live in their own array so the
four interaction pairs stay unambiguous.

## Config (`config.ts`) — new `SAUCER_*` block

```ts
// ---- Flying saucer ----
export const SAUCER_R_LARGE = 18;
export const SAUCER_R_SMALL = 11;
export const SAUCER_SPEED = 92;            // px/s horizontal cross speed
export const SAUCER_VY_MAX = 46;           // px/s max vertical drift magnitude
export const SAUCER_JINK_MIN = 0.7;        // s between vertical-direction changes
export const SAUCER_JINK_MAX = 1.6;
export const SAUCER_BULLET_SPEED = 300;    // px/s
export const SAUCER_BULLET_TTL = 1.4;      // s
export const SAUCER_FIRE_INTERVAL = 1.25;  // s between shots (large)
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

export const SAUCER_EDGE_MARGIN = 40;      // px off-screen for spawn / despawn
export const SAUCER_SHAKE = 3;             // px shake on a saucer kill (play)
export const SAUCER_EXPLOSION_COUNT = 10;  // sparks on a saucer kill (play)
```

## New module: `saucer.ts` (lifecycle)

Owns the saucer the way `bot.ts` owns the bot. Export `updateSaucer(env, state, dt)`,
called from the `update()` loop in `index.ts` in **both** modes.

Responsibilities each frame:

1. **Spawn scheduling.** If `state.saucer === null`, decrement `state.saucerTimer`;
   when `<= 0`, spawn one (see below) — *unless* (play mode) the field is empty and
   `gameOver`. After spawning, the next timer is rolled when the saucer despawns/dies
   (do it at spawn-clear sites, not here).
2. **Movement.** Integrate x by `vx*dt` (NO horizontal wrap), y by `vy*dt` **with**
   `wrap(y, env.height)`. Decrement `jinkTimer`; on `<= 0`, set `vy` to a random value
   in `[-SAUCER_VY_MAX, +SAUCER_VY_MAX]` and reroll `jinkTimer` in the jink range.
3. **Firing.** Decrement `fireTimer`; on `<= 0`, push a foe bullet (see firing) and
   reset `fireTimer` to the tier's interval.
4. **Despawn.** When the saucer crosses past the far edge
   (`x < -SAUCER_EDGE_MARGIN` or `x > env.width + SAUCER_EDGE_MARGIN`), set
   `state.saucer = null` and reschedule `state.saucerTimer` (mode-appropriate range).

**Spawn** (`makeSaucer(env, state)` — put the factory in `entities.ts`):
- `small`: `Math.random() < smallChance(state.score)` where `smallChance` lerps
  `BASE → MAX` over `[0, SAUCER_SMALL_CHANCE_AT]`. In ambient, use `BASE` (no score).
- Side: random left/right. Spawn `x` at `-MARGIN` (moving right, `vx = +SPEED`) or
  `width + MARGIN` (moving left, `vx = -SPEED`). `y = random * height`.
- `r = small ? SAUCER_R_SMALL : SAUCER_R_LARGE`. Init `vy = 0`, timers seeded.

**Firing** (`fireSaucer(state, saucer)` in `entities.ts`):
- Origin = saucer centre. Speed = `SAUCER_BULLET_SPEED`, ttl = `SAUCER_BULLET_TTL`.
- **Large:** direction = `Math.random() * 2π` (fully random).
- **Small:** aim at `state.ship` (same ship object in both modes), plus a spread
  `±aimSpread(state.score)/2` where `aimSpread` lerps `MAX → MIN` over
  `[0, SAUCER_AIM_TIGHTEN_AT]`. In ambient use `MAX` (calm, score is 0 anyway).
- Push to `state.foeBullets`.

Helpers `smallChance(score)` and `aimSpread(score)` can live in `saucer.ts` or
`progression.ts` — implementer's choice; keep them pure.

## Physics (`physics.ts`)

Add foe-bullet integration mirroring the existing player-bullet loop: advance with
`wrap()` on both axes, decrement `ttl`, splice when expired. (Saucer movement lives
in `saucer.ts`, consistent with the bot owning its own logic — do **not** move the
saucer here.)

## Collisions (`collisions.ts`) — four new pairs

Add these to `handleCollisions`. Iterate arrays backwards where splicing.

1. **Player bullet → saucer.** If a `state.bullets` entry is within `saucer.r` of the
   saucer: remove the bullet, clear the saucer (`state.saucer = null`), reschedule
   `saucerTimer`.
   - Play: `state.score += small ? SAUCER_SCORE_SMALL : SAUCER_SCORE_LARGE`;
     `spawnExplosion(...SAUCER_EXPLOSION_COUNT, EXPLOSION_SPEED)`;
     `addShake(state, SAUCER_SHAKE)`; `updateHud`.
   - Ambient: toned-down spark burst (like the ambient rock-kill path), **no score**.
2. **Foe bullet → asteroid.** Same split behaviour as a player hit (step down a tier,
   push two fragments at `waveSpeedMul(state)`, spark burst — toned in ambient) but
   **no score** and no HUD change. Remove the foe bullet and the rock.
3. **Foe bullet → ship.** Only consequential in play mode when `!gameOver` and
   `ship.invuln <= 0` — reuse the existing life-loss / respawn / game-over path, then
   remove the bullet. In ambient: do nothing (ship is invulnerable; let the bullet
   continue — it can still hit rocks).
4. **Ship → saucer body.** Play mode, vulnerable ship within `saucer.r + SHIP_R`:
   ship loses a life (existing path) **and** the saucer is destroyed (explosion, clear,
   reschedule) — **no score** for the ram. Ambient: no effect.

Player bullets vs foe bullets: ignore (no interaction).

**Wave-clear note (accepted behaviour):** the existing `asteroids.length === 0 →
advanceWave` check is unchanged. If a saucer's bullet clears the last rock, the wave
advances for free and the saucer persists across the boundary. This is fine for a
background game — do not add suppression logic.

## Render (`render.ts`)

- **`drawSaucer(env, state)`** when `state.saucer` exists. Classic silhouette: a
  horizontal hull (two mirrored trapezoids meeting at a wide waistline) plus a small
  dome on top. Stroke in theme colour at the mode alpha (`PLAY_ALPHA`/`AMBIENT_ALPHA`).
  In play mode, fill the body with `env.bg` first (like `drawAsteroid`) so it occludes
  the grid behind it. Scale all geometry off `saucer.r`.
- **Foe bullets:** draw after player bullets. Make them visually distinct from the
  player's solid `r=1.8` dot so incoming fire is readable while staying monochrome —
  draw a slightly larger dot (`r≈2.3`) with a 1px hollow ring around it. Mode alpha.

## Bot (`bot.ts`) — dogfight

Extend target selection so the saucer is a candidate target: compute distance to
`state.saucer` (if present) alongside the nearest rock; if the saucer is the nearest
threat/target, aim at it and fire using the same "lined up" gate. Optionally treat a
very-close foe bullet or the saucer body as `danger` to veer away from. Keep it loose
and cheap — this only needs to *look* like a dogfight in the background. Do not let bot
changes affect play-mode (the player controls the ship then; `botThink` isn't called).

## State wiring

- **`state.ts` `createState`:** init `saucer: null`, `foeBullets: []`, and
  `saucerTimer` to a random ambient delay.
- **`hud.ts` `resetPlay`:** also reset `saucer = null`, `foeBullets = []`, and
  `saucerTimer` to a random **play** delay (so a saucer can show mid-session, not at t=0).
- **`hud.ts` `exitPlay`:** clear `foeBullets = []` and `saucer = null`, reschedule
  `saucerTimer` to an ambient delay (hand the field back to the bot cleanly).
- **`index.ts`:** call `updateSaucer(env, state, dt)` inside `update()` for both modes
  (place it before `handleCollisions` so a just-spawned saucer can be hit the same frame
  it appears is unnecessary — after `updatePhysics`, before/with collisions is fine;
  match the existing ordering comments).

## Out of scope (do not build)

Extra lives, hyperspace, sound, power-ups, score multiplier, any HUD/DOM/CSS change,
and touching `START_IN_PLAY` (leave the temp testing flag as-is).

## Verification

- `npm run build` passes.
- Prettier-clean on touched files (Header.astro has *pre-existing* warnings — ignore).
- Manual (with `START_IN_PLAY` on): saucer appears within the play spawn window, drifts
  + jinks across, fires (large = random, small = at the ship), can be shot for score,
  splits rocks with its own fire, despawns off the far edge, and rams cost a life.
  Ambient: saucer appears, bot shoots it, ship never dies, motion reads as faint.
- Reduced-motion / no-JS: still completely inert (whole game already gated).
