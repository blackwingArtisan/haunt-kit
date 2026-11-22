/** Said on the posters view so the host puts posters only where guests may go. */
export const POSTER_PLACEMENT_NOTE = 'Put posters only in rooms guests are welcome to enter, and keep walkways clear.';

export const POSTER_FALLBACK = 'If the code does not scan, type the room code';

export const LOCAL_ADDRESS_WARNING =
  'This address only works on this device. Guests\u2019 phones cannot open it. Print from the address where you have put the game online.';

/** True for localhost, 127.0.0.1, ::1 and file addresses, which a guest's phone cannot reach. */
export function isLocalAddress(address: string): boolean {
  const text = address.trim();
  if (text === '') return false;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  if (url.protocol === 'file:') return true;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
}

/** The default address for the QR codes: the page's own address, without its hash or query. */
export function defaultAddress(loc: { origin: string; pathname: string; href: string }): string {
  if (!loc.origin || loc.origin === 'null') return loc.href.split('#')[0] ?? loc.href;
  return loc.origin + loc.pathname;
}

export function posterAlt(roomName: string, code: string): string {
  return `QR code for the ${roomName}, room code ${code.split('').join(' ')}`;
}
