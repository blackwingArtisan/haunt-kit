import { describe, expect, it } from 'vitest';
import { roomCodeFromHash, roomLink } from '@haunt-kit/template/adapters';
import { defaultAddress, isLocalAddress, posterAlt } from '../src/poster-logic';

describe('poster addresses', () => {
  it('flags localhost, 127.0.0.1, ::1 and file addresses (Req 6.7)', () => {
    for (const a of ['http://localhost:3179/', 'http://127.0.0.1:3179/', 'http://[::1]:3179/', 'file:///tmp/house/index.html']) {
      expect(isLocalAddress(a), a).toBe(true);
    }
  });

  it('accepts a public address (Req 6.7)', () => {
    expect(isLocalAddress('https://party.example.com/house/')).toBe(false);
  });

  it('defaults to the page address without its hash (Req 6.6)', () => {
    expect(defaultAddress({ origin: 'https://party.example.com', pathname: '/house/', href: 'x' })).toBe('https://party.example.com/house/');
  });

  it('puts only the address and #/room/<CODE> in the QR text (Req 2.1)', () => {
    const link = roomLink('https://party.example.com/house/', 'EERY');
    expect(link).toBe('https://party.example.com/house/#/room/EERY');
    expect(roomCodeFromHash(new URL(link).hash)).toBe('EERY');
  });

  it('names the room and its code in the text alternative (Req 8.6)', () => {
    expect(posterAlt('Library', 'EERY')).toContain('Library');
    expect(posterAlt('Library', 'EERY')).toContain('E E R Y');
  });
});
