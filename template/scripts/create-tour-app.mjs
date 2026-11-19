#!/usr/bin/env node
// Creates a new Haunt Kit app in apps/<folder> from template/starter.
//   npm run create-app -- <folder> [--name "Tour name"] [--dev-port 3176] [--preview-port 3177]
// All decisions live in create-app-files.ts (pure, unit-tested). This file only reads and writes files.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { choosePorts, CreateAppError, createAppFiles, nextSteps } from './create-app-files.ts';

const here = dirname(fileURLToPath(import.meta.url));
const templateDir = join(here, '..');
const appsDir = join(templateDir, '..', 'apps');

const USAGE = `Usage: npm run create-app -- <folder> [--name "Tour name"] [--dev-port N] [--preview-port N]

  <folder>          lowercase letters, digits and dashes, for example river-walk
  --name            display name of the tour (default: the folder name in title case)
  --dev-port        dev server port (default: the first free pair from 3174 to 3179)
  --preview-port    preview server port (default: dev port + 1)`;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function portOption(value, label) {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new CreateAppError(`${label} must be a whole number.`);
  return Number(value);
}

function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      'dev-port': { type: 'string' },
      'preview-port': { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (positionals.length !== 1) throw new CreateAppError(`Expected one folder name.\n\n${USAGE}`);
  const folder = positionals[0];

  const existingFolders = readdirSync(appsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const packages = existingFolders.flatMap((f) => {
    try {
      return [readJson(join(appsDir, f, 'package.json'))];
    } catch {
      return [];
    }
  });
  const taken = packages.flatMap((p) => Object.values(p.scripts ?? {}).flatMap((s) => [...String(s).matchAll(/--port (\d+)/g)].map((m) => Number(m[1]))));
  const ports = choosePorts(taken, {
    dev: portOption(values['dev-port'], '--dev-port'),
    preview: portOption(values['preview-port'], '--preview-port'),
  });

  const reference = packages.find((p) => p.dependencies?.react && p.dependencies?.['react-dom']);
  if (!reference) throw new CreateAppError('Could not find an existing app in apps/ to copy the React versions from.');
  const files = createAppFiles({
    folder,
    name: values.name,
    ports,
    starterApp: readFileSync(join(templateDir, 'starter', 'StarterApp.tsx'), 'utf8'),
    starterTour: readFileSync(join(templateDir, 'starter', 'starter-tour.ts'), 'utf8'),
    versions: {
      template: readJson(join(templateDir, 'package.json')).version,
      react: reference.dependencies.react,
      reactDom: reference.dependencies['react-dom'],
    },
    existingFolders,
    existingPackageNames: packages.map((p) => p.name),
  });

  // mkdir without recursive fails if the folder appeared since the check above, so nothing is overwritten.
  const appDir = join(appsDir, folder);
  mkdirSync(appDir);
  for (const [path, text] of Object.entries(files)) {
    const target = join(appDir, ...path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text, { flag: 'wx' });
  }
  console.log(nextSteps(folder, ports).join('\n'));
}

try {
  main();
} catch (err) {
  if (err instanceof CreateAppError) {
    console.error(err.message);
  } else if (err?.code === 'EEXIST') {
    console.error('That folder already exists. Nothing was overwritten.');
  } else {
    console.error(err instanceof Error ? err.message : String(err));
  }
  process.exitCode = 1;
}
