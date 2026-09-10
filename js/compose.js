/**
 * Composition: symmetry, seamless tiling, and carpet layout.
 *
 * Nothing here touches the DOM. Every function returns plain data — arrays of
 * `{d, matrix}` instances — which is what lets the tiling and symmetry
 * invariants be asserted under plain node, and those are exactly the properties
 * that are impossible to eyeball reliably.
 *
 * Matrices are SVG's own six-number form: x' = a·x + c·y + e, y' = b·x + d·y + f.
 */

import { BAND_HEIGHT, BORDERS, CELL, buildMotif, toPath } from './motifs.js';

export const IDENTITY = [1, 0, 0, 1, 0, 0];

/** Apply `second` after `first`. */
export function multiply(second, first) {
  const [a1, b1, c1, d1, e1, f1] = second;
  const [a2, b2, c2, d2, e2, f2] = first;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function applyMatrix([a, b, c, d, e, f], [x, y]) {
  return [a * x + c * y + e, b * x + d * y + f];
}

/** Negative for a reflection, positive for a rotation. */
export function determinant([a, b, c, d]) {
  return a * d - b * c;
}

export function translation(tx, ty) {
  return [1, 0, 0, 1, tx, ty];
}

export function scaling(sx, sy = sx, about = CELL / 2) {
  return [sx, 0, 0, sy, about * (1 - sx), about * (1 - sy)];
}

export function matrixString(m) {
  return `matrix(${m.map((n) => Math.round(n * 10000) / 10000).join(' ')})`;
}

// --- symmetry groups --------------------------------------------------------

const MIRROR_X = [-1, 0, 0, 1, CELL, 0];
const MIRROR_Y = [1, 0, 0, -1, 0, CELL];
const ROT_90 = [0, 1, -1, 0, CELL, 0];
const ROT_180 = [-1, 0, 0, -1, CELL, CELL];
const ROT_270 = [0, -1, 1, 0, 0, CELL];

export const SYMMETRIES = {
  none: { transforms: [IDENTITY] },
  mirror: { transforms: [IDENTITY, MIRROR_X] },
  mirror2: { transforms: [IDENTITY, MIRROR_X, MIRROR_Y, ROT_180] },
  rot4: { transforms: [IDENTITY, ROT_90, ROT_180, ROT_270] },
  rot4m: {
    transforms: [
      IDENTITY, ROT_90, ROT_180, ROT_270,
      MIRROR_X,
      multiply(ROT_90, MIRROR_X),
      multiply(ROT_180, MIRROR_X),
      multiply(ROT_270, MIRROR_X),
    ],
  },
};

export const SYMMETRY_ORDER = ['none', 'mirror', 'mirror2', 'rot4', 'rot4m'];

// --- the unit cell ----------------------------------------------------------

/**
 * One cell's worth of ornament: the motif, scaled, repeated through the
 * symmetry group. Returns instances in cell coordinates (0–CELL).
 */
export function composeCell(state, rng) {
  const { key, subpaths } = buildMotif(state.motif, rng);
  const group = SYMMETRIES[state.symmetry] ?? SYMMETRIES.mirror2;
  const scale = scaling(state.scale);

  const instances = [];
  for (const transform of group.transforms) {
    const matrix = multiply(transform, scale);
    for (const subpath of subpaths) {
      instances.push({ d: toPath(subpath), matrix });
    }
  }
  return { motifKey: key, instances };
}

/** The nine offsets that make a tile wrap. */
export const WRAP_OFFSETS = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy]));

/**
 * Repeat instances at every neighbouring cell position. Clipped to the cell
 * rect at render time, this makes anything leaving one edge re-enter the
 * opposite one, so the tile is seamless by construction rather than by
 * careful placement.
 */
export function wrapInstances(instances, cell = CELL) {
  const wrapped = [];
  for (const instance of instances) {
    for (const [dx, dy] of WRAP_OFFSETS) {
      wrapped.push({
        d: instance.d,
        matrix: multiply(translation(dx * cell, dy * cell), instance.matrix),
      });
    }
  }
  return wrapped;
}

