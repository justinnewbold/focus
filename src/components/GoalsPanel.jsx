import React, { useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import {
  getGoals,
  getStreaks,
  calculateGoalProgress,
  getGoalDateRange,
  getStreakCalendar
} from '../utils/goals';

/**
 * Goals and Streaks Panel Component
 * Displays goal progress and streak information
 */
const GoalsPanel = memo(({ blocks, stats }) => {
  const goals = useMemo(() => getGoals().filter(g => g.enabled), []);
  const streaks = useMemo(() => getStreaks(), []);
  const streakCalendar = useMemo(() => getStreakCalendar(28), []);

  const goalProgress = useMemo(() => {
    return goals.map(goal => ({
      ...goal,
      progress: calculateGoalProgress(goal, blocks, stats, getGoalDateRange(goal.type))
    }));
  }, [goals, blocks, stats]);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      {/* Streak Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
            🔥 Streak
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B6B' }}>
                {streaks.currentStreak}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Current</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#4ECDC4' }}>
                {streaks.longestStreak}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Best</div>
            </div>
          </div>
        </div>

        {/* Streak Calendar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '3px'
          }}
        >
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div
              key={i}
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.3)',
                textAlign: 'center',
                paddingBottom: '4px'
              }}
            >
              {day}
            </div>
          ))}
          {streakCalendar.map((day, i) => (
            <div
              key={i}
              title={day.date}
              style={{
                aspectRatio: '1',
                borderRadius: '3px',
                background: day.active
                  ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
                  : 'rgba(255,255,255,0.05)',
                opacity: day.active ? 1 : 0.5
              }}
            />
          ))}
        </div>
      </div>

      {/* Goals Section */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
          🎯 Goals
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {goalProgress.map((goal) => (
            <div
              key={goal.id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                  {goal.name}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: goal.progress.completed ? '#4ECDC4' : 'rgba(255,255,255,0.5)'
                  }}
                >
                  {goal.progress.current.toFixed(1)}/{goal.progress.target}
                  {goal.type.includes('hours') ? 'h' : ''}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${goal.progress.percentage}%`,
                    background: goal.progress.completed
                      ? 'linear-gradient(90deg, #4ECDC4 0%, #45B7D1 100%)'
                      : 'linear-gradient(90deg, #FF6B6B 0%, #FF8E8E 100%)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>

              {goal.progress.completed && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#4ECDC4' }}>
                  ✓ Goal achieved!
                </div>
              )}
            </div>
          ))}

          {goalProgress.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              No goals set. Add goals in settings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GoalsPanel.displayName = 'GoalsPanel';

GoalsPanel.propTypes = {
  blocks: PropTypes.array.isRequired,
  stats: PropTypes.array.isRequired
};

export default GoalsPanel;
