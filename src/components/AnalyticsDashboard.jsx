import React, { useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { getToday } from '../utils/dateTime';

/**
 * Analytics dashboard showing productivity stats
 */
const AnalyticsDashboard = memo(({ stats, blocks }) => {
  const today = getToday();

  // Memoize calculations to prevent unnecessary recalculations
  const {
    todayStats,
    weekTotal,
    todayBlocksCount,
    completedBlocksCount
  } = useMemo(() => {
    const todayStatsData = stats.find(s => s.date === today) || {
      pomodoros_completed: 0,
      total_focus_minutes: 0
    };

    const weekTotalPomodoros = stats.reduce(
      (sum, s) => sum + (s.pomodoros_completed || 0),
      0
    );

    const todayBlocks = blocks.filter(b => b.date === today);
    const completedBlocks = todayBlocks.filter(b => b.pomodoro_count > 0);

    return {
      todayStats: todayStatsData,
      weekTotal: weekTotalPomodoros,
      todayBlocksCount: todayBlocks.length,
      completedBlocksCount: completedBlocks.length
    };
  }, [stats, blocks, today]);

  const statCards = [
    {
      label: 'Pomodoros',
      value: todayStats.pomodoros_completed || 0,
      icon: '🍅',
      color: '#FF6B6B'
    },
    {
      label: 'Focus mins',
      value: todayStats.total_focus_minutes || todayStats.focus_minutes || 0,
      icon: '⏱️',
      color: '#4ECDC4'
    },
    {
      label: 'Blocks',
      value: `${completedBlocksCount}/${todayBlocksCount}`,
      icon: '📋',
      color: '#845EC2'
    },
    {
      label: 'Week Total',
      value: weekTotal,
      icon: '📊',
      color: '#FFC75F'
    }
  ];

  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
      aria-labelledby="analytics-title"
    >
      <h3
        id="analytics-title"
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: 'rgba(255,255,255,0.7)'
        }}
      >
        Today's Progress
      </h3>

      <div
        className="analytics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}
        role="list"
        aria-label="Productivity statistics"
      >
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="analytics-card"
            role="listitem"
            aria-label={`${stat.label}: ${stat.value}`}
            style={{
              background: `${stat.color}10`,
              borderRadius: '12px',
              padding: '12px 8px',
              textAlign: 'center'
            }}
          >
            <div
              style={{ fontSize: '16px', marginBottom: '4px' }}
              aria-hidden="true"
            >
              {stat.icon}
            </div>
            <div
              className="analytics-value"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '24px',
                fontWeight: '700',
                color: stat.color
              }}
            >
              {stat.value}
            </div>
            <div
              className="analytics-label"
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

AnalyticsDashboard.displayName = 'AnalyticsDashboard';

AnalyticsDashboard.propTypes = {
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      pomodoros_completed: PropTypes.number,
      total_focus_minutes: PropTypes.number,
      focus_minutes: PropTypes.number
    })
  ).isRequired,
  blocks: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      date: PropTypes.string,
      pomodoro_count: PropTypes.number
    })
  ).isRequired
};

export default AnalyticsDashboard;
