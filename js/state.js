/**
 * The entire application state lives in the URL hash, so any pattern is a
 * shareable link and the back button works. Nothing is stored server-side
 * because there is no server.
 *
 * decode() is defensive on purpose: the hash is user-editable text, and a
 * hand-mangled URL must degrade to a sensible pattern rather than throw.
 */

import { normaliseSeed, randomSeed } from './rng.js';

export const MOTIF_KEYS = ['qoshqar', 'qosmuiz', 'tuietaban', 'tumarsha', 'tortushkul', 'mix'];
export const SYMMETRY_KEYS = ['none', 'mirror', 'mirror2', 'rot4', 'rot4m'];
export const PALETTE_KEYS = ['kigiz', 'tengri', 'ottyn', 'dala', 'kumis', 'qara', 'custom'];
export const MODES = ['carpet', 'tile'];

export const LIMITS = {
  grid: { min: 1, max: 6, step: 1 },
  stroke: { min: 0, max: 10, step: 0.5 },
  scale: { min: 0.5, max: 1.5, step: 0.05 },
};

export function defaults() {
  return {
    seed: randomSeed(),
    motif: 'qoshqar',
    symmetry: 'mirror2',
    grid: 3,
    stroke: 3,
    scale: 1,
    border: true,
    palette: 'kigiz',
    colorA: '#b8352c',
    colorB: '#f0e5cf',
    mode: 'carpet',
    swap: false,
  };
}

const clamp = (value, { min, max }) => Math.min(Math.max(value, min), max);

function num(raw, fallback, limits) {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? clamp(parsed, limits) : fallback;
}

function oneOf(raw, allowed, fallback) {
  return allowed.includes(raw) ? raw : fallback;
}

function hex(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  const value = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

/** State to a hash string (no leading '#'). */
export function encode(state) {
  const params = new URLSearchParams({
    s: state.seed,
    m: state.motif,
    y: state.symmetry,
    g: String(state.grid),
    w: String(state.stroke),
    z: String(state.scale),
    b: state.border ? '1' : '0',
    p: state.palette,
    mode: state.mode,
    x: state.swap ? '1' : '0',
  });
  // Custom colours only travel when they are actually in use.
  if (state.palette === 'custom') {
    params.set('ca', state.colorA.slice(1));
    params.set('cb', state.colorB.slice(1));
  }
  return params.toString();
}

/** Hash string to a complete, validated state. */
export function decode(hash) {
  const base = defaults();
  if (!hash) return base;

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if ([...params.keys()].length === 0) return base;

  return {
    seed: params.has('s') ? normaliseSeed(params.get('s')) : base.seed,
    motif: oneOf(params.get('m'), MOTIF_KEYS, base.motif),
    symmetry: oneOf(params.get('y'), SYMMETRY_KEYS, base.symmetry),
    grid: Math.round(num(params.get('g'), base.grid, LIMITS.grid)),
    stroke: num(params.get('w'), base.stroke, LIMITS.stroke),
    scale: num(params.get('z'), base.scale, LIMITS.scale),
    border: params.has('b') ? params.get('b') === '1' : base.border,
    palette: oneOf(params.get('p'), PALETTE_KEYS, base.palette),
    colorA: hex(params.get('ca'), base.colorA),
    colorB: hex(params.get('cb'), base.colorB),
    mode: oneOf(params.get('mode'), MODES, base.mode),
    swap: params.get('x') === '1',
  };
}