/** Tile mode: one seamless cell. */
export function composeTile(state, rng) {
  const { motifKey, instances } = composeCell(state, rng);
  return { size: CELL, motifKey, instances: wrapInstances(instances) };
}

// --- carpet -----------------------------------------------------------------

export const CARPET = { width: 600, height: 800, border: 56 };

function bandInstances(state) {
  const band = BORDERS[state.band] ?? BORDERS.su;
  const paths = band.build().map(toPath);
  const { width: W, height: H, border: B } = CARPET;
  const depth = B / BAND_HEIGHT;

  const spanH = W - 2 * B;
  const spanV = H - 2 * B;
  const repsH = Math.max(1, Math.round(spanH / (CELL * depth)));
  const repsV = Math.max(1, Math.round(spanV / (CELL * depth)));
  // Stretch each run to fit its edge exactly, so the band meets the corner
  // squares with no gap and no overshoot.
  const sx = spanH / (repsH * CELL);
  const sy = spanV / (repsV * CELL);

  const out = [];
  const push = (matrix) => { for (const d of paths) out.push({ d, matrix }); };

  for (let i = 0; i < repsH; i += 1) {
    push([sx, 0, 0, depth, B + i * CELL * sx, 0]);
    push([-sx, 0, 0, -depth, W - B - i * CELL * sx, H]);
  }
  for (let i = 0; i < repsV; i += 1) {
    push([0, sy, -depth, 0, W, B + i * CELL * sy]);
    push([0, -sy, depth, 0, 0, H - B - i * CELL * sy]);
  }
  return out;
}

/**
 * Carpet mode: a bordered field of cells, the way a syrmaq is laid out —
 * a running band around the edge, a motif in each corner square, and a grid
 * of motifs in the field. Odd rows are mirrored vertically; mirror symmetry
 * is characteristic of Kazakh felt composition.
 */
export function composeCarpet(state, rng) {
  const { width: W, height: H, border: B } = CARPET;
  const hasBorder = Boolean(state.border);
  const inset = hasBorder ? B : 0;

  const fieldW = W - 2 * inset;
  const fieldH = H - 2 * inset;
  const cols = Math.max(1, state.grid);
  const size = fieldW / cols;
  const rows = Math.max(1, Math.round(fieldH / size));
  const cellH = fieldH / rows;

  const cells = [];
  let motifKey = null;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = composeCell(state, rng);
      motifKey ??= cell.motifKey;
      const place = multiply(
        translation(inset + col * size, inset + row * cellH),
        scaling(size / CELL, cellH / CELL, 0),
      );
      const oriented = row % 2 === 1 ? multiply(place, MIRROR_Y) : place;
      for (const instance of cell.instances) {
        cells.push({ d: instance.d, matrix: multiply(oriented, instance.matrix) });
      }
    }
  }

  const corners = [];
  if (hasBorder) {
    const cornerRng = rng;
    const s = B / CELL;
    for (const [cx, cy] of [[0, 0], [W - B, 0], [W - B, H - B], [0, H - B]]) {
      const cell = composeCell({ ...state, symmetry: 'rot4' }, cornerRng);
      const place = multiply(translation(cx, cy), scaling(s, s, 0));
      for (const instance of cell.instances) {
        corners.push({ d: instance.d, matrix: multiply(place, instance.matrix) });
      }
    }
  }

  return {
    width: W,
    height: H,
    field: { x: inset, y: inset, width: fieldW, height: fieldH },
    cells,
    corners,
    bands: hasBorder ? bandInstances(state) : [],
    motifKey,
    rows,
    cols,
  };
}

/** Dispatch on mode. */
export function compose(state, rng) {
  return state.mode === 'tile' ? composeTile(state, rng) : composeCarpet(state, rng);
}
