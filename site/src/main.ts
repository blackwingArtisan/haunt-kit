import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/spectral/400.css';
import '@fontsource/creepster/400.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import QRCode from 'qrcode';
import '@haunt-kit/template/styles.css';
import { mountHeroMap } from './hero';
import './styles.css';

mountHeroMap(document.getElementById('hero-map'));

// Each QR code points at the app's address on whatever host serves this page, drawn on the device.
for (const el of document.querySelectorAll<HTMLElement>('[data-qr]')) {
  const url = new URL(el.dataset.qr!, location.href).href;
  QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#0d0618', light: '#fff7ee' } })
    .then((svg) => {
      el.innerHTML = svg;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', `${el.dataset.label} (${url})`);
      el.dataset.testid = 'qr';
    })
    .catch(() => {
      el.textContent = url;
    });
}
