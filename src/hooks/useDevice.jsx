import { useState, useEffect } from 'react';

/**
 * useDevice - Comprehensive device detection hook for mobile-first design
 * Detects touch devices, mobile vs desktop, iOS vs Android, and screen size
 */
export const useDevice = () => {
  const [device, setDevice] = useState({
    isMobile: false,
    isTouch: false,
    isIOS: false,
    isAndroid: false,
    isStandalone: false, // PWA mode
    screenSize: 'desktop', // 'small', 'medium', 'large', 'desktop'
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      
      // Touch detection - multiple methods for accuracy
      const isTouch = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
      
      // Mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (isTouch && window.innerWidth < 1024);
      
      // Platform detection
      const isIOS = /iPad|iPhone|iPod/.test(ua) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(ua);
      
      // PWA standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
      
      // Screen size categories
      const width = window.innerWidth;
      let screenSize = 'desktop';
      if (width < 375) screenSize = 'small';
      else if (width < 768) screenSize = 'medium';
      else if (width < 1024) screenSize = 'large';
      
      // Safe area insets (for notched devices)
      const safeAreaInsets = {
        top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
        bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
        left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
        right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0')
      };
      
      setDevice({
        isMobile,
        isTouch,
        isIOS,
        isAndroid,
        isStandalone,
        screenSize,
        safeAreaInsets
      });
    };

    detectDevice();
    
    // Re-detect on resize (for responsive testing)
    window.addEventListener('resize', detectDevice);
    
    // Re-detect on orientation change
    window.addEventListener('orientationchange', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return device;
};

/**
 * Haptic feedback utility - triggers vibration on supported devices
 */
export const triggerHaptic = (style = 'light') => {
  if (!navigator.vibrate) return;
  
  switch (style) {
    case 'light':
      navigator.vibrate(10);
      break;
    case 'medium':
      navigator.vibrate(20);
      break;
    case 'heavy':
      navigator.vibrate(30);
      break;
    case 'success':
      navigator.vibrate([10, 50, 10]);
      break;
    case 'warning':
      navigator.vibrate([20, 30, 20]);
      break;
    case 'error':
      navigator.vibrate([30, 30, 30, 30, 30]);
      break;
    default:
      navigator.vibrate(10);
  }
};

export default useDevice;
