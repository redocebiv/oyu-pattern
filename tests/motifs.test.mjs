import { suite } from './_assert.mjs';
import { makeRng } from '../js/rng.js';
import {
  BAND_HEIGHT, BORDERS, BORDER_ORDER, CELL, MOTIFS, MOTIF_ORDER,
  buildMotif, mirrorX, rotate, toPath,
} from '../js/motifs.js';

const t = suite('motifs');

const NUM = '-?\\d+(?:\\.\\d+)?';
const PATH_SYNTAX = new RegExp(`^M${NUM} ${NUM}(?: C${NUM} ${NUM} ${NUM} ${NUM} ${NUM} ${NUM})*(?: Z)?$`);

const points = (s) => [s.start, ...s.curves.flat()];
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const samePoints = (a, b, eps = 1e-6) =>
  a.length === b.length && a.every((p, i) => near(p[0], b[i][0], eps) && near(p[1], b[i][1], eps));

// --- every motif, over many seeds -------------------------------------------

const SEEDS = ['a', 'b', 'c', 'd', 'seed-1', 'seed-2', 'zzz', '999'];

t.check('the catalogue matches the order list', MOTIF_ORDER.length, Object.keys(MOTIFS).length);

for (const key of MOTIF_ORDER) {
  const motif = MOTIFS[key];
  t.ok(`${key} is named in Kazakh`, typeof motif.kk === 'string' && motif.kk.length > 0);
  t.ok(`${key} carries a meaning`, typeof motif.meaning === 'string' && motif.meaning.length > 0);

  let badPath = null;
  let badCoord = null;
  let empty = false;

  for (const seed of SEEDS) {
    const subpaths = motif.build(makeRng(seed));
    if (subpaths.length === 0) empty = true;
    for (const subpath of subpaths) {
      const d = toPath(subpath);
      if (!PATH_SYNTAX.test(d)) badPath ??= `${seed}: ${d.slice(0, 80)}`;
      for (const [x, y] of points(subpath)) {
        // Motifs may bleed past the cell, but never wildly — a NaN or a runaway
        // control point is the failure this catches.
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < -60 || x > CELL + 60 || y < -60 || y > CELL + 60) {
          badCoord ??= `${seed}: ${x},${y}`;
        }
      }
    }
  }

  t.ok(`${key} always produces subpaths`, !empty);
  t.ok(`${key} emits valid path syntax`, badPath === null, badPath ?? '');
  t.ok(`${key} keeps coordinates finite and bounded`, badCoord === null, badCoord ?? '');

  const first = motif.build(makeRng('repeat')).map(toPath).join('|');
  const second = motif.build(makeRng('repeat')).map(toPath).join('|');
  t.check(`${key} is reproducible from its seed`, first, second);

  const other = motif.build(makeRng('different')).map(toPath).join('|');
  t.ok(`${key} varies with the seed`, first !== other);
}

// --- mirroring --------------------------------------------------------------

const sample = MOTIFS.qoshqar.build(makeRng('mirror-test'))[1];

t.ok('mirrorX reflects x about the cell centre',
  points(mirrorX(sample)).every((p, i) => near(p[0], CELL - points(sample)[i][0])));
t.ok('mirrorX leaves y untouched',
  points(mirrorX(sample)).every((p, i) => near(p[1], points(sample)[i][1])));
t.ok('mirrorX is its own inverse', samePoints(points(mirrorX(mirrorX(sample))), points(sample)));
t.check('mirrorX preserves the close flag', mirrorX(sample).close, sample.close);

// --- rotation ---------------------------------------------------------------

t.ok('a full turn is the identity', samePoints(points(rotate(sample, 360)), points(sample), 1e-9));
t.ok('two half turns are the identity', samePoints(points(rotate(rotate(sample, 180), 180)), points(sample), 1e-9));
t.ok('four quarter turns are the identity',
  samePoints(points([90, 90, 90, 90].reduce((s) => rotate(s, 90), sample)), points(sample), 1e-9));

const half = CELL / 2;
const radius = ([x, y]) => Math.hypot(x - half, y - half);
t.ok('rotation preserves distance from the centre',
  points(rotate(sample, 37)).every((p, i) => near(radius(p), radius(points(sample)[i]), 1e-9)));

// Rotation must actually move things, or a bug that returns the input silently
// passes every identity check above.
t.ok('a quarter turn actually moves points', !samePoints(points(rotate(sample, 90)), points(sample)));

// --- border bands -----------------------------------------------------------

t.check('the band catalogue matches its order list', BORDER_ORDER.length, Object.keys(BORDERS).length);

for (const key of BORDER_ORDER) {
  const band = BORDERS[key];
  const subpaths = band.build();
  t.ok(`${key} is named in Kazakh`, typeof band.kk === 'string' && band.kk.length > 0);
  t.ok(`${key} emits valid path syntax`, subpaths.every((s) => PATH_SYNTAX.test(toPath(s))));

  for (const subpath of subpaths) {
    const end = subpath.curves.at(-1)[2];
    // A band that does not start and end at the same height shows a step at
    // every repeat, which is the whole failure mode for a running border.
    t.ok(`${key} starts and ends at the same height`, near(subpath.start[1], end[1]));
    t.ok(`${key} spans exactly one cell width`, near(subpath.start[0], 0) && near(end[0], CELL));
    t.ok(`${key} stays inside the band height`,
      points(subpath).every(([, y]) => y >= -2 && y <= BAND_HEIGHT + 2));
  }
}

// --- buildMotif and mix -----------------------------------------------------

for (const key of MOTIF_ORDER) {
  t.check(`buildMotif returns the key it was asked for (${key})`, buildMotif(key, makeRng('x')).key, key);
}
t.ok('an unknown key falls back rather than throwing', buildMotif('nonsense', makeRng('x')).subpaths.length > 0);

const mixKeys = new Set(SEEDS.map((s) => buildMotif('mix', makeRng(s)).key));
t.ok('mix draws from the catalogue', [...mixKeys].every((k) => MOTIF_ORDER.includes(k)));
t.ok('mix does not always pick the same motif', mixKeys.size > 1);
t.check('mix is reproducible from its seed', buildMotif('mix', makeRng('fixed')).key, buildMotif('mix', makeRng('fixed')).key);

t.close();
