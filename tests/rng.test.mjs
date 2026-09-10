import { suite } from './_assert.mjs';
import { hashSeed, makeRng, normaliseSeed, randomSeed } from '../js/rng.js';

const t = suite('rng');

// --- reproducibility: the property the whole app rests on ------------------

function draw(seed, n = 20) {
  const rng = makeRng(seed);
  return Array.from({ length: n }, () => rng.next());
}

t.ok('same seed gives the same stream', JSON.stringify(draw('kazakh')) === JSON.stringify(draw('kazakh')));
t.ok('different seeds diverge', JSON.stringify(draw('kazakh')) !== JSON.stringify(draw('kazakj')));
t.ok('a numeric seed also works', makeRng(12345).next() === makeRng(12345).next());

// --- output range -----------------------------------------------------------

const rng = makeRng('range-check');
let min = 1;
let max = 0;
for (let i = 0; i < 5000; i += 1) {
  const v = rng.next();
  if (v < min) min = v;
  if (v > max) max = v;
  if (!(v >= 0 && v < 1)) t.fail(`next() out of [0,1): ${v}`);
}
t.ok('spreads across the unit interval', min < 0.02 && max > 0.98, `min ${min.toFixed(4)} max ${max.toFixed(4)}`);

// --- helpers ----------------------------------------------------------------

const helpers = makeRng('helpers');
for (let i = 0; i < 2000; i += 1) {
  const n = helpers.int(3, 7);
  if (!Number.isInteger(n) || n < 3 || n > 7) t.fail(`int(3,7) produced ${n}`);
  const f = helpers.range(-2, 2);
  if (!(f >= -2 && f < 2)) t.fail(`range(-2,2) produced ${f}`);
}
t.ok('int stays within its inclusive bounds', true);
t.ok('range stays within its bounds', true);

const seen = new Set();
const picker = makeRng('picker');
for (let i = 0; i < 500; i += 1) seen.add(picker.pick(['a', 'b', 'c']));
t.check('pick eventually returns every element', seen.size, 3);
t.ok('pick never returns undefined', !seen.has(undefined));

// int() must be able to reach both ends, which a naive floor() gets wrong
const ends = new Set();
const endRng = makeRng('ends');
for (let i = 0; i < 500; i += 1) ends.add(endRng.int(0, 1));
t.ok('int reaches both bounds', ends.has(0) && ends.has(1));

// --- seed handling ----------------------------------------------------------

t.check('hashSeed is stable', hashSeed('oyu'), hashSeed('oyu'));
t.ok('hashSeed returns a uint32', Number.isInteger(hashSeed('oyu')) && hashSeed('oyu') >= 0);
t.ok('hashSeed separates similar strings', hashSeed('oyu') !== hashSeed('oyv'));

t.check('normalise strips punctuation and case', normaliseSeed('AB-3!x'), 'ab3x');
t.check('normalise caps the length', normaliseSeed('a'.repeat(50)).length, 12);
t.ok('normalise never returns empty', normaliseSeed('!!!').length > 0);
t.ok('randomSeed is six characters', randomSeed().length === 6);
t.ok('randomSeed uses the safe alphabet', /^[a-z0-9]+$/.test(randomSeed()));
t.ok('randomSeed varies', new Set(Array.from({ length: 50 }, randomSeed)).size > 40);

t.close();
