/**
 * Bootstrap and control wiring.
 *
 * The single source of truth is `state`; every change writes it to the URL hash
 * and redraws. That makes any pattern a shareable link and the back button work
 * without any extra machinery.
 */

import { compose } from './compose.js';
import { SYMMETRY_ORDER } from './compose.js';
import { copySVG, copyText, downloadPNG, downloadSVG } from './export.js';
import { applyTranslations, setLanguage, t } from './i18n.js';
import { MOTIFS, MOTIF_ORDER, BORDERS, BORDER_ORDER } from './motifs.js';
import { PALETTES, PALETTE_ORDER, invertColours, resolveColours } from './palette.js';
import { makeRng, normaliseSeed, randomSeed } from './rng.js';
import { render, renderTiled } from './render.js';
import { LIMITS, decode, encode } from './state.js';

const $ = (id) => document.getElementById(id);

let state = decode(location.hash);
let current = { positive: null, negative: null };

// --- populate the selects from the modules, so names live in one place ------

function fillSelect(select, options) {
  select.replaceChildren();
  for (const { value, label } of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

function refreshSelectLabels() {
  fillSelect($('opt-motif'), [
    ...MOTIF_ORDER.map((key) => ({ value: key, label: MOTIFS[key].kk })),
    { value: 'mix', label: t('motif.mix') },
  ]);
  fillSelect($('opt-symmetry'), SYMMETRY_ORDER.map((key) => ({ value: key, label: t(`sym.${key}`) })));
  fillSelect($('opt-band'), BORDER_ORDER.map((key) => ({ value: key, label: BORDERS[key].kk })));
  $('opt-motif').value = state.motif;
  $('opt-symmetry').value = state.symmetry;
  $('opt-band').value = state.band;
}

function buildSwatches() {
  const host = $('swatches');
  host.replaceChildren();
  for (const key of [...PALETTE_ORDER, 'custom']) {
    const palette = PALETTES[key];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.dataset.palette = key;
    button.title = palette ? `${palette.kk} · ${palette.en}` : 'custom';
    button.style.setProperty('--ink', palette ? palette.ink : state.colorA);
    button.style.setProperty('--ground', palette ? palette.ground : state.colorB);
    host.append(button);
  }
}

// --- controls reflect state -------------------------------------------------

function syncControls() {
  const setRange = (input, limits, value) => {
    input.min = limits.min;
    input.max = limits.max;
    input.step = limits.step;
    input.value = value;
  };

  setRange($('opt-grid'), LIMITS.grid, state.grid);
  setRange($('opt-stroke'), LIMITS.stroke, state.stroke);
  setRange($('opt-scale'), LIMITS.scale, state.scale);

  $('val-grid').textContent = state.grid;
  $('val-stroke').textContent = state.stroke;
  $('val-scale').textContent = `${Math.round(state.scale * 100)}%`;

  $('opt-motif').value = state.motif;
  $('opt-symmetry').value = state.symmetry;
  $('opt-band').value = state.band;
  $('opt-border').checked = state.border;
  $('opt-seed').value = state.seed;
  $('opt-color-a').value = state.colorA;
  $('opt-color-b').value = state.colorB;

  $('customs').hidden = state.palette !== 'custom';
  $('border-row').classList.toggle('border-off', !state.border);
  $('tile-hint').hidden = state.mode !== 'tile';

  for (const button of document.querySelectorAll('.swatch')) {
    button.classList.toggle('active', button.dataset.palette === state.palette);
    if (button.dataset.palette === 'custom') {
      button.style.setProperty('--ink', state.colorA);
      button.style.setProperty('--ground', state.colorB);
    }
  }
  for (const button of document.querySelectorAll('.mode')) {
    const active = button.dataset.setMode === state.mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  }
}

// --- drawing ----------------------------------------------------------------

function draw() {
  // Both twins must be built from the same seed, or they stop being twins.
  const composition = compose(state, makeRng(state.seed));
  const colours = resolveColours(state);
  const inverted = invertColours(colours);

  const make = (palette) => (state.mode === 'tile'
    ? renderTiled(composition, palette, state, 3)
    : render(composition, palette, state));

  current = { positive: make(colours), negative: make(inverted) };
  // Exports should give the single tile, not the repeated preview.
  current.exportable = state.mode === 'tile'
    ? { positive: render(composition, colours, state), negative: render(composition, inverted, state) }
    : current;

  $('art-positive').replaceChildren(current.positive);
  $('art-negative').replaceChildren(current.negative);

  const motif = MOTIFS[composition.motifKey];
  $('readout-motif').textContent = motif ? `${motif.kk} · ${motif.meaning}` : '—';

  const palette = PALETTES[state.palette];
  $('readout-palette').textContent = palette ? `${palette.kk} · ${palette.en}` : 'custom';
  $('palette-meaning').textContent = palette ? palette.meaning : '';
}

function commit(patch = {}, { redraw = true } = {}) {
  state = { ...state, ...patch };
  history.replaceState(null, '', `#${encode(state)}`);
  syncControls();
  if (redraw) draw();
}

// --- feedback ---------------------------------------------------------------

let toastTimer = 0;
function toast(key) {
  const node = $('toast');
  node.textContent = t(key);
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 1800);
}

// --- events -----------------------------------------------------------------

$('opt-motif').addEventListener('change', (e) => commit({ motif: e.target.value }));
$('opt-symmetry').addEventListener('change', (e) => commit({ symmetry: e.target.value }));
$('opt-band').addEventListener('change', (e) => commit({ band: e.target.value }));
$('opt-border').addEventListener('change', (e) => commit({ border: e.target.checked }));

$('opt-grid').addEventListener('input', (e) => commit({ grid: Number(e.target.value) }));
$('opt-stroke').addEventListener('input', (e) => commit({ stroke: Number(e.target.value) }));
$('opt-scale').addEventListener('input', (e) => commit({ scale: Number(e.target.value) }));

$('opt-color-a').addEventListener('input', (e) => commit({ colorA: e.target.value, palette: 'custom' }));
$('opt-color-b').addEventListener('input', (e) => commit({ colorB: e.target.value, palette: 'custom' }));

$('opt-seed').addEventListener('change', (e) => commit({ seed: normaliseSeed(e.target.value) }));
$('btn-generate').addEventListener('click', () => commit({ seed: randomSeed() }));
$('btn-swap').addEventListener('click', () => commit({ swap: !state.swap }));

$('swatches').addEventListener('click', (event) => {
  const button = event.target.closest('.swatch');
  if (button) commit({ palette: button.dataset.palette });
});

for (const button of document.querySelectorAll('.mode')) {
  button.addEventListener('click', () => commit({ mode: button.dataset.setMode }));
}

$('lang-toggle').addEventListener('click', () => {
  const next = setLanguage(document.documentElement.lang === 'en' ? 'kk' : 'en');
  $('lang-toggle').textContent = next === 'en' ? 'EN' : 'ҚАЗ';
  applyTranslations();
  refreshSelectLabels();
  syncControls();
});

const filename = () => `oyu-${state.mode}-${state.seed}`;

$('btn-svg').addEventListener('click', () => downloadSVG(current.exportable.positive, filename()));
$('btn-png').addEventListener('click', async () => {
  try {
    await downloadPNG(current.exportable.positive, filename());
  } catch {
    toast('toast.failed');
  }
});
$('btn-copy').addEventListener('click', async () => {
  toast(await copySVG(current.exportable.positive) ? 'toast.copied' : 'toast.failed');
});
$('btn-link').addEventListener('click', async () => {
  toast(await copyText(location.href) ? 'toast.linked' : 'toast.failed');
});

// Someone editing the hash by hand, or using the back button.
window.addEventListener('hashchange', () => {
  const incoming = encode(decode(location.hash));
  if (incoming !== encode(state)) {
    state = decode(location.hash);
    syncControls();
    draw();
  }
});

// --- start ------------------------------------------------------------------

setLanguage('en');
$('lang-toggle').textContent = 'EN';
applyTranslations();
buildSwatches();
refreshSelectLabels();
commit();
