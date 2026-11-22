import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Draws a link as an SVG QR code on this device: dark on white, error correction M, no network call. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then((out) => {
        if (!live) return;
        setSvg(out);
        setError(null);
      })
      .catch(() => live && setError('This address is too long for a QR code.'));
    return () => {
      live = false;
    };
  }, [text]);
  if (error) return <p className="hh-poster__note">{error}</p>;
  if (!svg) return <div className="hh-qr hh-qr--loading" aria-hidden="true" />;
  return <div className="hh-qr" role="img" aria-label={label} data-testid="qr" data-link={text} dangerouslySetInnerHTML={{ __html: svg }} />;
}
