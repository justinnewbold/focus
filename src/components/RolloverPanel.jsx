import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { rollover } from '../utils/rollover';

/**
 * Rollover Panel Component
 * Shows pending rollovers and rollover statistics
 */
const RolloverPanel = memo(({ userId, onRollover, onClose }) => {
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const [pendingData, statsData] = await Promise.all([
          rollover.getPendingRollovers(userId),
          rollover.getStats(userId)
        ]);
        
        setPending(pendingData);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading rollover data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const handleRolloverAll = useCallback(async () => {
    setRolling(true);
    try {
      const result = await rollover.rolloverToToday(userId);
      if (result.rolled > 0) {
        setPending([]);
        if (onRollover) {
          onRollover(result.blocks);
        }
      }
    } catch (error) {
      console.error('Error rolling over tasks:', error);
    } finally {
      setRolling(false);
    }
  }, [userId, onRollover]);

  const getCategoryColor = (category) => {
    const colors = {
      work: '#FF6B6B',
      meeting: '#4ECDC4',
      break: '#45B7D1',
      personal: '#96CEB4',
      learning: '#DDA0DD',
      exercise: '#FFD93D'
    };
    return colors[category] || '#888';
  };

  const getDaysOverdue = (date) => {
    const today = new Date();
    const taskDate = new Date(date);
    const diffTime = today - taskDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ color: '#fff' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(20px)',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(30,30,40,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 20px',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#fff', 
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🔄 Task Rollover
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '20px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        {/* Stats Overview */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <StatCard
              icon="🔄"
              label="Total Rolled Over"
              value={stats.totalRolledOver}
              color="#4ECDC4"
            />
            <StatCard
              icon="✅"
              label="Completed After"
              value={stats.completedAfterRollover}
              color="#45B7D1"
            />
            <StatCard
              icon="📊"
              label="Completion Rate"
              value={`${stats.rolloverCompletionRate}%`}
              color="#FFD700"
            />
            <StatCard
              icon="⏳"
              label="Pending"
              value={stats.pendingRollovers}
              color="#FF6B6B"
            />
          </div>
        )}

        {/* Pending Rollovers */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ 
              color: '#fff', 
              margin: 0,
              fontSize: '18px'
            }}>
              Pending Tasks ({pending.length})
            </h3>
            
            {pending.length > 0 && (
              <button
                onClick={handleRolloverAll}
                disabled={rolling}
                style={{
                  background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: rolling ? 'not-allowed' : 'pointer',
                  opacity: rolling ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {rolling ? (
                  <>⏳ Rolling over...</>
                ) : (
                  <>🔄 Roll All to Today</>
                )}
              </button>
            )}
          </div>

          {pending.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255,255,255,0.5)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
              <p style={{ margin: 0 }}>No pending tasks to roll over!</p>
              <p style={{ margin: '8px 0 0', fontSize: '14px' }}>
                Enable rollover on tasks to automatically move them to today when incomplete.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pending.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  getCategoryColor={getCategoryColor}
                  getDaysOverdue={getDaysOverdue}
                />
              ))}
            </div>
          )}
        </div>

        {/* How Rollover Works */}
        <div style={{
          background: 'rgba(78,205,196,0.1)',
          border: '1px solid rgba(78,205,196,0.2)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h3 style={{ 
            color: '#4ECDC4', 
            margin: '0 0 12px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💡 How Rollover Works
          </h3>
          
          <ul style={{
            margin: 0,
            padding: '0 0 0 20px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            lineHeight: 1.6
          }}>
            <li>Enable rollover on any task by clicking the 🔄 icon when creating or editing</li>
            <li>Incomplete tasks from previous days will appear here</li>
            <li>Click "Roll All to Today" to move them to your current schedule</li>
            <li>Original tasks are archived to preserve your history</li>
            <li>Track your completion rate for rolled-over tasks</li>
          </ul>
        </div>
      </div>
    </div>
  );
});

// Sub-components
const StatCard = memo(({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ 
      fontSize: '24px', 
      fontWeight: '700', 
      color,
      marginBottom: '4px'
    }}>
      {value}
    </div>
    <div style={{ 
      fontSize: '11px', 
      color: 'rgba(255,255,255,0.5)'
    }}>
      {label}
    </div>
  </div>
));

const TaskCard = memo(({ task, getCategoryColor, getDaysOverdue }) => {
  const daysOverdue = getDaysOverdue(task.date);
  
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      {/* Category Indicator */}
      <div style={{
        width: '4px',
        height: '40px',
        borderRadius: '2px',
        background: getCategoryColor(task.category)
      }} />
      
      {/* Task Info */}
      <div style={{ flex: 1 }}>
        <div style={{
          color: '#fff',
          fontWeight: '500',
          marginBottom: '4px'
        }}>
          {task.title}
        </div>
        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          <span>{task.category}</span>
          <span>•</span>
          <span>{task.duration || 25}min</span>
          {task.rolled_over_count > 0 && (
            <>
              <span>•</span>
              <span>🔄 ×{task.rolled_over_count}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Days Overdue Badge */}
      <div style={{
        background: daysOverdue > 3 
          ? 'rgba(255,107,107,0.2)' 
          : 'rgba(255,215,0,0.2)',
        color: daysOverdue > 3 ? '#FF6B6B' : '#FFD700',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {daysOverdue === 1 ? 'Yesterday' : `${daysOverdue}d ago`}
      </div>
    </div>
  );
});

RolloverPanel.displayName = 'RolloverPanel';

RolloverPanel.propTypes = {
  userId: PropTypes.string.isRequired,
  onRollover: PropTypes.func,
  onClose: PropTypes.func.isRequired
};

export default RolloverPanel;
