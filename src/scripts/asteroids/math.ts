/*
 * Small math helpers for the toroidal playfield and ship steering.
 */

/** Wrap a coordinate into [0, size) for the toroidal playfield. */
export function wrap(v: number, size: number): number {
  if (v < 0) return v + size;
  if (v >= size) return v - size;
  return v;
}

/** Normalise an angle to (-π, π]. */
export function normalizeAngle(a: number): number {
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}
