/** Supplier photo hosts the shop is allowed to serve through /img (so shoppers never see a supplier link). */
const HOSTS = /(^|\.)(cjdropshipping\.com|aliyuncs\.com|cjdropshipping\.cn)$/i;

/** "https://cf.cjdropshipping.com/quick/product/x.jpg" → "/img/cf.cjdropshipping.com/quick/product/x.jpg". */
export function siteImage(url: string | null | undefined): string {
  if (!url) return url ?? '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !HOSTS.test(parsed.hostname)) return url;
    return `/img/${parsed.hostname}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

/** The supplier URL behind an /img path, or null when the path isn't one we serve. */
export function supplierImage(path: string): string | null {
  const match = /^\/img\/([^/]+)(\/.+)$/.exec(path);
  if (!match || !HOSTS.test(match[1]) || match[2].includes('..')) return null;
  return `https://${match[1]}${match[2]}`;
}
