/**
 * Pure logic behind `npm run create-app`. Nothing here reads or writes files:
 * the script passes in the starter's source text and the names of existing
 * apps, and gets back a map of file paths to file contents. Keep this module
 * free of Node imports and of TypeScript-only syntax (enums, parameter
 * properties), because the script runs it directly with Node's type stripping.
 */

export class CreateAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreateAppError';
  }
}

/** Ports 3170 to 3173 belong to the two apps in this repository; the next six are free for new ones. */
export const DEFAULT_PORT_RANGE = { first: 3174, last: 3179 } as const;

/** The hosted-site preview (`npm run preview:site`) lives outside `apps/`, so its port is reserved here. */
export const SITE_PREVIEW_PORT = 3169;

const RESERVED_FOLDERS = ['node_modules', 'dist', 'src', 'test'];
const FOLDER_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export const MAX_APP_NAME = 60;

/** Returns what is wrong with an app folder name, or null when it is fine. */
export function folderNameProblem(folder: unknown): string | null {
  if (typeof folder !== 'string' || folder === '') return 'Give the app a folder name, for example: npm run create-app -- river-walk';
  if (folder.length > 40) return 'The folder name must be 40 characters or fewer.';
  if (!FOLDER_NAME.test(folder)) {
    return 'Use lowercase letters, digits and single dashes, starting with a letter (for example "river-walk"). No spaces, slashes or dots.';
  }
  if (RESERVED_FOLDERS.includes(folder)) return `"${folder}" is reserved. Pick another name.`;
  return null;
}

/** Returns what is wrong with a display name, or null when it is fine. */
export function appNameProblem(name: unknown): string | null {
  if (typeof name !== 'string' || name.trim() === '') return 'The tour name cannot be empty.';
  if (name.trim().length > MAX_APP_NAME) return `The tour name must be ${MAX_APP_NAME} characters or fewer.`;
  if (/[\u0000-\u001f\u007f]/.test(name)) return 'The tour name cannot contain control characters or line breaks.';
  return null;
}

