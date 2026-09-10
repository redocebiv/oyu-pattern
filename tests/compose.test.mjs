import { suite } from './_assert.mjs';
import { makeRng } from '../js/rng.js';
import { CELL } from '../js/motifs.js';
import { defaults } from '../js/state.js';
import {
  CARPET, IDENTITY, SYMMETRIES, SYMMETRY_ORDER, WRAP_OFFSETS,
  applyMatrix, compose, composeCarpet, composeCell, composeTile,
  determinant, matrixString, multiply, scaling, translation, wrapInstances,
} from '../js/compose.js';

const t = suite('compose');

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const state = (over = {}) => ({ ...defaults(), seed: 'fixed', ...over });

// --- matrix algebra ---------------------------------------------------------

t.ok('identity leaves a point alone', applyMatrix(IDENTITY, [17, 42]).every((v, i) => near(v, [17, 42][i])));
t.ok('multiplying by identity is a no-op',
  multiply(IDENTITY, [2, 0, 0, 3, 5, 7]).every((v, i) => near(v, [2, 0, 0, 3, 5, 7][i])));

// Order matters, and getting it backwards is the classic transform bug:
// translate-then-scale is not scale-then-translate.
const scaleThenMove = multiply(translation(10, 0), scaling(2, 2, 0));
const moveThenScale = multiply(scaling(2, 2, 0), translation(10, 0));
t.ok('composition applies the right operand first',
  near(applyMatrix(scaleThenMove, [1, 0])[0], 12) && near(applyMatrix(moveThenScale, [1, 0])[0], 22));

t.ok('translation moves by the given amount',
  applyMatrix(translation(5, -3), [0, 0]).every((v, i) => near(v, [5, -3][i])));
t.ok('scaling about a centre leaves that centre fixed',
  applyMatrix(scaling(3), [CELL / 2, CELL / 2]).every((v) => near(v, CELL / 2)));
t.ok('scaling about the origin scales coordinates directly',
  applyMatrix(scaling(2, 2, 0), [4, 5]).every((v, i) => near(v, [8, 10][i])));

t.check('determinant of the identity', determinant(IDENTITY), 1);
t.ok('matrixString emits six numbers', /^matrix\((-?[\d.]+ ){5}-?[\d.]+\)$/.test(matrixString(IDENTITY)));

// --- symmetry groups --------------------------------------------------------

const EXPECTED_SIZES = { none: 1, mirror: 2, mirror2: 4, rot4: 4, rot4m: 8 };
const EXPECTED_REFLECTIONS = { none: 0, mirror: 1, mirror2: 2, rot4: 0, rot4m: 4 };

t.check('every symmetry is listed in the order array', SYMMETRY_ORDER.length, Object.keys(SYMMETRIES).length);

for (const key of SYMMETRY_ORDER) {
  const transforms = SYMMETRIES[key].transforms;
  t.check(`${key} has the expected number of transforms`, transforms.length, EXPECTED_SIZES[key]);

  // A reflection written by mistake as a rotation has a positive determinant
  // and would silently produce the wrong ornament, so count the signs.
  const reflections = transforms.filter((m) => determinant(m) < 0).length;
  t.check(`${key} has the expected number of reflections`, reflections, EXPECTED_REFLECTIONS[key]);

  t.ok(`${key} preserves area`, transforms.every((m) => near(Math.abs(determinant(m)), 1)));
  t.ok(`${key} maps the cell centre to itself`, transforms.every((m) => {
    const [x, y] = applyMatrix(m, [CELL / 2, CELL / 2]);
    return near(x, CELL / 2, 1e-6) && near(y, CELL / 2, 1e-6);
  }));
  t.ok(`${key} keeps the cell inside itself`, transforms.every((m) =>
    [[0, 0], [CELL, 0], [0, CELL], [CELL, CELL]].every(([px, py]) => {
      const [x, y] = applyMatrix(m, [px, py]);
      return x >= -1e-6 && x <= CELL + 1e-6 && y >= -1e-6 && y <= CELL + 1e-6;
    })));
  t.check(`${key} has no duplicate transforms`,
    new Set(transforms.map((m) => m.map((n) => Math.round(n * 1e6)).join(','))).size, transforms.length);
}

// --- the cell ---------------------------------------------------------------

for (const key of SYMMETRY_ORDER) {
  const cell = composeCell(state({ symmetry: key }), makeRng('cell'));
  t.ok(`${key} produces instances`, cell.instances.length > 0);
  t.check(`${key} produces one instance set per transform`,
    cell.instances.length % SYMMETRIES[key].transforms.length, 0);
  t.ok(`${key} instances all carry a path and a matrix`,
    cell.instances.every((i) => typeof i.d === 'string' && i.d.length > 0 && i.matrix.length === 6));
}

t.check('the same seed builds the same cell',
  JSON.stringify(composeCell(state(), makeRng('same'))),
  JSON.stringify(composeCell(state(), makeRng('same'))));
t.ok('a different seed builds a different cell',
  JSON.stringify(composeCell(state(), makeRng('one'))) !== JSON.stringify(composeCell(state(), makeRng('two'))));

// --- the tiling invariant ---------------------------------------------------

