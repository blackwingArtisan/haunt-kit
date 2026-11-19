import { useEffect, useRef, useState } from 'react';

/**
 * The full-screen payoff when the last spirit is found: six candles flare,
 * the light in the Terrace Hill tower goes out, and the walker can start
 * again or share the walk. A native modal <dialog> gives focus trapping and
 * Escape to close. With reduced motion the scene is shown in its final state.
 */
export function FinaleOverlay({ open, onClose, onWalkAgain }: { open: boolean; onClose: () => void; onWalkAgain: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shared, setShared] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setShared(null);
      dialog.showModal();
      dialog.scrollTop = 0;
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [onClose]);

  const share = async () => {
    const url = location.href.split(/[?#]/)[0]!;
    const data = { title: 'Des Moines After Dark', text: 'A self-guided ghost walk from the river to Terrace Hill. Every legend has its source.', url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setShared('Shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setShared('Link copied.');
      }
    } catch {
      setShared(`Share this link: ${url}`);
    }
  };

  return (
    <dialog ref={ref} className="gw-finale-overlay" aria-labelledby="gw-finale-title" data-testid="finale-overlay">
      <div className="gw-finale-overlay__scene" aria-hidden="true">
        <TerraceHill />
        <div className="gw-finale-overlay__candles">
          {Array.from({ length: 6 }, (_, i) => (
            <svg key={i} viewBox="0 0 20 40" className="gw-candle gw-candle--lit gw-candle--flare" style={{ animationDelay: `${i * 0.12}s` }}>
              <path className="gw-candle__flame" d="M10 2 C14 8 14 12 10 15 C6 12 6 8 10 2 Z" />
              <rect className="gw-candle__wax" x="6" y="16" width="8" height="22" rx="2" />
            </svg>
          ))}
        </div>
      </div>
      <h2 id="gw-finale-title" className="gw-finale-overlay__title">
        Every spirit is found
      </h2>
      <p className="gw-finale-overlay__text">The light in the Terrace Hill tower goes out. The fog lifts off the city. Get home before it comes back.</p>
      <div className="gw-finale-overlay__actions">
        <button type="button" className="hk-btn" onClick={onWalkAgain}>
          Walk it again
        </button>
        <button type="button" className="hk-btn hk-btn--ghost" onClick={share}>
          Share the walk
        </button>
        <button type="button" className="gw-link" onClick={() => ref.current?.close()} autoFocus>
          Close
        </button>
      </div>
      <p className="gw-finale-overlay__shared" role="status">
        {shared}
      </p>
    </dialog>
  );
}

const HOUSE_WINDOWS_X = [60, 84, 108, 202, 226, 250];
const DORMERS_X = [66, 98, 212, 244];

/**
 * Terrace Hill at night, drawn as a silhouette: the Second Empire mansion with
 * its mansard roof, dormers, porch and central tower. The tower light goes out,
 * a wisp of smoke rises from it, and the fog rolls off the lawn.
 */
function TerraceHill() {
  const cresting = Array.from({ length: 8 }, (_, i) => `M${147 + i * 3.6} 30 l1.8 -5 l1.8 5`).join(' ');
  return (
    <svg className="gw-tower" viewBox="0 0 320 200" data-testid="terrace-hill">
      <defs>
        <filter id="gw-fog-blur" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <circle className="gw-tower__moon" cx="246" cy="42" r="17" />
      {/* Old oaks on the lawn. */}
      <path className="gw-tower__trees" d="M0 190 V150 C4 132 18 126 26 136 C30 120 48 122 50 140 C58 138 62 150 56 160 V190 Z" />
      <path className="gw-tower__trees" d="M320 190 V146 C316 130 300 126 294 138 C288 124 272 128 272 144 C264 146 262 158 268 166 V190 Z" />
      <g className="gw-tower__house">
        {/* Mansard roof with its iron cresting. */}
        <path d="M40 112 L52 88 H268 L280 112 Z" />
        <path className="gw-tower__crest" d="M54 88 h212" />
        {DORMERS_X.map((x) => (
          <path key={x} d={`M${x} 108 V98 a5 5 0 0 1 10 0 V108 Z`} />
        ))}
        {/* The main block and the porch. */}
        <rect x="46" y="112" width="228" height="78" />
        <path d="M120 166 H200 L194 158 H126 Z" />
        <rect x="124" y="166" width="72" height="24" />
        {/* The tower, its mansard cap, cresting and finial. */}
        <rect x="142" y="56" width="36" height="134" />
        <path d="M138 56 L146 30 H174 L182 56 Z" />
        <path className="gw-tower__crest" d={cresting} />
        <path className="gw-tower__crest" d="M160 25 V13" />
        <circle cx="160" cy="12" r="1.6" />
      </g>
      {DORMERS_X.map((x) => (
        <rect key={x} className="gw-tower__window" x={x + 3} y="99" width="4" height="7" rx="2" />
      ))}
      {HOUSE_WINDOWS_X.flatMap((x) => [
        <rect key={`a${x}`} className="gw-tower__window" x={x} y="122" width="10" height="18" rx="4" />,
        <rect key={`b${x}`} className="gw-tower__window" x={x} y="150" width="10" height="20" rx="4" />,
      ])}
      <rect className="gw-tower__window" x="155" y="70" width="10" height="18" rx="4" />
      <rect className="gw-tower__window" x="155" y="100" width="10" height="18" rx="4" />
      <rect className="gw-tower__window" x="155" y="130" width="10" height="18" rx="4" />
      <path className="gw-tower__porch" d="M132 168 V190 M146 168 V190 M174 168 V190 M188 168 V190" />
      {/* The one light that matters: it goes out, and smoke rises from it. */}
      <rect className="gw-tower__light" x="155" y="36" width="10" height="15" rx="4" />
      <path className="gw-tower__smoke" d="M160 35 C154 28 168 23 160 15 S154 4 163 -4" />
      <rect className="gw-tower__ground" x="0" y="189" width="320" height="11" />
      <g className="gw-tower__fog" filter="url(#gw-fog-blur)">
        <ellipse className="gw-tower__fog-l" cx="96" cy="186" rx="110" ry="14" />
        <ellipse className="gw-tower__fog-r" cx="230" cy="188" rx="120" ry="13" />
      </g>
    </svg>
  );
}
