import { brand } from '../../config/brand';

const ICONS: Record<string, string> = {
  instagram: 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.1-9.4a1.1 1.1 0 1 0 0 2.3 1.1 1.1 0 0 0 0-2.3z',
  facebook: 'M14 8h3V4.5h-3c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V22h3.5v-7.5h3l.5-3.5h-3.5V8.7c0-.4.3-.7.5-.7z',
  tiktok: 'M16.6 2h-3.4v13.4a2.9 2.9 0 1 1-2-2.8V9.1a6.3 6.3 0 1 0 5.4 6.3V8.6a7.7 7.7 0 0 0 4.4 1.4V6.6a4.4 4.4 0 0 1-4.4-4.6z',
  pinterest: 'M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.5 2.1-.8 3.3-.2 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z',
};

/** Links to the shop's social pages; a platform shows once its URL is set in brand.socialLinks. */
export function SocialLinks() {
  const links = Object.entries(brand.socialLinks).filter(([, url]) => url);
  if (!links.length) return null;
  return <nav className="w-footer__social" aria-label="Davinova on social media">
    {links.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noopener" aria-label={`Davinova on ${name[0].toUpperCase()}${name.slice(1)}`}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={ICONS[name]} fill="currentColor" /></svg>
    </a>)}
  </nav>;
}