/** "river-walk" becomes "River Walk". */
export function defaultAppName(folder: string): string {
  return folder
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface Ports {
  dev: number;
  preview: number;
}

const validPort = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1024 && (n as number) <= 65535;

/**
 * Picks the dev and preview ports for a new app. Requested ports are used as
 * given (after checks). Otherwise the first free pair in 3174 to 3179 is used.
 * `taken` lists ports that other apps in the repository already use.
 */
export function choosePorts(taken: readonly number[], requested: { dev?: number; preview?: number } = {}): Ports {
  const used = new Set([...taken, SITE_PREVIEW_PORT]);
  const { first, last } = DEFAULT_PORT_RANGE;
  let dev = requested.dev;
  let preview = requested.preview;
  if (dev === undefined && preview === undefined) {
    for (let p = first; p + 1 <= last; p += 2) {
      if (!used.has(p) && !used.has(p + 1)) return { dev: p, preview: p + 1 };
    }
    throw new CreateAppError(`Ports ${first} to ${last} are all taken. Pass --dev-port and --preview-port.`);
  }
  if (dev === undefined) {
    dev = preview! - 1;
    if (used.has(dev)) throw new CreateAppError(`Port ${dev} is taken. Pass --dev-port as well.`);
  }
  preview ??= dev + 1;
  for (const [label, port] of [['dev', dev], ['preview', preview]] as const) {
    if (!validPort(port)) throw new CreateAppError(`The ${label} port must be a whole number from 1024 to 65535.`);
    if (port === SITE_PREVIEW_PORT) throw new CreateAppError(`The ${label} port ${port} is used by the hosted-site preview.`);
    if (used.has(port)) throw new CreateAppError(`The ${label} port ${port} is already used by another app in apps/.`);
  }
  if (dev === preview) throw new CreateAppError('The dev and preview ports must be different.');
  return { dev, preview };
}

export interface CreateAppOptions {
  /** Folder under apps/, for example "river-walk". */
  folder: string;
  /** Display name of the tour. Defaults to the folder name in title case. */
  name?: string;
  ports: Ports;
  /** Source text of template/starter/StarterApp.tsx. */
  starterApp: string;
  /** Source text of template/starter/starter-tour.ts. */
  starterTour: string;
  /** Exact versions to pin, copied from an existing app so every app matches. */
  versions: { template: string; react: string; reactDom: string };
  /** Folder names already in apps/. Compared without regard to case. */
  existingFolders: readonly string[];
  /** Package names already used by apps. */
  existingPackageNames?: readonly string[];
}

/** A map of path (relative to the app folder, with forward slashes) to file text. */
export type FileMap = Record<string, string>;

function tsString(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function replaceOnce(source: string, from: string, to: string, what: string): string {
  if (!source.includes(from)) throw new CreateAppError(`The starter has changed: could not find ${what}. Update template/scripts/create-app-files.ts.`);
  return source.replace(from, () => to);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#14161f"/><circle cx="32" cy="34" r="16" fill="#f2a65a"/><rect x="28" y="12" width="8" height="8" rx="2" fill="#f2a65a"/></svg>';

/** Builds every file of a new Vite app from the starter. Throws CreateAppError for bad input. */
export function createAppFiles(options: CreateAppOptions): FileMap {
  const { folder, ports, versions } = options;
  const folderProblem = folderNameProblem(folder);
  if (folderProblem) throw new CreateAppError(folderProblem);
  const name = (options.name ?? defaultAppName(folder)).trim();
  const nameProblem = appNameProblem(name);
  if (nameProblem) throw new CreateAppError(nameProblem);
  if (options.existingFolders.some((f) => f.toLowerCase() === folder.toLowerCase())) {
    throw new CreateAppError(`apps/${folder} already exists. Nothing was written. Pick another folder name or remove that folder yourself.`);
  }
  const packageName = `@haunt-kit/${folder}`;
  if (options.existingPackageNames?.includes(packageName)) {
    throw new CreateAppError(`The package name ${packageName} is already used by another app.`);
  }
  if (!validPort(ports.dev) || !validPort(ports.preview) || ports.dev === ports.preview) {
    throw new CreateAppError('The dev and preview ports must be different whole numbers from 1024 to 65535.');
  }

  // The starter imports the template by relative path; a generated app must use the package entry points.
  let app = options.starterApp;
  app = replaceOnce(app, "from '../src/adapters'", "from '@haunt-kit/template/adapters'", "the adapters import in StarterApp.tsx");
  app = replaceOnce(app, "from '../src/react'", "from '@haunt-kit/template/react'", "the react import in StarterApp.tsx");
  app = replaceOnce(app, "'my-first-walk:'", tsString(`${folder}:`), 'the storage prefix in StarterApp.tsx');

  let tour = options.starterTour;
  tour = replaceOnce(tour, "from '../src/core'", "from '@haunt-kit/template/core'", "the core import in starter-tour.ts");
  tour = replaceOnce(tour, "id: 'my-first-walk'", `id: ${tsString(folder)}`, 'the tour id in starter-tour.ts');
  tour = replaceOnce(tour, "title: 'My First Walk'", `title: ${tsString(name)}`, 'the tour title in starter-tour.ts');

  const description = `${name}: a GPS-triggered story walk built on Haunt Kit.`;
  const packageJson = {
    name: packageName,
    version: '0.1.0',
    private: true,
    description,
    license: 'MIT',
    type: 'module',
    scripts: {
      dev: `vite --port ${ports.dev} --strictPort`,
      build: 'vite build',
      preview: `vite preview --port ${ports.preview} --strictPort`,
    },
    dependencies: {
      '@haunt-kit/template': versions.template,
      react: versions.react,
      'react-dom': versions.reactDom,
    },
  };

  const viteConfig = `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { hauntKitPwa } from '@haunt-kit/template/vite';

const icon = ${tsString(ICON_SVG)};

export default defineConfig({
  base: './',
  plugins: [
    react(),
    hauntKitPwa({
      name: ${tsString(name)},
      shortName: ${tsString(name.slice(0, 12).trim())},
      description: ${tsString(description)},
      themeColor: '#14161f',
      backgroundColor: '#14161f',
      iconSvg: icon,
    }),
  ],
  define: {
    __HAUNT_POLLY__: JSON.stringify(false),
  },
  server: { port: ${ports.dev}, strictPort: true },
  preview: { port: ${ports.preview}, strictPort: true },
});
`;

  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(name)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  const mainTsx = `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@haunt-kit/template/styles.css';
import { registerServiceWorker } from '@haunt-kit/template/pwa';
import { StarterApp } from './StarterApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StarterApp />
  </StrictMode>,
);

void registerServiceWorker({ enabled: import.meta.env.PROD });
`;

  return {
    'index.html': indexHtml,
    'package.json': `${JSON.stringify(packageJson, null, 2)}\n`,
    'vite.config.ts': viteConfig,
    'src/main.tsx': mainTsx,
    'src/StarterApp.tsx': app,
    'src/starter-tour.ts': tour,
  };
}

/** The workspaces entry the builder adds to the root package.json by hand. */
export function workspaceEntry(folder: string): string {
  return `"apps/${folder}"`;
}

/** The lines the script prints after writing the files. */
export function nextSteps(folder: string, ports: Ports): string[] {
  return [
    `Created apps/${folder}.`,
    '',
    'Next steps:',
    `  1. Add this line to the "workspaces" list in the root package.json:  ${workspaceEntry(folder)},`,
    '  2. Run: npm install   (it links the new app and adds no new packages)',
    `  3. Run: npm run dev -w apps/${folder}   (opens on http://localhost:${ports.dev})`,
    `  4. Replace the three stops in apps/${folder}/src/starter-tour.ts with your own.`,
    `  5. Build with: npm run build -w apps/${folder}   (preview on http://localhost:${ports.preview})`,
  ];
}
