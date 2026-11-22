import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
