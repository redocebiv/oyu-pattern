/**
 * The motif library.
 *
 * Every motif is built as point data, not as a hand-written path string, so
 * mirroring is a real coordinate transform and the shapes can be asserted
 * numerically in tests. Serialising to an SVG `d` happens at the very end.
 *
 * All motifs are drawn in a 0–100 cell. They are rendered as *strokes*, not
 * fills: a thick round-capped stroke reads as the fat felt ribbon of a syrmaq,
 * a thin one reads as fine line ornament, and the same geometry serves both.
 *
 * Shapes follow the documented forms — the horn (мүйіз) with its arcuate,
 * spiralling line is the primary element of Kazakh ornament, and the motifs are
 * named after the animal parts they derive from.
 */

export const CELL = 100;

const round = (n) => Math.round(n * 100) / 100;

/** A subpath: a start point, a run of cubic curves, and whether it closes. */
const sub = (start, curves = [], close = false) => ({ start, curves, close });

/** Reflect a subpath across the vertical centre line of the cell. */
export function mirrorX(subpath) {
  const flip = ([x, y]) => [CELL - x, y];
  return {
    start: flip(subpath.start),
    curves: subpath.curves.map(([c1, c2, end]) => [flip(c1), flip(c2), flip(end)]),
    close: subpath.close,
  };
}

/** Rotate a subpath about the cell centre, in degrees. */
export function rotate(subpath, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const half = CELL / 2;
  const spin = ([x, y]) => {
    const dx = x - half;
    const dy = y - half;
    return [half + dx * cos - dy * sin, half + dx * sin + dy * cos];
  };
  return {
    start: spin(subpath.start),
    curves: subpath.curves.map(([c1, c2, end]) => [spin(c1), spin(c2), spin(end)]),
    close: subpath.close,
  };
}

/** Serialise a subpath to an SVG path `d`. */
export function toPath(subpath) {
  const pt = ([x, y]) => `${round(x)} ${round(y)}`;
  let d = `M${pt(subpath.start)}`;
  for (const [c1, c2, end] of subpath.curves) {
    d += ` C${pt(c1)} ${pt(c2)} ${pt(end)}`;
  }
  if (subpath.close) d += ' Z';
  return d;
}

/** A straight segment expressed as a cubic, so every subpath is uniform. */
function line(from, to) {
  const lerp = (t) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  return [lerp(1 / 3), lerp(2 / 3), to];
}

/** Build a closed polygon from a list of vertices. */
function polygon(points) {
  const curves = [];
  for (let i = 1; i < points.length; i += 1) curves.push(line(points[i - 1], points[i]));
  curves.push(line(points[points.length - 1], points[0]));
  return sub(points[0], curves, true);
}

// --- the horn ---------------------------------------------------------------

/**
 * One horn: rises from the stem, curls outward, then rolls back on itself.
 * `curl` tightens or loosens the roll, `reach` sets how far out it swings.
 */
function horn(base, curl, reach) {
  return sub(base, [
    [[50, 38], [50 + 12 * reach, 24], [50 + 26 * reach, 23]],
    [[50 + 38 * reach, 22], [50 + 44 * reach, 33], [50 + 39 * reach, 43]],
    [[50 + 35 * reach, 51], [50 + 24 * reach, 53], [50 + 19 * reach, 46 - 4 * curl]],
    [[50 + 15 * reach, 40 - 6 * curl], [50 + 21 * reach, 34 - 6 * curl], [50 + 27 * reach, 37 - 5 * curl]],
  ]);
}

// --- motifs -----------------------------------------------------------------

