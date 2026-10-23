/**
 * Site languages. English is the main site at /, French lives under /fr and Spanish under /es.
 * The React app renders English; translateDocument() swaps visible text for the page's language
 * using the dictionaries in src/i18n, so components stay plain English.
 */
export type Lang = 'en' | 'fr' | 'es';
export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'es', label: 'ES', name: 'Español' },
];

const prefix = typeof window === 'undefined' ? null : window.location.pathname.match(/^\/(fr|es)(?=\/|$)/);
export const LANG: Lang = prefix ? prefix[1] as Lang : 'en';
/** Router basename: every in-app link stays inside the current language. */
export const BASENAME = LANG === 'en' ? '' : `/${LANG}`;

/** The same page in another language (path without any language prefix, plus search). */
export function pathIn(lang: Lang, path: string): string {
  const bare = path.replace(/^\/(fr|es)(?=\/|$)/, '') || '/';
  return lang === 'en' ? bare : `/${lang}${bare === '/' ? '' : bare}`;
}

export interface Dictionary {
  /** Exact English text (trimmed) → translation. */
  text: Record<string, string>;
  /** Text with numbers or names in it: pattern on the English, replacement with $1… */
  patterns: [RegExp, string][];
}

let dict: Dictionary | null = null;
const originals = new WeakMap<Node, string>();
const shown = new WeakMap<Node, string>();
const ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'];

function translate(value: string): string | null {
  if (!dict) return null;
  const core = value.trim();
  if (!core || !/[A-Za-z]/.test(core)) return null;
  let out = dict.text[core];
  if (out === undefined) {
    for (const [pattern, replacement] of dict.patterns) {
      if (pattern.test(core)) { out = core.replace(pattern, replacement); break; }
    }
  }
  if (out === undefined) return null;
  const lead = value.slice(0, value.indexOf(core));
  const trail = value.slice(value.indexOf(core) + core.length);
  return lead + out + trail;
}

function translateText(node: Text) {
  // React rewrote it since we translated it: start again from its new English.
  if (shown.get(node) !== node.data) originals.set(node, node.data);
  const out = translate(originals.get(node) ?? node.data);
  if (out !== null && out !== node.data) node.data = out;
  shown.set(node, node.data);
}

function translateElement(element: Element) {
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const key = `__${name}`;
    const store = element as unknown as Record<string, string | undefined>;
    if (store[`${key}_shown`] !== value) store[`${key}_en`] = value;
    const out = translate(store[`${key}_en`] ?? value);
    if (out !== null && out !== value) element.setAttribute(name, out);
    store[`${key}_shown`] = element.getAttribute(name) ?? '';
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { translateText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const element = root as Element;
  if (element.closest('script,style,[data-no-translate]')) return;
  translateElement(element);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && !parent.closest('script,style,[data-no-translate]')) translateText(node as Text);
    } else translateElement(node as Element);
  }
}

let englishTitle = '';
function translateTitle() {
  if (document.title !== shown.get(document) as unknown) englishTitle = document.title;
  const out = translate(englishTitle);
  if (out && out !== document.title) document.title = out;
  shown.set(document, document.title);
}

/** Loads the page's dictionary and keeps every visible text in that language as React renders. */
export async function translateDocument(): Promise<void> {
  if (LANG === 'en') return;
  document.documentElement.lang = LANG;
  dict = (LANG === 'fr' ? await import('../i18n/fr') : await import('../i18n/es')).default;
  walk(document.body);
  translateTitle();
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') translateText(record.target as Text);
      else if (record.type === 'attributes') translateElement(record.target as Element);
      else record.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
  new MutationObserver(translateTitle).observe(document.querySelector('title') ?? document.head, { subtree: true, childList: true, characterData: true });
}

/** For text built in code (alerts, prices notes): the translation of one English string. */
export function t(english: string): string {
  return translate(english) ?? english;
}
