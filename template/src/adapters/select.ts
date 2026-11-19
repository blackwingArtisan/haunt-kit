import { SilentNarrator, SpeechSynthesisNarrator, type Narrator, type SpeechVoiceStyle } from './narrator';
import type { PollyNarrator } from './narrator-polly';
import { LocalStorageStore, MemoryStore, type KeyValueStore } from './storage';

/**
 * Picks adapters from environment-style settings (in a Vite app, pass
 * import.meta.env). Every default is free and local.
 *
 *   VITE_HAUNT_NARRATOR = browser (default) | silent | polly
 *   VITE_HAUNT_STORAGE  = local (default) | memory
 *   VITE_AWS_REGION, VITE_POLLY_IDENTITY_POOL_ID, VITE_POLLY_VOICE  (polly only)
 */
export interface AdapterEnv {
  VITE_HAUNT_NARRATOR?: string;
  VITE_HAUNT_STORAGE?: string;
  VITE_AWS_REGION?: string;
  VITE_POLLY_IDENTITY_POOL_ID?: string;
  VITE_POLLY_VOICE?: string;
  [key: string]: unknown;
}

/**
 * Loaders for paid adapters. An app passes one only inside a build-time
 * constant branch, so the default build never bundles the AWS SDK.
 */
export interface AdapterLoaders {
  polly?: () => Promise<{ PollyNarrator: typeof PollyNarrator }>;
}

export async function createNarrator(env: AdapterEnv, style?: SpeechVoiceStyle, loaders: AdapterLoaders = {}): Promise<Narrator> {
  const kind = typeof env.VITE_HAUNT_NARRATOR === 'string' && env.VITE_HAUNT_NARRATOR ? env.VITE_HAUNT_NARRATOR : 'browser';
  switch (kind) {
    case 'silent':
      return new SilentNarrator();
    case 'polly': {
      if (!env.VITE_AWS_REGION || !env.VITE_POLLY_IDENTITY_POOL_ID) {
        throw new Error('VITE_HAUNT_NARRATOR=polly needs VITE_AWS_REGION and VITE_POLLY_IDENTITY_POOL_ID');
      }
      if (!loaders.polly) throw new Error('Polly narration is not in this build; build with VITE_HAUNT_NARRATOR=polly');
      const { PollyNarrator } = await loaders.polly();
      return new PollyNarrator({
        region: String(env.VITE_AWS_REGION),
        identityPoolId: String(env.VITE_POLLY_IDENTITY_POOL_ID),
        voiceId: typeof env.VITE_POLLY_VOICE === 'string' ? env.VITE_POLLY_VOICE : undefined,
      });
    }
    case 'browser':
      return new SpeechSynthesisNarrator(style);
    default:
      throw new Error(`Unknown VITE_HAUNT_NARRATOR "${kind}"`);
  }
}

export function createStore(env: AdapterEnv, prefix?: string): KeyValueStore {
  return env.VITE_HAUNT_STORAGE === 'memory' ? new MemoryStore() : new LocalStorageStore(prefix);
}
