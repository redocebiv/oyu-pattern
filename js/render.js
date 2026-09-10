/**
 * Turning composition data into SVG.
 *
 * The exported markup carries geometry and colour only — no fonts, no images,
 * no external references. PNG export draws the SVG through an Image onto a
 * canvas, and any external reference taints that canvas and makes toBlob throw.
 * Motif names live in the surrounding HTML, never inside the SVG.
 */

import { CELL } from './motifs.js';
import { matrixString } from './compose.js';

const NS = 'http://www.w3.org/2000/svg';

let clipCounter = 0;

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function group(instances, { ink, width }) {
  const g = el('g', {
    fill: 'none',
    stroke: ink,
    'stroke-width': width,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  for (const instance of instances) {
    g.append(el('path', { d: instance.d, transform: matrixString(instance.matrix) }));
  }
  return g;
}

function root(width, height) {
  return el('svg', {
    xmlns: NS,
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    'shape-rendering': 'geometricPrecision',
  });
}

function renderCarpet(composition, colours, state) {
  const { width, height, field, bands, corners, cells } = composition;
  const svg = root(width, height);
  svg.append(el('rect', { x: 0, y: 0, width, height, fill: colours.ground }));

  // The field reads as the inner panel of a carpet, very slightly lifted off
  // the border so the two zones separate without needing a drawn line.
  if (bands.length) {
    svg.append(el('rect', {
      x: field.x, y: field.y, width: field.width, height: field.height,
      fill: colours.ink, 'fill-opacity': 0.05,
    }));
  }

  svg.append(group(cells, { ink: colours.ink, width: state.stroke }));
  if (corners.length) svg.append(group(corners, { ink: colours.ink, width: state.stroke * 1.6 }));
  if (bands.length) svg.append(group(bands, { ink: colours.ink, width: state.stroke * 0.8 }));
  return svg;
}

function renderTile(composition, colours, state) {
  const size = composition.size;
  const svg = root(size, size);
  clipCounter += 1;
  const clipId = `tile-clip-${clipCounter}`;

  const clip = el('clipPath', { id: clipId });
  clip.append(el('rect', { x: 0, y: 0, width: size, height: size }));
  const defs = el('defs');
  defs.append(clip);
  svg.append(defs);

  svg.append(el('rect', { x: 0, y: 0, width: size, height: size, fill: colours.ground }));

  const clipped = el('g', { 'clip-path': `url(#${clipId})` });
  clipped.append(group(composition.instances, { ink: colours.ink, width: state.stroke }));
  svg.append(clipped);
  return svg;
}

/** One composition, rendered at its natural size. */
export function render(composition, colours, state) {
  return state.mode === 'tile'
    ? renderTile(composition, colours, state)
    : renderCarpet(composition, colours, state);
}

/**
 * The tile shown repeated, so the seam — or the absence of one — is visible.
 * Uses an SVG pattern rather than duplicating the geometry.
 */
export function renderTiled(composition, colours, state, repeats = 3) {
  const size = composition.size;
  const total = size * repeats;
  const svg = root(total, total);
  clipCounter += 1;
  const patternId = `tile-pattern-${clipCounter}`;

  const defs = el('defs');
  const pattern = el('pattern', {
    id: patternId,
    width: size,
    height: size,
    patternUnits: 'userSpaceOnUse',
  });
  pattern.append(el('rect', { x: 0, y: 0, width: size, height: size, fill: colours.ground }));
  pattern.append(group(composition.instances, { ink: colours.ink, width: state.stroke }));
  defs.append(pattern);
  svg.append(defs);
  svg.append(el('rect', { x: 0, y: 0, width: total, height: total, fill: `url(#${patternId})` }));
  return svg;
}

/** Serialise for download or the clipboard. */
export function svgSource(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', NS);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export { CELL };
