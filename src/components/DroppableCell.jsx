import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from '../hooks/useDrag';

/**
 * Droppable cell component for drag-and-drop functionality
 */
const DroppableCell = memo(({ date, hour, children, onCellClick, blocks = [] }) => {
  const drag = useDrag();
  const [isOver, setIsOver] = useState(false);

  // Define hasBlocks before using it in handlers
  const hasBlocks = blocks.length > 0 || (children && React.Children.count(children) > 0);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    if (drag?.draggedBlock) {
      drag.onDrop(drag.draggedBlock, { date, hour });
    }
  };

  const handleClick = () => {
    if (!hasBlocks) {
      onCellClick(date, hour);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !hasBlocks) {
      e.preventDefault();
      onCellClick(date, hour);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={hasBlocks ? -1 : 0}
      role={hasBlocks ? 'group' : 'button'}
      aria-label={hasBlocks ? `Time slot at ${hour}:00 with blocks` : `Add block at ${hour}:00`}
      style={{
        minHeight: '28px',
        borderRadius: '6px',
        background: isOver
          ? 'rgba(78,205,196,0.2)'
          : hasBlocks
          ? 'transparent'
          : 'rgba(255,255,255,0.02)',
        border: isOver
          ? '2px dashed #4ECDC4'
          : '1px solid transparent',
        cursor: hasBlocks ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        padding: '2px'
      }}
    >
      {children}
    </div>
  );
});

DroppableCell.displayName = 'DroppableCell';

DroppableCell.propTypes = {
  date: PropTypes.string.isRequired,
  hour: PropTypes.number.isRequired,
  children: PropTypes.node,
  onCellClick: PropTypes.func.isRequired,
  blocks: PropTypes.array
};

DroppableCell.defaultProps = {
  blocks: []
};

export default DroppableCell;
