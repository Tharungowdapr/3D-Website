export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const remap = (v: number, a: number, b: number) => clamp((v - a) / (b - a));

export const smooth = (t: number) => t * t * (3 - 2 * t);

/** eased remap */
export const seg = (v: number, a: number, b: number) => smooth(remap(v, a, b));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Master story timeline (scroll progress 0..1) */
export const CHAPTERS = {
  hangar: [0.0, 0.07],
  nose: [0.07, 0.15],
  payload: [0.15, 0.23],
  avionics: [0.23, 0.31],
  tanks: [0.31, 0.39],
  engine: [0.39, 0.48],
  exploded: [0.48, 0.56],
  assembly: [0.56, 0.68],
  complete: [0.68, 0.75],
  pad: [0.75, 0.82],
  systems: [0.82, 0.87],
  ignition: [0.87, 0.91],
  liftoff: [0.91, 0.955],
  atmosphere: [0.955, 0.98],
  space: [0.98, 1.0],
} as const;

export type Chapter = keyof typeof CHAPTERS;

export const inChapter = (p: number, c: Chapter) => p >= CHAPTERS[c][0] && p < CHAPTERS[c][1];
