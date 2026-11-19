import type { Narrator } from './narrator';

/**
 * Amazon Polly narration (neural voices). This is the real, paid adapter: it is
 * written and type-checked but not used by default, and no test calls it.
 *
 * It runs in the browser with temporary, unauthenticated credentials from a
 * Cognito identity pool whose role may only call polly:SynthesizeSpeech.
 * Enable with VITE_HAUNT_NARRATOR=polly, VITE_AWS_REGION and
 * VITE_POLLY_IDENTITY_POOL_ID. The AWS SDK is loaded on demand so the default
 * build never ships it.
 */
export interface PollyNarratorConfig {
  region: string;
  identityPoolId: string;
  voiceId?: string;
}

export class PollyNarrator implements Narrator {
  readonly kind = 'polly';
  readonly available = true;
  private audio: HTMLAudioElement | null = null;
  private readonly cache = new Map<string, string>();

  constructor(private readonly config: PollyNarratorConfig) {}

  async speak(text: string, options: { audioUrl?: string } = {}): Promise<void> {
    this.stop();
    const url = options.audioUrl ?? (await this.synthesize(text));
    const audio = new Audio(url);
    this.audio = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }

  stop(): void {
    this.audio?.pause();
    this.audio = null;
  }

  private async synthesize(text: string): Promise<string> {
    const cached = this.cache.get(text);
    if (cached) return cached;
    const [{ PollyClient, SynthesizeSpeechCommand }, { fromCognitoIdentityPool }] = await Promise.all([
      import('@aws-sdk/client-polly'),
      import('@aws-sdk/credential-providers'),
    ]);
    const client = new PollyClient({
      region: this.config.region,
      credentials: fromCognitoIdentityPool({
        identityPoolId: this.config.identityPoolId,
        clientConfig: { region: this.config.region },
      }),
    });
    const ssml = `<speak><prosody rate="92%" pitch="-8%">${escapeXml(text)}</prosody></speak>`;
    const out = await client.send(
      new SynthesizeSpeechCommand({
        Engine: 'neural',
        OutputFormat: 'mp3',
        TextType: 'ssml',
        Text: ssml,
        VoiceId: (this.config.voiceId ?? 'Matthew') as never,
      }),
    );
    if (!out.AudioStream) throw new Error('Polly returned no audio');
    const bytes = await out.AudioStream.transformToByteArray();
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'audio/mpeg' }));
    this.cache.set(text, url);
    return url;
  }
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}
