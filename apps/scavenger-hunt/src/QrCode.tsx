import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a link as an SVG QR code, entirely on the device. */
export function QrCode({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'L', margin: 2, color: { dark: '#1d1030', light: '#fff7ee' } })
      .then((out) => live && setSvg(out))
      .catch(() => live && setError('This link is too long for a QR code. Share the link instead.'));
    return () => {
      live = false;
    };
  }, [text]);
  if (error) return <p className="sh-note">{error}</p>;
  if (!svg) return <div className="sh-qr sh-qr--loading" aria-hidden="true" />;
  return <div className="sh-qr" role="img" aria-label={label} data-testid="qr" dangerouslySetInnerHTML={{ __html: svg }} />;
}
