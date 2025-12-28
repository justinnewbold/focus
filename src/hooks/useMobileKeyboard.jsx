import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to handle mobile virtual keyboard visibility
 * Adjusts modal/input positioning when keyboard appears
 * @param {Object} options - Configuration options
 * @param {Function} options.onKeyboardShow - Callback when keyboard shows
 * @param {Function} options.onKeyboardHide - Callback when keyboard hides
 * @returns {{ isKeyboardVisible, keyboardHeight, scrollToInput }}
 */
export const useMobileKeyboard = ({ onKeyboardShow, onKeyboardHide } = {}) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [initialViewportHeight] = useState(
    typeof window !== 'undefined' ? window.visualViewport?.height || window.innerHeight : 0
  );

  // Use refs for callbacks to avoid dependency issues
  const onKeyboardShowRef = useRef(onKeyboardShow);
  const onKeyboardHideRef = useRef(onKeyboardHide);

  useEffect(() => {
    onKeyboardShowRef.current = onKeyboardShow;
    onKeyboardHideRef.current = onKeyboardHide;
  }, [onKeyboardShow, onKeyboardHide]);

  // Detect keyboard visibility using visualViewport API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    let lastKeyboardVisible = false;

    const handleResize = () => {
      const currentHeight = viewport.height;
      const heightDiff = initialViewportHeight - currentHeight;

      // Keyboard is considered visible if viewport shrunk by more than 150px
      const keyboardVisible = heightDiff > 150;

      if (keyboardVisible !== lastKeyboardVisible) {
        lastKeyboardVisible = keyboardVisible;
        setIsKeyboardVisible(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? heightDiff : 0);

        if (keyboardVisible) {
          onKeyboardShowRef.current?.(heightDiff);
        } else {
          onKeyboardHideRef.current?.();
        }
      }
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, [initialViewportHeight]);

  // Fallback for browsers without visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || window.visualViewport) return;

    let lastKeyboardVisible = false;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialViewportHeight - currentHeight;
      const keyboardVisible = heightDiff > 150;

      if (keyboardVisible !== lastKeyboardVisible) {
        lastKeyboardVisible = keyboardVisible;
        setIsKeyboardVisible(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? heightDiff : 0);

        if (keyboardVisible) {
          onKeyboardShowRef.current?.(heightDiff);
        } else {
          onKeyboardHideRef.current?.();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialViewportHeight]);

  /**
   * Scroll an input element into view when focused
   * Accounts for keyboard height
   */
  const scrollToInput = useCallback((inputElement) => {
    if (!inputElement || typeof window === 'undefined') return;

    // Small delay to allow keyboard to fully appear
    setTimeout(() => {
      const rect = inputElement.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;

      // Check if input is obscured by keyboard
      if (rect.bottom > viewportHeight - 20) {
        const scrollAmount = rect.bottom - viewportHeight + 100; // 100px buffer

        // Scroll the modal content or window
        const scrollableParent = findScrollableParent(inputElement);
        if (scrollableParent) {
          scrollableParent.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        } else {
          window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
      }
    }, 300);
  }, []);

  return {
    isKeyboardVisible,
    keyboardHeight,
    scrollToInput
  };
};

/**
 * Find the nearest scrollable parent element
 */
const findScrollableParent = (element) => {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
};

/**
 * CSS helper to adjust modal position for keyboard
 * @param {number} keyboardHeight - Height of the keyboard
 * @returns {Object} Style object
 */
export const getKeyboardAwareStyles = (keyboardHeight) => {
  if (!keyboardHeight) return {};

  return {
    transform: `translateY(-${Math.min(keyboardHeight / 2, 150)}px)`,
    transition: 'transform 0.3s ease',
    maxHeight: `calc(100vh - ${keyboardHeight + 40}px)`
  };
};

export default useMobileKeyboard;
