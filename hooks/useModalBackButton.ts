'use client';

import { useEffect, useRef } from 'react';

export interface UseModalBackButtonOptions {
  /** Whether the modal is currently open / visible */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Optional custom identifier for stacked / nested modal tracking */
  modalId?: string;
  /** Optional async or sync confirmation callback before closing. Return false to cancel. */
  onConfirmClose?: () => boolean | Promise<boolean>;
  /** Whether the hook is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * Universal hook for intercepting the device / hardware / browser Back button
 * when a modal, drawer, or sheet is open.
 *
 * How it works:
 * 1. When `isOpen` becomes true, pushes a dummy entry to `window.history`.
 * 2. When the user taps the device back button (or mobile swipe back), a `popstate`
 *    event fires. The hook catches this event and calls `onClose()`, preventing
 *    the underlying page/route from navigating backwards in the background.
 * 3. When closed programmatically (X button, backdrop click, Escape key), the hook
 *    cleans up and pops the history state via `window.history.back()` so no extra
 *    dead entries remain in the history stack.
 */
export function useModalBackButton({
  isOpen,
  onClose,
  modalId,
  onConfirmClose,
  enabled = true,
}: UseModalBackButtonOptions): void {
  const onCloseRef = useRef(onClose);
  const onConfirmCloseRef = useRef(onConfirmClose);
  const isPushedRef = useRef(false);
  const idRef = useRef(modalId || `cozy_modal_${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    onCloseRef.current = onClose;
    onConfirmCloseRef.current = onConfirmClose;
  }, [onClose, onConfirmClose]);

  useEffect(() => {
    if (!enabled || !isOpen || typeof window === 'undefined') {
      return;
    }

    const currentModalId = idRef.current;

    // 1. Push a history entry representing the open modal state
    const currentState = window.history.state || {};
    window.history.pushState(
      { ...currentState, __cozyModalId: currentModalId },
      ''
    );
    isPushedRef.current = true;

    // 2. Handle hardware / browser back button popstate
    const handlePopState = async () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;

        if (onConfirmCloseRef.current) {
          try {
            const confirmed = await onConfirmCloseRef.current();
            if (!confirmed) {
              // User cancelled confirmation: restore the trap history state
              window.history.pushState(
                { ...(window.history.state || {}), __cozyModalId: currentModalId },
                ''
              );
              isPushedRef.current = true;
              return;
            }
          } catch {
            // In case of error in confirmation, proceed with close
          }
        }

        onCloseRef.current?.();
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 3. Cleanup on unmount or when isOpen becomes false
    return () => {
      window.removeEventListener('popstate', handlePopState);

      if (isPushedRef.current) {
        isPushedRef.current = false;
        // Only pop if the top history entry belongs to this modal
        if (window.history.state?.__cozyModalId === currentModalId) {
          window.history.back();
        }
      }
    };
  }, [isOpen, enabled]);
}
