import { useCallback, useEffect, useRef, useState } from 'react';

interface OpenRequest {
  id: string;
  seq: number;
}

/**
 * Controls a native <dialog> for showing a stop: showModal gives focus
 * trapping, Escape to close and a backdrop for free, and focus returns to
 * whatever opened it.
 *
 * The dialog's `close` event arrives a moment after the dialog hides. By then
 * a fast keyboard user may already have moved on, or opened the next stop, so
 * a late `close` event must neither steal focus back nor clear a newer stop.
 */
export function useStopDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [request, setRequest] = useState<OpenRequest | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const nextSeq = useRef(0);
  const shownSeq = useRef(-1);

  const open = useCallback((id: string) => {
    returnFocus.current = (document.activeElement as HTMLElement) ?? null;
    nextSeq.current += 1;
    setRequest({ id, seq: nextSeq.current });
  }, []);
  const close = useCallback(() => {
    ref.current?.close();
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !request) return;
    shownSeq.current = request.seq;
    if (!dialog.open) dialog.showModal();
    // showModal focuses the autofocus button at the bottom, which scrolls a
    // tall story on a phone. Every story starts at its heading.
    dialog.scrollTop = 0;
  }, [request]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => {
      // A newer stop was opened before this event arrived: keep it.
      if (dialog.open) return;
      const closedSeq = shownSeq.current;
      setRequest((current) => (current && current.seq === closedSeq ? null : current));
      // Only put focus back if nothing else has taken it since.
      const active = document.activeElement;
      if (!active || active === document.body || dialog.contains(active)) returnFocus.current?.focus?.();
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  return { ref, openId: request?.id ?? null, open, close };
}
