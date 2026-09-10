/**
 * Palettes.
 *
 * Colour in Kazakh ornament carries documented meaning — blue is the sky and
 * Tengri, red is fire and the sun, white is joy, yellow is knowledge, green is
 * spring and youth, black is the earth. Each palette is two colours because
 * felt mosaic is made from two stacked sheets, and the meanings are surfaced in
 * the interface rather than left as decoration.
 *
 * Tones are deliberately muted: natural dyes on undyed wool, not screen primaries.
 */

export const PALETTES = {
  kigiz: {
    kk: 'кигіз', latin: 'kigiz', en: 'Felt',
    ink: '#b8352c', ground: '#f0e5cf',
    meaning: 'қызыл — fire and sun, on undyed wool',
  },
  tengri: {
    kk: 'тәңірі', latin: 'täñiri', en: 'Sky',
    ink: '#eef1f6', ground: '#22497e',
    meaning: 'көк — the sky, and Tengri',
  },
  dala: {
    kk: 'дала', latin: 'dala', en: 'Steppe',
    ink: '#3f7d55', ground: '#efe6d2',
    meaning: 'жасыл — spring and youth',
  },
  altyn: {
    kk: 'алтын', latin: 'altyn', en: 'Gold',
    ink: '#d9a441', ground: '#22201d',
    meaning: 'сары — knowledge and wisdom, on қара, the earth',
  },
  kumis: {
    kk: 'күміс', latin: 'kümis', en: 'Silver',
    ink: '#2b2b2b', ground: '#eceae4',
    meaning: 'ақ — joy and happiness',
  },
  ot: {
    kk: 'от', latin: 'ot', en: 'Fire',
    ink: '#e8b34a', ground: '#a8382b',
    meaning: 'от — the hearth fire',
  },
};

export const PALETTE_ORDER = ['kigiz', 'tengri', 'dala', 'altyn', 'kumis', 'ot'];

/**
 * The two colours a state resolves to, with the swap applied.
 * `swap` is what turns a composition into its negative twin — the second carpet
 * that comes off the same cut in felt mosaic.
 */
export function resolveColours(state) {
  const palette = PALETTES[state.palette];
  const ink = palette ? palette.ink : state.colorA;
  const ground = palette ? palette.ground : state.colorB;
  return state.swap ? { ink: ground, ground: ink } : { ink, ground };
}

/** The inverse pair, for rendering the twin beside the original. */
export function invertColours({ ink, ground }) {
  return { ink: ground, ground: ink };
}
