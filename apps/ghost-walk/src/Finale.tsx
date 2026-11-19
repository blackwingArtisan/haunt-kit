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
        <svg className="gw-tower" viewBox="0 0 200 150">
          <path className="gw-tower__house" d="M20 150 V92 L34 80 H86 V60 L94 50 V26 L100 14 L106 26 V50 L114 60 V80 H166 L180 92 V150 Z" />
          <rect className="gw-tower__light" x="96" y="32" width="8" height="12" rx="1" />
          <rect className="gw-tower__window" x="40" y="100" width="8" height="12" />
          <rect className="gw-tower__window" x="152" y="100" width="8" height="12" />
          <rect className="gw-tower__window" x="96" y="66" width="8" height="12" />
        </svg>
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
