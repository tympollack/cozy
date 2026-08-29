import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModalBackButton } from '@/hooks/useModalBackButton';

describe('useModalBackButton Hook', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, 'pushState');
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {
      // Mock popstate dispatch for window.history.back()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes history state entry when modal opens', () => {
    const onClose = vi.fn();
    renderHook(() => useModalBackButton({ isOpen: true, onClose, modalId: 'test-modal' }));

    expect(pushStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ __cozyModalId: 'test-modal' }),
      ''
    );
  });

  it('does not push history state when isOpen is false or enabled is false', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen, enabled }) => useModalBackButton({ isOpen, onClose, enabled }),
      { initialProps: { isOpen: false, enabled: true } }
    );

    expect(pushStateSpy).not.toHaveBeenCalled();

    rerender({ isOpen: true, enabled: false });
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('invokes onClose when popstate event (hardware back) fires', () => {
    const onClose = vi.fn();
    renderHook(() => useModalBackButton({ isOpen: true, onClose, modalId: 'test-modal-back' }));

    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    // Simulate device hardware back button
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pops history state with history.back() when modal closes programmatically', () => {
    const onClose = vi.fn();
    // Mock current history state having our modal ID
    window.history.replaceState({ __cozyModalId: 'test-programmatic' }, '');

    const { rerender } = renderHook(
      ({ isOpen }) => useModalBackButton({ isOpen, onClose, modalId: 'test-programmatic' }),
      { initialProps: { isOpen: true } }
    );

    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    // Change isOpen to false (programmatic close via button/backdrop)
    rerender({ isOpen: false });

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('respects onConfirmClose callback if user cancels closing', async () => {
    const onClose = vi.fn();
    const onConfirmClose = vi.fn().mockResolvedValue(false);

    renderHook(() =>
      useModalBackButton({
        isOpen: true,
        onClose,
        modalId: 'test-confirm',
        onConfirmClose,
      })
    );

    expect(pushStateSpy).toHaveBeenCalledTimes(1);

    // Simulate back button press
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(onConfirmClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    // Restored trap state
    expect(pushStateSpy).toHaveBeenCalledTimes(2);
  });
});