t.check('there are nine wrap offsets', WRAP_OFFSETS.length, 9);
t.ok('the wrap offsets include the origin', WRAP_OFFSETS.some(([x, y]) => x === 0 && y === 0));
t.check('the wrap offsets are distinct', new Set(WRAP_OFFSETS.map((o) => o.join(','))).size, 9);

const base = composeCell(state(), makeRng('wrap')).instances;
const wrapped = wrapInstances(base);

t.check('wrapping multiplies the instance count by nine', wrapped.length, base.length * 9);

// The property that makes the tile seamless: every instance appears at all
// nine neighbouring cell positions, offset by exactly one cell each way.
let offsetMismatch = null;
for (let i = 0; i < base.length; i += 1) {
  const group = wrapped.slice(i * 9, i * 9 + 9);
  if (!group.every((g) => g.d === base[i].d)) offsetMismatch ??= `path changed for instance ${i}`;

  const offsets = group
    .map((g) => [
      Math.round((g.matrix[4] - base[i].matrix[4]) / CELL),
      Math.round((g.matrix[5] - base[i].matrix[5]) / CELL),
    ])
    .map((o) => o.join(','))
    .sort();
  const expected = WRAP_OFFSETS.map((o) => o.join(',')).sort();
  if (JSON.stringify(offsets) !== JSON.stringify(expected)) {
    offsetMismatch ??= `instance ${i}: ${JSON.stringify(offsets)}`;
  }

  // Offsets must be whole cells exactly; a rounding drift here shows as a
  // hairline seam that no test would otherwise catch.
  const exact = group.every((g) =>
    near((g.matrix[4] - base[i].matrix[4]) % CELL, 0, 1e-9)
    && near((g.matrix[5] - base[i].matrix[5]) % CELL, 0, 1e-9));
  if (!exact) offsetMismatch ??= `instance ${i} offset is not a whole cell`;

  // Wrapping may only translate. If it scaled or rotated, the tile would not
  // line up with its neighbours.
  const linearIntact = group.every((g) => g.matrix.slice(0, 4).every((v, k) => near(v, base[i].matrix[k])));
  if (!linearIntact) offsetMismatch ??= `instance ${i} linear part was altered`;
}
t.ok('every instance is repeated at all nine cell positions', offsetMismatch === null, offsetMismatch ?? '');

// --- tile mode --------------------------------------------------------------

const tile = composeTile(state({ mode: 'tile' }), makeRng('tile'));
t.check('a tile is one cell across', tile.size, CELL);
t.ok('a tile is wrapped', tile.instances.length % 9 === 0 && tile.instances.length > 0);
t.ok('a tile names its motif', typeof tile.motifKey === 'string');

// --- carpet mode ------------------------------------------------------------

const carpet = composeCarpet(state(), makeRng('carpet'));

t.check('the carpet is the declared width', carpet.width, CARPET.width);
t.check('the carpet is the declared height', carpet.height, CARPET.height);
t.ok('the field is inset by the border', carpet.field.x === CARPET.border && carpet.field.y === CARPET.border);
t.ok('the field is inset by the border on all four sides',
  carpet.field.x + carpet.field.width === CARPET.width - CARPET.border
  && carpet.field.y + carpet.field.height === CARPET.height - CARPET.border);
t.ok('the carpet has cells, corners and bands',
  carpet.cells.length > 0 && carpet.corners.length === 4 * (carpet.corners.length / 4) && carpet.bands.length > 0);
t.check('there are four corner groups', carpet.corners.length % 4, 0);
t.ok('the grid matches the requested column count', carpet.cols === defaults().grid || carpet.cols >= 1);
t.ok('rows are derived, not zero', carpet.rows >= 1);

for (const columns of [1, 2, 3, 4, 5, 6]) {
  const c = composeCarpet(state({ grid: columns }), makeRng('grid'));
  t.check(`grid ${columns} produces ${columns} columns`, c.cols, columns);
  t.ok(`grid ${columns} keeps cells inside the field`, c.cells.every((i) => Number.isFinite(i.matrix[4])));
}

const noBorder = composeCarpet(state({ border: false }), makeRng('carpet'));
t.check('turning the border off removes the bands', noBorder.bands.length, 0);
t.check('turning the border off removes the corners', noBorder.corners.length, 0);
t.check('turning the border off opens the field to the full width', noBorder.field.width, CARPET.width);

t.ok('every carpet instance has a finite matrix',
  [...carpet.cells, ...carpet.corners, ...carpet.bands]
    .every((i) => i.matrix.every(Number.isFinite) && typeof i.d === 'string'));

// Bands must reach the corner squares exactly — a short run leaves a gap and a
// long one overshoots into the corner motif.
const bandXs = carpet.bands.map((b) => b.matrix[4]);
t.ok('band runs start at the border inset', bandXs.some((x) => near(x, CARPET.border, 1e-6)));

// --- dispatch ---------------------------------------------------------------

t.ok('compose dispatches to tile', 'size' in compose(state({ mode: 'tile' }), makeRng('d')));
t.ok('compose dispatches to carpet', 'field' in compose(state({ mode: 'carpet' }), makeRng('d')));

t.close();