export const MOTIFS = {
  qoshqar: {
    kk: 'қошқар мүйіз',
    latin: 'qoshqar müiiz',
    meaning: 'ram’s horn — wealth and fertility',
    build(rng) {
      const curl = rng.range(0.35, 1.65);
      const reach = rng.range(0.72, 1.24);
      const stemTop = rng.range(48, 66);
      const right = horn([50, stemTop], curl, reach);
      return [
        sub([50, 92], [line([50, 92], [50, stemTop])]),
        right,
        mirrorX(right),
      ];
    },
  },

  qosmuiz: {
    kk: 'қос мүйіз',
    latin: 'qos müiiz',
    meaning: 'paired horns',
    build(rng) {
      const curl = rng.range(0.7, 1.25);
      const reach = rng.range(0.7, 0.95);
      // Two horn units joined base to base: the second is the first turned
      // through half a turn, which is what makes the double spiral.
      const upper = horn([50, 50], curl, reach);
      return [upper, rotate(upper, 180)];
    },
  },

  tuietaban: {
    kk: 'түйе табан',
    latin: 'tüie taban',
    meaning: 'camel’s foot — a safe journey',
    build(rng) {
      // A cloven print: two splayed toes over a heel arc. The camel's foot is
      // two toes, so the cleft between them is the whole point of the shape.
      const splay = rng.range(1, 1.28);
      const lean = rng.range(0.85, 1.2);
      const toe = sub([54, 66], [
        [[64 * splay - 4, 62], [70 * splay - 4, 50], [67 * splay - 4, 40 * lean]],
        [[64 * splay - 4, 30 * lean], [58, 24 * lean], [54, 28 * lean]],
        [[50.5, 32 * lean], [51, 50], [54, 66]],
      ], true);
      const heel = sub([34, 74], [
        [[40, 82], [60, 82], [66, 74]],
      ]);
      return [toe, mirrorX(toe), heel];
    },
  },

  tumarsha: {
    kk: 'тұмарша',
    latin: 'tumarsha',
    meaning: 'amulet — wards off the evil eye',
    build(rng) {
      // Nested triangles need a wide gap: at heavy stroke weights a tight
      // nesting merges into one solid shape and the amulet stops reading.
      const spread = rng.range(26, 32);
      const apex = rng.range(14, 20);
      const base = 64;
      const outer = polygon([[50, apex], [50 + spread, base], [50 - spread, base]]);
      const inner = polygon([
        [50, apex + (base - apex) * 0.46],
        [50 + spread * 0.36, base - 4],
        [50 - spread * 0.36, base - 4],
      ]);
      const bead = rng.range(5, 7);
      const pendant = polygon([
        [50, base + 8 - bead], [50 + bead, base + 8], [50, base + 8 + bead], [50 - bead, base + 8],
      ]);
      return [outer, inner, pendant];
    },
  },

  tortushkul: {
    kk: 'төртұшкүл',
    latin: 'törtushkül',
    meaning: 'four sharp angles',
    build(rng) {
      // Four rhombi meeting at a single vertex in the centre, star-like.
      const reach = rng.range(26, 34);
      const waist = rng.range(11, 16);
      const arm = polygon([
        [50, 50],
        [50 + reach / 2, 50 - waist],
        [50 + reach, 50],
        [50 + reach / 2, 50 + waist],
      ]);
      return [arm, rotate(arm, 90), rotate(arm, 180), rotate(arm, 270)];
    },
  },
};

export const MOTIF_ORDER = ['qoshqar', 'qosmuiz', 'tuietaban', 'tumarsha', 'tortushkul'];

// --- border bands -----------------------------------------------------------

/**
 * Bands are drawn in a 100 × 30 strip and repeat along their length. Both start
 * and end at the same height, which is what lets them run round a border
 * without a visible join.
 */
export const BAND_HEIGHT = 30;

export const BORDERS = {
  su: {
    kk: 'су',
    latin: 'su',
    meaning: 'running water',
    build() {
      const wave = [];
      for (let i = 0; i < 4; i += 1) {
        const x = i * 25;
        const dir = i % 2 === 0 ? -1 : 1;
        wave.push([[x + 8, 15 + dir * 12], [x + 17, 15 + dir * 12], [x + 25, 15]]);
      }
      return [sub([0, 15], wave)];
    },
  },

  iyrek: {
    kk: 'ирек',
    latin: 'iyrek',
    meaning: 'zigzag',
    build() {
      const points = [[0, 23]];
      for (let i = 0; i < 4; i += 1) {
        points.push([i * 25 + 12.5, 7], [i * 25 + 25, 23]);
      }
      const curves = [];
      for (let i = 1; i < points.length; i += 1) curves.push(line(points[i - 1], points[i]));
      return [sub(points[0], curves)];
    },
  },
};

export const BORDER_ORDER = ['su', 'iyrek'];

/** Build a motif by key, returning subpaths. `mix` picks one at random. */
export function buildMotif(key, rng) {
  const chosen = key === 'mix' ? rng.pick(MOTIF_ORDER) : key;
  const motif = MOTIFS[chosen] ?? MOTIFS.qoshqar;
  return { key: chosen, subpaths: motif.build(rng) };
}
