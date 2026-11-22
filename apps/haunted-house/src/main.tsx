import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@haunt-kit/template/styles.css';
import './styles.css';
import { registerServiceWorker } from '@haunt-kit/template/pwa';
import { HouseApp } from './HouseApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HouseApp />
  </StrictMode>,
);

void registerServiceWorker({ enabled: import.meta.env.PROD });
