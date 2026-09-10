/**
 * Seeded pseudo-random numbers.
 *
 * The whole point is reproducibility: a pattern is identified by its seed, the
 * seed lives in the URL, and the same seed must redraw exactly the same
 * ornament on any machine. So no Math.random anywhere downstream of here.
 *
 * mulberry32 is used because it is nine lines, has no state beyond one 32-bit
 * integer, and passes well enough for decorative geometry.
 */

const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Fold an arbitrary string into a 32-bit integer. */
export function hashSeed(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A fresh six-character seed, using the platform CSPRNG when available. */
export function randomSeed() {
  const bytes = new Uint8Array(6);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join('');
}

/** Strip a user-supplied seed to the characters the alphabet allows. */
export function normaliseSeed(text) {
  const cleaned = String(text).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  return cleaned || randomSeed();
}

/**
 * A small generator bound to one seed.
 * Every method draws from the same stream, so call order matters — which is
 * exactly what makes a seed reproduce a pattern.
 */
export function makeRng(seed) {
  let state = (typeof seed === 'number' ? seed : hashSeed(String(seed))) >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max] inclusive. */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    /** One element of a non-empty array. */
    pick: (items) => items[Math.floor(next() * items.length)],
    /** True with the given probability. */
    chance: (p = 0.5) => next() < p,
  };
}
