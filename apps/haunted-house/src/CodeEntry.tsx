import { useRef, useState, type FormEvent } from 'react';
import type { ScanOutcome } from '@haunt-kit/template/adapters';
import type { ScanMessage } from './house-logic';

export interface CodeEntryProps {
  /** Sends the typed text to the same entry point a scanned poster uses. */
  onSubmit: (raw: string) => ScanOutcome;
  /** The last outcome, announced in a live region. */
  message: ScanMessage | null;
}

/**
 * A labelled field and an "Enter room" button. Typing a code is a full
 * alternative to scanning, so this is always on the main screen. The two live
 * regions stay in the page so a screen reader announces each new outcome:
 * polite for progress, `alert` for refusals.
 */
export function CodeEntry({ onSubmit, message }: CodeEntryProps) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const outcome = onSubmit(value);
    // A refused code stays in the field so it can be corrected. An accepted one is done.
    if (outcome.status !== 'refused') setValue('');
    input.current?.focus();
  }

  return (
    <section className="hh-entry" aria-labelledby="hh-entry-heading">
      <h2 id="hh-entry-heading" className="hh-h2">
        Enter a room
      </h2>
      <form className="hh-entry__form" onSubmit={submit} noValidate>
        <label className="hh-entry__label" htmlFor="hh-room-code">
          Room code
        </label>
        <div className="hh-entry__row">
          <input
            ref={input}
            id="hh-room-code"
            className="hh-input"
            name="room-code"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby="hh-entry-help"
          />
          <button type="submit" className="hk-btn">
            Enter room
          </button>
        </div>
        <p id="hh-entry-help" className="hh-note">
          Scan a poster with your phone&rsquo;s camera, or type the four-character code printed on it.
        </p>
      </form>
      <p className="hh-message" role="status" aria-live="polite">
        {message?.tone === 'info' ? message.text : ''}
      </p>
      <p className="hh-message hh-message--error" role="alert">
        {message?.tone === 'error' ? message.text : ''}
      </p>
    </section>
  );
}
