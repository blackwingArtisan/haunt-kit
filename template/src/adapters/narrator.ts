/** Reads a stop's story aloud. */
export interface Narrator {
  readonly kind: string;
  /** True when this narrator can make sound in the current browser. */
  readonly available: boolean;
  speak(text: string, options?: { audioUrl?: string }): Promise<void>;
  stop(): void;
}

/** Says nothing. Used in tests and when the walker turns narration off. */
export class SilentNarrator implements Narrator {
  readonly kind = 'silent';
  readonly available = false;
  async speak() {}
  stop() {}
}

/** Remembers what it was asked to say, for tests. */
export class RecordingNarrator implements Narrator {
  readonly kind = 'recording';
  readonly available = true;
  readonly spoken: string[] = [];
  async speak(text: string) {
    this.spoken.push(text);
  }
  stop() {}
}

export interface SpeechVoiceStyle {
  rate?: number;
  pitch?: number;
  lang?: string;
}

/**
 * The browser's built-in speechSynthesis: free, offline on most phones, and
 * no keys. A recorded audio file, when the stop has one, plays instead.
 */
export class SpeechSynthesisNarrator implements Narrator {
  readonly kind = 'browser';
  private audio: HTMLAudioElement | null = null;

  constructor(private readonly style: SpeechVoiceStyle = {}) {}

  get available(): boolean {
    return typeof globalThis.speechSynthesis !== 'undefined' && typeof globalThis.SpeechSynthesisUtterance !== 'undefined';
  }

  speak(text: string, options: { audioUrl?: string } = {}): Promise<void> {
    this.stop();
    if (options.audioUrl && typeof Audio !== 'undefined') {
      const audio = new Audio(options.audioUrl);
      this.audio = audio;
      return new Promise((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    }
    if (!this.available) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = this.style.rate ?? 0.92;
      u.pitch = this.style.pitch ?? 0.8;
      u.lang = this.style.lang ?? 'en-US';
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  stop(): void {
    this.audio?.pause();
    this.audio = null;
    if (this.available) speechSynthesis.cancel();
  }
}
