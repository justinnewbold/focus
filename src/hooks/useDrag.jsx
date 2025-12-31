import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Drag and drop context for time blocks
 */
const DragContext = createContext(null);

/**
 * Provider component for drag and drop functionality
 * Supports both onDrop (legacy) and onBlockMove (new) callbacks
 */
export const DragProvider = ({ children, blocks, onBlockMove, onDrop }) => {
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const handleDrop = useCallback((block, target) => {
    // Support both callback styles
    if (onBlockMove && block?.id && target) {
      onBlockMove(block.id, target.date, target.hour);
    } else if (onDrop) {
      onDrop(block, target);
    }
    setDraggedBlock(null);
    setDropTarget(null);
  }, [onBlockMove, onDrop]);

  // Find full block data from blocks array if needed
  const getBlockById = useCallback((blockId) => {
    return blocks?.find(b => b.id === blockId) || null;
  }, [blocks]);

  const contextValue = {
    draggedBlock,
    setDraggedBlock,
    dropTarget,
    setDropTarget,
    onDrop: handleDrop,
    blocks,
    getBlockById
  };

  return (
    <DragContext.Provider value={contextValue}>
      {children}
    </DragContext.Provider>
  );
};

DragProvider.propTypes = {
  children: PropTypes.node.isRequired,
  blocks: PropTypes.array,
  onBlockMove: PropTypes.func,
  onDrop: PropTypes.func
};

DragProvider.defaultProps = {
  blocks: [],
  onBlockMove: null,
  onDrop: null
};

/**
 * Hook to access drag context
 * @returns {{ draggedBlock, setDraggedBlock, dropTarget, setDropTarget, onDrop, blocks, getBlockById }}
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
      onDrop: () => {},
      blocks: [],
      getBlockById: () => null
    };
  }
  return context;
};

export { DragContext };
export default useDrag;
