import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <section className="info-page section not-found"><p className="eyebrow">404 · A little detour</p><h1>This page took the scenic route.</h1><p>Let’s get you back to something lovely.</p><Link className="button button--dark" to="/">Return home</Link></section>;
}
