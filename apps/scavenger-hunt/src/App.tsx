import { useMemo } from 'react';
import { createStore } from '@haunt-kit/template/adapters';
import { Home } from './Home';
import { Host } from './Host';
import { Play } from './Play';
import { Result } from './Result';
import { useHashRoute } from './useHashRoute';

export function App() {
  const route = useHashRoute();
  const store = useMemo(() => createStore(import.meta.env, 'spook-hunt:'), []);
  return (
    <div className="sh">
      <a className="sh-skip" href="#main">
        Skip to content
      </a>
      <Sky />
      <main id="main" className="sh-main">
        {route.name === 'host' && <Host store={store} />}
        {route.name === 'play' && <Play key={route.code} code={route.code} store={store} />}
        {route.name === 'result' && <Result key={route.code} code={route.code} store={store} />}
        {route.name === 'home' && <Home store={store} />}
      </main>
      <footer className="sh-footer">
        <p>Spook Hunt is built with Haunt Kit by Stubborn Otter Software. No accounts, no tracking: your location stays on your phone.</p>
      </footer>
    </div>
  );
}

const BAT_PATH = 'M0 8 C6 0 12 0 16 6 C18 2 20 2 22 6 C26 0 32 0 38 8 C32 6 28 8 26 14 C24 10 22 12 19 16 C16 12 14 10 12 14 C10 8 6 6 0 8 Z';

/** The night sky: a moon in its own corner, a few flapping bats, and one bat that crosses the moon on arrival. */
function Sky() {
  return (
    <div className="sh-sky" aria-hidden="true">
      <svg className="sh-bats" viewBox="0 0 400 120">
        {[
          [40, 40, 1],
          [150, 20, 0.7],
          [300, 55, 0.9],
          [360, 15, 0.55],
        ].map(([x, y, s], i) => (
          <path key={i} className="sh-bat" style={{ animationDelay: `${i * -1.7}s` }} transform={`translate(${x} ${y}) scale(${s})`} d={BAT_PATH} />
        ))}
      </svg>
      <div className="sh-moon">
        <svg className="sh-moonbat" viewBox="-2 -2 42 20">
          <path className="sh-bat" d={BAT_PATH} />
        </svg>
      </div>
    </div>
  );
}
