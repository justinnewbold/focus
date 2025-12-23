import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Drag and drop context for time blocks
 */
const DragContext = createContext(null);

/**
 * Provider component for drag and drop functionality
 */
export const DragProvider = ({ children, onDrop }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const handleDrop = useCallback((block, target) => {
    if (onDrop) {
      onDrop(block, target);
    }
    setDraggedBlock(null);
    setDropTarget(null);
  }, [onDrop]);

  const contextValue = {
    draggedBlock,
    setDraggedBlock,
    dropTarget,
    setDropTarget,
    onDrop: handleDrop
  };

  return (
    <DragContext.Provider value={contextValue}>
      {children}
    </DragContext.Provider>
  );
};

DragProvider.propTypes = {
  children: PropTypes.node.isRequired,
  onDrop: PropTypes.func
};

/**
 * Hook to access drag context
 * @returns {{ draggedBlock, setDraggedBlock, dropTarget, setDropTarget, onDrop }}
 */
export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    console.warn('useDrag must be used within a DragProvider');
    return {
      draggedBlock: null,
      setDraggedBlock: () => {},
      dropTarget: null,
      setDropTarget: () => {},
      onDrop: () => {}
    };
  }
  return context;
};

export { DragContext };
export default useDrag;
