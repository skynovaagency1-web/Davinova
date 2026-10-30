import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { translateDocument } from './lib/i18n';
import './styles/index.css';
import './styles/women.css';
import './styles/men.css';
import './styles/shared.css';
import './styles/line-font.css';

// A shared refer-a-friend link (?ref=FRIEND-…) puts the friend's code in the bag for them.
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && /^[A-Za-z0-9-]{4,32}$/.test(ref)) sessionStorage.setItem('davinova-code', ref.toUpperCase());
} catch { /* private mode */ }

// The dictionary loads first so French and Spanish pages never flash English.
void translateDocument().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
});
