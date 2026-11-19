import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/creepster/400.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@haunt-kit/template/styles.css';
import './styles.css';
import { registerServiceWorker } from '@haunt-kit/template/pwa';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerServiceWorker({ enabled: import.meta.env.PROD });
