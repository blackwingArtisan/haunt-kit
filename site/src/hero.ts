import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { HeroMap } from './HeroMap';

/** Mounts the moving map behind the landing page title. */
export function mountHeroMap(el: HTMLElement | null) {
  if (!el) return;
  createRoot(el).render(createElement(HeroMap));
}
