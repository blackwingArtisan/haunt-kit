import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MemoryStore, ProgressStore } from '@haunt-kit/template/adapters';
import { createSession } from '@haunt-kit/template/core';
import { CodeEntry } from '../src/CodeEntry';
import { Finish } from '../src/Finish';
import { HouseApp } from '../src/HouseApp';
import { finishSummary } from '../src/house-logic';
import { house } from '../src/rooms';

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const noop = () => ({ status: 'repeat', stopId: 'parlor', code: 'MUMS' }) as const;
const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);

describe('the code field', () => {
  const html = render(createElement(CodeEntry, { onSubmit: noop, message: null }));

  it('has a labelled "Room code" field and an "Enter room" button (Req 3.1)', () => {
    expect(html).toMatch(/<label[^>]*for="hh-room-code"[^>]*>Room code<\/label>/);
    expect(html).toMatch(/<input[^>]*id="hh-room-code"/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Enter room<\/button>/);
  });

  it('sits in a form, so the Enter key submits it as the button does (Req 3.2)', () => {
    expect(html).toMatch(/<form[^>]*>[\s\S]*<input[\s\S]*<button type="submit"/);
  });

  it('turns off autocomplete, autocorrect and spellcheck, and asks for capitals (Req 3.5)', () => {
    // HTML attribute names are case-insensitive; React's server renderer keeps its camelCase spelling.
    const lower = html.toLowerCase();
    expect(lower).toContain('autocomplete="off"');
    expect(lower).toContain('autocorrect="off"');
    expect(lower).toContain('spellcheck="false"');
    expect(lower).toContain('autocapitalize="characters"');
  });

  it('keeps a polite status region and an alert region in the page (Req 3.3, 8.5)', () => {
    expect(html).toMatch(/<p[^>]*role="status"[^>]*aria-live="polite"/);
    expect(html).toMatch(/<p[^>]*role="alert"/);
  });

  it('puts a refusal in the alert region and progress in the polite region (Req 3.3, 8.5)', () => {
    const error = render(createElement(CodeEntry, { onSubmit: noop, message: { tone: 'error', text: 'No room has the code ZZZZ. Check the poster and try again.' } }));
    expect(error).toMatch(/role="alert"[^>]*>No room has the code ZZZZ/);
    expect(error).toMatch(/role="status"[^>]*><\/p>/);
    const info = render(createElement(CodeEntry, { onSubmit: noop, message: { tone: 'info', text: 'The Parlor is open.' } }));
    expect(info).toMatch(/role="status"[^>]*>The Parlor is open\./);
    expect(info).toMatch(/role="alert"[^>]*><\/p>/);
  });
});

describe('the party view', () => {
  const fresh = render(createElement(HouseApp, { store: new MemoryStore() }));

  it('says everything is made up (Req 7.1)', () => {
    expect(fresh).toContain('Every room, story and ghost here is made up for this game.');
  });

  it('shows the code field on the main screen at all times (Req 3.1)', () => {
    expect(fresh).toContain('Room code');
    expect(fresh).toContain('Enter room');
  });

  it('shows the count out of the total and a list of all six rooms (Req 5.3)', () => {
    expect(fresh).toContain('0 of 6 rooms open');
    for (const stop of house.stops) expect(fresh).toContain(`data-stop="${stop.id}"`);
  });

  it('lets a guest open any allowed room from the list, and not one the rules hold back (Req 5.4)', () => {
    expect(fresh).toContain('aria-label="Visit from here: Front Hall"');
    expect(fresh).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Visit from here: Attic"/);
    expect(fresh).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Visit from here: Cellar"/);
  });

  it('draws a floor plan with a text alternative that gives the count, and no fog (Req 5.1)', () => {
    expect(fresh).toContain('aria-label="Floor plan of the haunted house. 0 of 6 rooms open."');
    expect(fresh).not.toMatch(/class="hk-map__fog(-base|-drift)?"/);
  });

  it('offers a Start over button and no finish card before the end (Req 5.5, 5.7)', () => {
    expect(fresh).toContain('Start over');
    expect(fresh).not.toContain('You found every room');
  });

  it('restores saved progress on load, and shows the finish card when every room is open (Req 5.5, 5.6)', () => {
    const store = new MemoryStore();
    const state = createSession(house);
    house.stops.forEach((s, i) => {
      state.stops[s.id] = { ...state.stops[s.id]!, unlockedAt: 1_000 + i * 60_000, unlockedBy: 'gps' };
    });
    state.startedAt = 1_000;
    state.completedAt = 1_000 + 5 * 60_000 + 12_000;
    new ProgressStore(store).save(state);

    const html = render(createElement(HouseApp, { store }));
    expect(html).toContain('6 of 6 rooms open');
    expect(html).toContain('You found every room');
    expect(html).toContain('<strong>5 min 12 s</strong>');
    expect(html).toContain('All 6 rooms are open.');

    const half = createSession(house);
    half.stops['parlor'] = { ...half.stops['parlor']!, unlockedAt: 5, unlockedBy: 'gps' };
    half.startedAt = 5;
    const store2 = new MemoryStore();
    new ProgressStore(store2).save(half);
    expect(render(createElement(HouseApp, { store: store2 }))).toContain('1 of 6 rooms open');
  });

  it('draws a finish card with the rooms and the time (Req 5.5)', () => {
    const state = createSession(house);
    house.stops.forEach((s) => (state.stops[s.id] = { ...state.stops[s.id]!, unlockedAt: 10 }));
    state.startedAt = 0;
    state.completedAt = 45_000;
    const html = render(createElement(Finish, { summary: finishSummary(house, state)! }));
    expect(html).toContain('All 6 rooms are open.');
    expect(html).toContain('<strong>45 s</strong>');
  });
});

describe('the sources', () => {
  const files = readdirSync(srcDir).filter((f) => /\.(ts|tsx)$/.test(f));
  const all = files.map((f) => [f, readFileSync(join(srcDir, f), 'utf8')] as const);

  it('never asks for location, camera or microphone, and makes no network calls (Req 2.5, 7.4, 7.5)', () => {
    const banned = /geolocation|getUserMedia|mediaDevices|BarcodeDetector|Notification|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/;
    for (const [file, text] of all) {
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/.*$/gm, '');
      expect(code, file).not.toMatch(banned);
    }
  });

  it('keeps progress in local storage only, through the skeleton (Req 5.6, 7.6)', () => {
    const app = readFileSync(join(srcDir, 'HouseApp.tsx'), 'utf8');
    expect(app).toContain("new LocalStorageStore('haunted-house:')");
    for (const [file, text] of all) expect(text, file).not.toMatch(/sessionStorage|indexedDB|document\.cookie/);
  });

  it('imports qrcode only in QrCode.tsx, which draws on the device (Req 6.3)', () => {
    for (const [file, text] of all) {
      if (file === 'QrCode.tsx') expect(text).toMatch(/from ['"]qrcode['"]/);
      else expect(text, file).not.toMatch(/from ['"]qrcode['"]/);
    }
  });
});
