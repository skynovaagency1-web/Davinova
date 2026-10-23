import { useLocation } from 'react-router-dom';
import { BASENAME, LANG, LANGS, pathIn } from '../../lib/i18n';

/** EN · FR · ES: a full page load into the same page in the other language. */
export function LangSwitch() {
  const { pathname, search } = useLocation();
  const remember = (code: string) => { try { localStorage.setItem('davinova-lang', code); } catch { /* storage blocked */ } };
  return <nav className="lang" aria-label="Language" data-no-translate>
    {LANGS.map((lang) => <a key={lang.code} href={pathIn(lang.code, BASENAME + pathname) + search} hrefLang={lang.code} lang={lang.code}
      className={lang.code === LANG ? 'active' : ''} aria-current={lang.code === LANG ? 'true' : undefined} title={lang.name} onClick={() => remember(lang.code)}>{lang.label}</a>)}
  </nav>;
}
