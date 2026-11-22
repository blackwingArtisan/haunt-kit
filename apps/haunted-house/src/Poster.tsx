import { roomLink } from '@haunt-kit/template/adapters';
import { QrCode } from './QrCode';
import { POSTER_FALLBACK, posterAlt } from './poster-logic';

export interface PosterProps {
  name: string;
  code: string;
  line: string;
  address: string;
}

/** One printable poster: QR code, room name, the code in large type, the room's line and the address. */
export function Poster({ name, code, line, address }: PosterProps) {
  const link = roomLink(address, code);
  return (
    <article className="hh-poster" aria-label={`Poster for the ${name}`}>
      <h2 className="hh-poster__name">{name}</h2>
      <QrCode text={link} label={posterAlt(name, code)} />
      <p className="hh-code" data-testid="poster-code">
        {code}
      </p>
      <p className="hh-poster__line">{line}</p>
      <p className="hh-poster__note">{POSTER_FALLBACK}.</p>
      <p className="hh-poster__address" data-testid="poster-address">
        {address}
      </p>
    </article>
  );
}
