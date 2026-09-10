/**
 * Download and clipboard.
 *
 * Everything happens in the browser: a Blob for the SVG, and for PNG the same
 * Blob drawn through an Image onto a canvas. No library, no upload, nothing
 * leaves the machine.
 */

import { svgSource } from './render.js';

const PNG_SIZE = 2048;

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadSVG(svg, filename) {
  saveBlob(new Blob([svgSource(svg)], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`);
}

/**
 * Rasterise to PNG. The longest side becomes PNG_SIZE and the other keeps the
 * aspect ratio, so a carpet does not come out squashed into a square.
 */
export function downloadPNG(svg, filename) {
  return new Promise((resolve, reject) => {
    const viewBox = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const [, , vbWidth, vbHeight] = viewBox;
    const ratio = vbWidth / vbHeight;
    const width = Math.round(ratio >= 1 ? PNG_SIZE : PNG_SIZE * ratio);
    const height = Math.round(ratio >= 1 ? PNG_SIZE / ratio : PNG_SIZE);

    const blob = new Blob([svgSource(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) {
          reject(new Error('canvas produced no image'));
          return;
        }
        saveBlob(png, `${filename}.png`);
        resolve({ width, height });
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('the SVG could not be rasterised'));
    };
    image.src = url;
  });
}

/** Clipboard, with a fallback for browsers that refuse the async API. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export const copySVG = (svg) => copyText(svgSource(svg));
