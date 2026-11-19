import { useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'host' } | { name: 'play'; code: string } | { name: 'result'; code: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path.startsWith('/play/')) return { name: 'play', code: path.slice('/play/'.length) };
  if (path.startsWith('/result/')) return { name: 'result', code: path.slice('/result/'.length) };
  if (path === '/host') return { name: 'host' };
  return { name: 'home' };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
