import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { translateDocument } from './lib/i18n';
import './styles/index.css';
import './styles/women.css';
import './styles/men.css';
import './styles/shared.css';

// The dictionary loads first so French and Spanish pages never flash English.
void translateDocument().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
});
