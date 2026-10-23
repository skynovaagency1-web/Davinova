/**
 * Language versions of every page for search engines: English at /, French at /fr, Spanish at /es.
 * The HTML each one gets says its own language and points to the other two (hreflang), so Google
 * shows each visitor their language instead of treating the copies as duplicates.
 */
const SITE = 'https://davinova.com';
export const LANG_PREFIXES = ['fr', 'es'] as const;

const HEAD: Record<string, { title: string; description: string; locale: string }> = {
  en: { title: 'Davinova — Occasion, beautifully considered', description: 'Discover refined occasion dresses for weddings, evenings, and celebrations.', locale: 'en_US' },
  fr: { title: 'Davinova — L’occasion, pensée avec soin', description: 'Découvrez des robes d’occasion raffinées pour les mariages, les soirées et les fêtes, et la tenue de cérémonie pour homme.', locale: 'fr_FR' },
  es: { title: 'Davinova — La ocasión, cuidada al detalle', description: 'Descubre vestidos de ocasión refinados para bodas, noches y celebraciones, y ropa formal de hombre.', locale: 'es_ES' },
};

/** The language of a path and the same path without its language prefix. */
export function splitLang(pathname: string): { lang: 'en' | 'fr' | 'es'; bare: string } {
  const match = pathname.match(/^\/(fr|es)(?=\/|$)/);
  if (!match) return { lang: 'en', bare: pathname };
  return { lang: match[1] as 'fr' | 'es', bare: pathname.slice(match[0].length) || '/' };
}

export function langUrl(lang: string, bare: string, search = ''): string {
  return `${SITE}${lang === 'en' ? '' : `/${lang}`}${lang !== 'en' && bare === '/' ? '' : bare}${search}`;
}

interface HtmlElement { setAttribute(name: string, value: string): void; setInnerContent(content: string): void; append(content: string, options: { html: boolean }): void }
interface Rewriter { on(selector: string, handler: { element(element: HtmlElement): void }): Rewriter; transform(response: Response): Response }
declare const HTMLRewriter: { new (): Rewriter };

/** Sets <html lang>, the title and description, and the hreflang links on a page's HTML. */
export function localiseHtml(response: Response, url: URL): Response {
  const { lang, bare } = splitLang(url.pathname);
  const head = HEAD[lang];
  const links = ['en', ...LANG_PREFIXES].map((code) => `<link rel="alternate" hreflang="${code}" href="${langUrl(code, bare, url.search)}" />`).join('')
    + `<link rel="alternate" hreflang="x-default" href="${langUrl('en', bare, url.search)}" />`
    + `<link rel="canonical" href="${langUrl(lang, bare, url.search)}" />`
    + `<meta property="og:locale" content="${head.locale}" />`;
  return new HTMLRewriter()
    .on('html', { element: (element) => element.setAttribute('lang', lang) })
    .on('title', { element: (element) => { if (lang !== 'en') element.setInnerContent(head.title); } })
    .on('meta[name="description"]', { element: (element) => { if (lang !== 'en') element.setAttribute('content', head.description); } })
    .on('head', { element: (element) => element.append(links, { html: true }) })
    .transform(response);
}
