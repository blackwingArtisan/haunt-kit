import { useEffect, useState } from 'react';
import { HouseApp } from './HouseApp';
import { Posters } from './Posters';

/** Picks the screen from the address hash. `#/room/<CODE>` is handled by the party, which then resets the hash to `#/`. */
export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash === '#/posters' ? <Posters /> : <HouseApp />;
}
