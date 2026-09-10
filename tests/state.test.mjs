import { suite } from './_assert.mjs';
import {
  BAND_KEYS, LIMITS, MODES, MOTIF_KEYS, PALETTE_KEYS, SYMMETRY_KEYS, decode, defaults, encode,
} from '../js/state.js';
import { SYMMETRY_ORDER } from '../js/compose.js';
import { BORDER_ORDER, MOTIF_ORDER, MOTIFS, BORDERS } from '../js/motifs.js';
import { PALETTES, PALETTE_ORDER } from '../js/palette.js';

const t = suite('state');

// --- round trip -------------------------------------------------------------

const sample = {
  ...defaults(),
  seed: 'abc123',
  motif: 'tumarsha',
  symmetry: 'rot4m',
  grid: 4,
  stroke: 6.5,
  scale: 1.25,
  border: false,
  palette: 'custom',
  colorA: '#112233',
  colorB: '#445566',
  mode: 'tile',
  swap: true,
};

t.check('encode then decode is lossless', JSON.stringify(decode(`#${encode(sample)}`)), JSON.stringify(sample));
t.ok('the hash carries no leading marker', !encode(sample).startsWith('#'));
t.ok('decode tolerates a missing leading hash', decode(encode(sample)).seed === 'abc123');

// Every enumerated value must survive a round trip, not just the sample's.
for (const motif of MOTIF_KEYS) {
  t.check(`motif ${motif} survives`, decode(encode({ ...sample, motif })).motif, motif);
}
for (const symmetry of SYMMETRY_KEYS) {
  t.check(`symmetry ${symmetry} survives`, decode(encode({ ...sample, symmetry })).symmetry, symmetry);
}
for (const palette of PALETTE_KEYS) {
  t.check(`palette ${palette} survives`, decode(encode({ ...sample, palette })).palette, palette);
}
for (const mode of MODES) {
  t.check(`mode ${mode} survives`, decode(encode({ ...sample, mode })).mode, mode);
}
for (const band of BAND_KEYS) {
  t.check(`band ${band} survives`, decode(encode({ ...sample, band })).band, band);
}

// --- the accepted values must match the real catalogues ---------------------
//
// These drifted once: the palette list was retyped by hand and fell out of step
// with the palettes themselves, so two real palettes could not be reached from
// a URL and two non-existent ones validated and then resolved to nothing.

t.check('every palette key resolves to a real palette',
  PALETTE_KEYS.filter((k) => k !== 'custom').every((k) => Boolean(PALETTES[k])), true);
t.check('every real palette is reachable',
  PALETTE_ORDER.every((k) => PALETTE_KEYS.includes(k)), true);
t.ok('custom is the only key without a palette',
  PALETTE_KEYS.filter((k) => !PALETTES[k]).join() === 'custom');

t.check('every motif key resolves to a real motif',
  MOTIF_KEYS.filter((k) => k !== 'mix').every((k) => Boolean(MOTIFS[k])), true);
t.check('every real motif is reachable', MOTIF_ORDER.every((k) => MOTIF_KEYS.includes(k)), true);

t.check('every band key resolves to a real band', BAND_KEYS.every((k) => Boolean(BORDERS[k])), true);
t.check('every real band is reachable', BORDER_ORDER.every((k) => BAND_KEYS.includes(k)), true);

t.check('symmetry keys match the symmetry groups',
  JSON.stringify([...SYMMETRY_KEYS].sort()), JSON.stringify([...SYMMETRY_ORDER].sort()));

// --- defaults ---------------------------------------------------------------

const base = defaults();
t.ok('defaults are internally valid', MOTIF_KEYS.includes(base.motif) && SYMMETRY_KEYS.includes(base.symmetry)
  && PALETTE_KEYS.includes(base.palette) && MODES.includes(base.mode) && BAND_KEYS.includes(base.band));
t.ok('each call gets a fresh seed', defaults().seed !== defaults().seed);
t.check('an empty hash gives defaults for everything but the seed',
  JSON.stringify({ ...decode(''), seed: 0 }), JSON.stringify({ ...base, seed: 0 }));

// --- hostile input ----------------------------------------------------------

const hostile = decode('#s=&m=DROP&y=../../etc&g=9999&w=-50&z=abc&b=maybe&p=none&mode=x&ca=zzzzzz&x=2');
t.ok('unknown motif falls back', MOTIF_KEYS.includes(hostile.motif));
t.ok('unknown symmetry falls back', SYMMETRY_KEYS.includes(hostile.symmetry));
t.ok('unknown palette falls back', PALETTE_KEYS.includes(hostile.palette));
t.ok('unknown mode falls back', MODES.includes(hostile.mode));
t.ok('unknown band falls back', BAND_KEYS.includes(hostile.band));
t.check('grid clamps to its ceiling', hostile.grid, LIMITS.grid.max);
t.check('stroke clamps to its floor', hostile.stroke, LIMITS.stroke.min);
t.check('unparseable scale falls back', hostile.scale, base.scale);
t.ok('a non-boolean flag reads as false', hostile.border === false && hostile.swap === false);
t.ok('a malformed colour falls back', /^#[0-9a-f]{6}$/.test(hostile.colorA));
t.ok('an empty seed is replaced, not left blank', hostile.seed.length > 0);

t.ok('grid is always a whole number', Number.isInteger(decode('#g=3.7').grid));
t.ok('decode never throws on junk', (() => { try { decode('#%%%&&&==='); return true; } catch { return false; } })());

// --- custom colours only travel when used -----------------------------------

t.ok('a named palette omits the colour keys', !encode({ ...sample, palette: 'kigiz' }).includes('ca='));
t.ok('a custom palette carries the colour keys', encode({ ...sample, palette: 'custom' }).includes('ca='));

t.close();
