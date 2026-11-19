import '@fontsource/im-fell-english/400.css';
import '@fontsource/creepster/400.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import QRCode from 'qrcode';
import { nextSunset } from '@haunt-kit/template/core';
import { tour } from '../../apps/ghost-walk/src/tour';
import { DEMO_CENTER, demoDraft } from '../../apps/scavenger-hunt/src/hunt';
import { posterSunset } from './poster-time';
import './poster.css';

const field = (name: string) => document.querySelectorAll<HTMLElement>(`[data-field="${name}"]`);
const fill = (name: string, text: string) => field(name).forEach((el) => (el.textContent = text));

const first = tour.stops[0]!;
fill('subtitle', tour.subtitle ?? '');
fill('start', `${first.name}. ${first.clue ?? ''}`.trim());
fill('sunset', posterSunset(Date.now(), DEMO_CENTER, nextSunset));
const demoStart = () => fill('hunt-start', `Demo hunt: ${demoDraft().stops[0]!.clue}`);
demoStart();

async function drawQr(el: HTMLElement, target: string) {
  const url = new URL(target, location.href).href;
  try {
    el.innerHTML = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#0d0618', light: '#ffffff' } });
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${el.dataset.label} (${url})`);
    el.dataset.testid = 'qr';
  } catch {
    el.textContent = url;
  }
}

for (const el of document.querySelectorAll<HTMLElement>('[data-qr]')) void drawQr(el, el.dataset.qr!);

// A host can print a poster for their own hunt: paste its share link and the QR code points there instead.
const form = document.getElementById('hunt-form') as HTMLFormElement;
const input = document.getElementById('hunt-link') as HTMLInputElement;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const link = input.value.trim();
  if (!/#\/play\/[\w-]+/.test(link)) {
    input.setCustomValidity('Paste a Spook Hunt share link: it contains #/play/.');
    input.reportValidity();
    return;
  }
  input.setCustomValidity('');
  void drawQr(document.getElementById('hunt-qr')!, link);
  fill('hunt-start', 'Scan to see the first clue.');
});
input.addEventListener('input', () => input.setCustomValidity(''));
document.getElementById('print')!.addEventListener('click', () => window.print());
