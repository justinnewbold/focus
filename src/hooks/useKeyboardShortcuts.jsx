import { useEffect, useCallback } from 'react';
import { KEYBOARD_SHORTCUTS } from '../constants';

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} handlers - Object mapping actions to handler functions
 * @param {boolean} enabled - Whether shortcuts are enabled
 */
export const useKeyboardShortcuts = (handlers, enabled = true) => {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable
    ) {
      return;
    }

    const key = event.key.toLowerCase();

    // Space - toggle timer
    if (key === KEYBOARD_SHORTCUTS.toggleTimer && handlers.toggleTimer) {
      event.preventDefault();
      handlers.toggleTimer();
    }

    // R - reset timer
    if (key === KEYBOARD_SHORTCUTS.resetTimer && handlers.resetTimer) {
      event.preventDefault();
      handlers.resetTimer();
    }

    // N - new block
    if (key === KEYBOARD_SHORTCUTS.newBlock && handlers.newBlock) {
      event.preventDefault();
      handlers.newBlock();
    }

    // Escape - close modal
    if (key === KEYBOARD_SHORTCUTS.escape && handlers.closeModal) {
      event.preventDefault();
      handlers.closeModal();
    }

    // Ctrl/Cmd + Z - undo
    if ((event.ctrlKey || event.metaKey) && key === 'z' && handlers.undo) {
      event.preventDefault();
      handlers.undo();
    }

    // Ctrl/Cmd + K - quick add
    if ((event.ctrlKey || event.metaKey) && key === 'k' && handlers.quickAdd) {
      event.preventDefault();
      handlers.quickAdd();
    }

    // Ctrl/Cmd + Shift + F - focus mode
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'f' && handlers.focusMode) {
      event.preventDefault();
      handlers.focusMode();
    }
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
};

export default useKeyboardShortcuts;
