import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { triggerHaptic } from '../hooks/useDevice';

/**
 * iOS-Native Bottom Sheet Component
 * Features:
 * - Swipe to dismiss gesture
 * - Smooth spring animations
 * - Backdrop tap to close
 * - Handle indicator for drag
 * - Safe area support
 * - Keyboard avoidance
 */
const BottomSheet = memo(({ 
  isOpen, 
  onClose, 
  children, 
  title,
  snapPoints = ['50%', '90%'], // Snap positions
  initialSnap = 0,
  showHandle = true,
  showBackdrop = true,
  enableSwipeClose = true
}) => {
  const sheetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const sheetHeight = useRef(0);

  // Calculate sheet height based on snap point
  const getSnapHeight = useCallback((snapIndex) => {
    const snap = snapPoints[snapIndex] || snapPoints[0];
    if (typeof snap === 'string' && snap.endsWith('%')) {
      return (parseInt(snap) / 100) * window.innerHeight;
    }
    return snap;
  }, [snapPoints]);

  // Open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTranslateY(0);
      triggerHaptic('light');
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isOpen]);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    if (!enableSwipeClose) return;
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragCurrentY.current = clientY;
    sheetHeight.current = sheetRef.current?.getBoundingClientRect().height || 0;
    setIsDragging(true);
  }, [enableSwipeClose]);

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    dragCurrentY.current = clientY;
    
    const deltaY = clientY - dragStartY.current;
    
    // Only allow dragging down (positive deltaY) or slight up resistance
    if (deltaY > 0) {
      setTranslateY(deltaY);
    } else {
      // Rubber band effect when dragging up
      setTranslateY(deltaY * 0.2);
    }
  }, [isDragging]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const deltaY = dragCurrentY.current - dragStartY.current;
    const velocity = deltaY / 100; // Simplified velocity
    
    // Close if dragged down more than 30% or with high velocity
    if (deltaY > sheetHeight.current * 0.3 || velocity > 1.5) {
      triggerHaptic('light');
      onClose();
    } else {
      // Snap back
      setIsAnimating(true);
      setTranslateY(0);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isDragging, onClose]);

  // Touch event handlers
  useEffect(() => {
    if (!isOpen) return;
    
    const handleTouchMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        handleDragMove(e);
      }
    };
    
    const handleTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, isDragging, handleDragMove, handleDragEnd]);

  // Keyboard avoidance
  useEffect(() => {
    if (!isOpen) return;
    
    const handleResize = () => {
      // Adjust for virtual keyboard
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        if (sheetRef.current && heightDiff > 100) {
          sheetRef.current.style.maxHeight = `${window.visualViewport.height - 20}px`;
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentHeight = getSnapHeight(currentSnap);

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            zIndex: 2000,
            opacity: isDragging ? Math.max(0.2, 1 - (translateY / 300)) : 1,
            transition: isDragging ? 'none' : 'opacity 0.3s ease'
          }}
        />
      )}
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: `${currentHeight}px`,
          background: 'var(--card-bg, #1c1c1e)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          zIndex: 2001,
          transform: `translateY(${translateY}px)`,
          transition: isAnimating || !isDragging ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)'
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div
            onTouchStart={handleDragStart}
            onMouseDown={handleDragStart}
            style={{
              padding: '12px',
              cursor: 'grab',
              touchAction: 'none'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '5px',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '3px',
                margin: '0 auto'
              }}
            />
          </div>
        )}
        
        {/* Title */}
        {title && (
          <div
            style={{
              padding: '0 20px 12px',
              fontSize: '17px',
              fontWeight: '600',
              color: '#fff',
              textAlign: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {title}
          </div>
        )}
        
        {/* Content */}
        <div
          style={{
            overflow: 'auto',
            maxHeight: `calc(${currentHeight}px - ${title ? '80px' : '40px'})`,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
});

BottomSheet.displayName = 'BottomSheet';

BottomSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  snapPoints: PropTypes.array,
  initialSnap: PropTypes.number,
  showHandle: PropTypes.bool,
  showBackdrop: PropTypes.bool,
  enableSwipeClose: PropTypes.bool
};

export default BottomSheet;
