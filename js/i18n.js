/** Interface strings. Motif and palette names stay Kazakh in both languages —
 *  they are proper names, not labels to translate. */

const STRINGS = {
  en: {
    'app.tagline': 'Kazakh ornament, generated',
    'mode.carpet': 'Carpet',
    'mode.tile': 'Tile',
    'controls.pattern': 'Pattern',
    'controls.motif': 'Motif',
    'controls.symmetry': 'Symmetry',
    'controls.grid': 'Columns',
    'controls.stroke': 'Weight',
    'controls.scale': 'Scale',
    'controls.border': 'Border',
    'controls.band': 'Band',
    'controls.colour': 'Colour',
    'controls.palette': 'Palette',
    'controls.seed': 'Seed',
    'motif.mix': 'mixed',
    'sym.none': 'None',
    'sym.mirror': 'Mirror',
    'sym.mirror2': 'Double mirror',
    'sym.rot4': 'Fourfold',
    'sym.rot4m': 'Fourfold + mirror',
    'action.generate': 'Generate',
    'action.swap': 'Swap',
    'twin.positive': 'Positive',
    'twin.negative': 'Negative twin',
    'export.title': 'Export',
    'export.svg': 'SVG',
    'export.png': 'PNG',
    'export.copy': 'Copy SVG',
    'export.link': 'Copy link',
    'toast.copied': 'Copied',
    'toast.linked': 'Link copied',
    'toast.failed': 'Copy failed — your browser blocked it',
    'about.title': 'Why two carpets',
    'about.body':
      'Kazakh felt mosaic — сырмақ — is cut from two stacked sheets of different '
      + 'colour. The cut pieces are exchanged and sewn back, so one cut yields two '
      + 'carpets: a positive and its negative twin. That is why this generator '
      + 'always shows a pair rather than a single design.',
    'about.motifs': 'The horn — мүйіз — is the primary element of Kazakh ornament, and its arcuate, spiralling line runs through nearly every motif.',
    'tile.hint': 'Shown repeated, so any seam would be visible. Export gives one tile.',
  },
  kk: {
    'app.tagline': 'Қазақ оюы, генератор',
    'mode.carpet': 'Сырмақ',
    'mode.tile': 'Өрнек',
    'controls.pattern': 'Өрнек',
    'controls.motif': 'Ою',
    'controls.symmetry': 'Симметрия',
    'controls.grid': 'Баған',
    'controls.stroke': 'Қалыңдық',
    'controls.scale': 'Өлшем',
    'controls.border': 'Жиек',
    'controls.band': 'Жолақ',
    'controls.colour': 'Түс',
    'controls.palette': 'Палитра',
    'controls.seed': 'Тұқым',
    'motif.mix': 'аралас',
    'sym.none': 'Жоқ',
    'sym.mirror': 'Айна',
    'sym.mirror2': 'Қос айна',
    'sym.rot4': 'Төрт бұрылыс',
    'sym.rot4m': 'Төрт бұрылыс + айна',
    'action.generate': 'Жасау',
    'action.swap': 'Ауыстыру',
    'twin.positive': 'Оң',
    'twin.negative': 'Теріс егізі',
    'export.title': 'Жүктеу',
    'export.svg': 'SVG',
    'export.png': 'PNG',
    'export.copy': 'SVG көшіру',
    'export.link': 'Сілтеме көшіру',
    'toast.copied': 'Көшірілді',
    'toast.linked': 'Сілтеме көшірілді',
    'toast.failed': 'Көшіру мүмкін болмады',
    'about.title': 'Неге екі сырмақ',
    'about.body':
      'Сырмақ екі түрлі түсті киізді бір-біріне қабаттап қиюдан жасалады. Қиылған '
      + 'бөліктер орындарымен ауысып, қайта тігіледі — сөйтіп бір қиюдан екі сырмақ '
      + 'шығады: оң және оның теріс егізі. Сондықтан бұл генератор әрқашан жалғыз '
      + 'емес, қос өрнек көрсетеді.',
    'about.motifs': 'Мүйіз — қазақ оюының басты элементі; оның иілген, шиыршықталған сызығы кез келген оюдан көрінеді.',
    'tile.hint': 'Қайталанып көрсетілген — жік болса, бірден байқалар еді. Жүктегенде бір өрнек беріледі.',
  },
};

export const LANGUAGES = Object.keys(STRINGS);

let current = 'en';

export function setLanguage(lang) {
  current = STRINGS[lang] ? lang : 'en';
  document.documentElement.lang = current;
  return current;
}

export const getLanguage = () => current;

export function t(key) {
  return STRINGS[current][key] ?? STRINGS.en[key] ?? key;
}

export function applyTranslations(root = document) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll('[data-i18n-label]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  }
}
