import React, { useState, memo } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from '../hooks/useDrag';

/**
 * Droppable cell component for drag-and-drop functionality
 * FIXED: Accept both onClick and onCellClick props, add isCurrentHour styling
 */
const DroppableCell = memo(({ 
  date, 
  hour, 
  children, 
  onClick,
  onCellClick,
  blocks = [],
  isCurrentHour = false 
}) => {
  const drag = useDrag();
  const [isOver, setIsOver] = useState(false);

  // Use either onClick or onCellClick (onClick takes precedence for backward compatibility)
  const handleCellClick = onClick || onCellClick;

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
    if (!hasBlocks && handleCellClick) {
      handleCellClick(date, hour);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !hasBlocks && handleCellClick) {
      e.preventDefault();
      handleCellClick(date, hour);
    }
  };

  // Determine background based on state
  const getBackground = () => {
    if (isOver) {
      return 'rgba(78, 205, 196, 0.2)';
    }
    if (isCurrentHour) {
      return 'rgba(255, 107, 107, 0.08)';
    }
    if (hasBlocks) {
      return 'transparent';
    }
    return 'var(--surface, rgba(255,255,255,0.02))';
  };

  // Determine border based on state
  const getBorder = () => {
    if (isOver) {
      return '2px dashed #4ECDC4';
    }
    if (isCurrentHour) {
      return '1px solid rgba(255, 107, 107, 0.3)';
    }
    return '1px solid transparent';
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
        background: getBackground(),
        border: getBorder(),
        cursor: hasBlocks ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        padding: '2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
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
  onClick: PropTypes.func,
  onCellClick: PropTypes.func,
  blocks: PropTypes.array,
  isCurrentHour: PropTypes.bool
};

DroppableCell.defaultProps = {
  blocks: [],
  isCurrentHour: false
};

export default DroppableCell;
