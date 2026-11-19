import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/600.css';
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
