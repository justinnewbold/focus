import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from '../hooks/useDrag';
import { formatMinuteTime, getDurationDisplay } from '../utils/dateTime';
import { CATEGORY_COLORS } from '../constants';

/**
 * Time block component for displaying scheduled tasks
 */
const TimeBlock = memo(({
  block,
  onUpdate,
  onDelete,
  isActive,
  isCompact,
  onEdit,
  onStartTimer
}) => {
  const colors = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.work;
  const drag = useDrag();
  const startMinute = block.start_minute || 0;
  const durationMins = block.duration_minutes || 60;
  const hasCustomTimer = block.timer_duration && block.timer_duration > 0;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'move';
    drag?.setDraggedBlock(block);
  };

  const handleDragEnd = () => {
    drag?.setDraggedBlock(null);
  };

  // Compact view for week grid
  if (isCompact) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={() => onEdit?.(block)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit?.(block);
          }
        }}
        aria-label={`${block.title}, ${block.category}, ${getDurationDisplay(durationMins)}`}
        style={{
          background: colors.bg,
          color: colors.text,
          borderRadius: '6px',
          padding: '4px 6px',
          fontSize: '9px',
          fontWeight: '600',
          cursor: 'grab',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          border: isActive ? '2px solid #fff' : 'none',
          boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {block.title}
          </span>
          {durationMins !== 60 && (
            <span style={{ opacity: 0.7, fontSize: '7px' }}>
              ({getDurationDisplay(durationMins)})
            </span>
          )}
          {hasCustomTimer && (
            <span style={{ fontSize: '7px' }} aria-label="Has custom timer">
              ⏱️
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full view for day view
  return (
    <article
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-label={`${block.title} - ${block.category} from ${formatMinuteTime(block.hour, startMinute)}`}
      style={{
        background: `linear-gradient(135deg, ${colors.bg}20 0%, ${colors.bg}10 100%)`,
        borderRadius: '14px',
        padding: '14px 18px',
        marginBottom: '8px',
        border: isActive
          ? `2px solid ${colors.bg}`
          : `1px solid ${colors.bg}40`,
        cursor: 'grab',
        position: 'relative',
        boxShadow: isActive ? `0 0 20px ${colors.bg}30` : 'none'
      }}
    >
      {/* Drag indicator */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          cursor: 'grab',
          opacity: 0.4,
          fontSize: '10px'
        }}
        aria-hidden="true"
      >
        ⋮⋮
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Color indicator */}
        <div
          style={{
            width: '4px',
            height: '100%',
            minHeight: '40px',
            background: colors.bg,
            borderRadius: '2px'
          }}
          aria-hidden="true"
        />

        <div style={{ flex: 1 }}>
          {/* Time and duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <time
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              {formatMinuteTime(block.hour, startMinute)} -{' '}
              {formatMinuteTime(
                block.hour + Math.floor((startMinute + durationMins) / 60),
                (startMinute + durationMins) % 60
              )}
            </time>
            <span
              style={{
                background: colors.bg + '30',
                color: colors.bg,
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '9px',
                fontWeight: '600'
              }}
            >
              {getDurationDisplay(durationMins)}
            </span>
            {hasCustomTimer && (
              <span
                style={{
                  background: '#FFC75F30',
                  color: '#FFC75F',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: '600'
                }}
                aria-label={`Custom timer: ${block.timer_duration} minutes`}
              >
                ⏱️ {block.timer_duration}m
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            style={{
              fontWeight: '600',
              fontSize: '15px',
              color: '#fff',
              margin: 0,
              marginBottom: '6px'
            }}
          >
            {block.title}
          </h3>

          {/* Category and stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: colors.bg,
                color: colors.text,
                padding: '3px 10px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}
            >
              {block.category}
            </span>
            {block.pomodoro_count > 0 && (
              <span
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}
                aria-label={`${block.pomodoro_count} pomodoros completed`}
              >
                🍅 {block.pomodoro_count}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div
            style={{ display: 'flex', gap: '8px', marginTop: '10px' }}
            role="group"
            aria-label="Block actions"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(block);
              }}
              aria-label={`Edit ${block.title}`}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer?.(block);
              }}
              aria-label={`Start timer for ${block.title}`}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: colors.bg,
                color: colors.text,
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ▶ Start Timer
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id);
              }}
              aria-label={`Delete ${block.title}`}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,107,107,0.3)',
                background: 'transparent',
                color: '#FF6B6B',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

TimeBlock.displayName = 'TimeBlock';

TimeBlock.propTypes = {
  block: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    hour: PropTypes.number.isRequired,
    date: PropTypes.string.isRequired,
    start_minute: PropTypes.number,
    duration_minutes: PropTypes.number,
    timer_duration: PropTypes.number,
    pomodoro_count: PropTypes.number
  }).isRequired,
  onUpdate: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  isActive: PropTypes.bool,
  isCompact: PropTypes.bool,
  onEdit: PropTypes.func,
  onStartTimer: PropTypes.func
};

TimeBlock.defaultProps = {
  isActive: false,
  isCompact: false
};

export default TimeBlock;
