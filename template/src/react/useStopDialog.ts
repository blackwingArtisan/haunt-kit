import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Controls a native <dialog> for showing a stop: showModal gives focus
 * trapping, Escape to close and a backdrop for free, and focus returns to
 * whatever opened it.
 */
export function useStopDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((id: string) => {
    returnFocus.current = (document.activeElement as HTMLElement) ?? null;
    setOpenId(id);
  }, []);
  const close = useCallback(() => {
    ref.current?.close();
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (openId && !dialog.open) dialog.showModal();
    const onClose = () => {
      setOpenId(null);
      returnFocus.current?.focus?.();
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [openId]);

  return { ref, openId, open, close };
}
