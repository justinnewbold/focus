import React, { useState, useMemo, memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Analytics Dashboard Component
 * Displays time tracking statistics and heatmap
 * FIXED: Added compact prop, theme variables support, and better mobile layout
 */
const AnalyticsDashboard = memo(({ blocks = [], stats = [], compact = false }) => {
  const [timeRange, setTimeRange] = useState('week');
  
  const filteredBlocks = useMemo(() => {
    const now = new Date();
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return blocks.filter(b => new Date(b.date || b.created_at) >= start);
  }, [blocks, timeRange]);

  const totalTime = filteredBlocks.reduce((s, b) => s + (b.completed ? (b.timer_duration || 25) * 60 : 0), 0);
  
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const heatmap = useMemo(() => {
    const days = [];
    const now = new Date();
    const range = timeRange === 'week' ? 7 : 30;
    
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const mins = filteredBlocks
        .filter(b => (b.date || b.created_at)?.startsWith(dateStr))
        .reduce((s, b) => s + ((b.timer_duration || 25)), 0);
      days.push({ 
        date: dateStr, 
        mins, 
        level: mins === 0 ? 0 : mins < 60 ? 1 : mins < 120 ? 2 : mins < 180 ? 3 : 4 
      });
    }
    return days;
  }, [filteredBlocks, timeRange]);

  const categoryStats = useMemo(() => {
    const cats = {};
    filteredBlocks.forEach(b => {
      const c = b.category || 'General';
      cats[c] = (cats[c] || 0) + ((b.timer_duration || 25) * 60);
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([name, time]) => ({
        name,
        time,
        pct: Math.round((time / (totalTime || 1)) * 100)
      }));
  }, [filteredBlocks, totalTime]);

  const colors = ['#FF6B6B', '#4ECDC4', '#FFC75F', '#845EC2', '#00C9A7', '#FF9671'];

  // Compact view for sidebar
  if (compact) {
    return (
      <div style={{ 
        padding: '16px', 
        background: 'var(--surface, rgba(255,255,255,0.03))', 
        borderRadius: '16px',
        border: '1px solid var(--border-color, rgba(255,255,255,0.05))'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '14px', 
          color: 'var(--text-secondary, rgba(255,255,255,0.6))',
          fontWeight: '600'
        }}>
          📊 Quick Stats
        </h3>

        <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="analytics-card" style={{ 
            background: 'var(--surface, rgba(255,255,255,0.03))', 
            padding: '12px 8px', 
            borderRadius: '12px', 
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '20px', marginBottom: '2px' }}>⏱️</div>
            <div className="analytics-value" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-color, #FF6B6B)' }}>
              {formatTime(totalTime)}
            </div>
            <div className="analytics-label" style={{ color: 'var(--text-muted, rgba(255,255,255,0.4))', fontSize: '9px' }}>
              This Week
            </div>
          </div>
          <div className="analytics-card" style={{ 
            background: 'var(--surface, rgba(255,255,255,0.03))', 
            padding: '12px 8px', 
            borderRadius: '12px', 
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '20px', marginBottom: '2px' }}>✅</div>
            <div className="analytics-value" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--secondary-color, #4ECDC4)' }}>
              {filteredBlocks.filter(b => b.completed).length}
            </div>
            <div className="analytics-label" style={{ color: 'var(--text-muted, rgba(255,255,255,0.4))', fontSize: '9px' }}>
              Completed
            </div>
          </div>
          <div className="analytics-card" style={{ 
            background: 'var(--surface, rgba(255,255,255,0.03))', 
            padding: '12px 8px', 
            borderRadius: '12px', 
            textAlign: 'center' 
          }}>
            <div style={{ fontSize: '20px', marginBottom: '2px' }}>📅</div>
            <div className="analytics-value" style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary, #fff)' }}>
              {blocks.length}
            </div>
            <div className="analytics-label" style={{ color: 'var(--text-muted, rgba(255,255,255,0.4))', fontSize: '9px' }}>
              Total Blocks
            </div>
          </div>
        </div>

        {/* Mini heatmap */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, rgba(255,255,255,0.4))', marginBottom: '8px' }}>
            Last 7 days
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {heatmap.slice(-7).map((d, i) => (
              <div 
                key={i} 
                title={`${d.date}: ${Math.round(d.mins)}m`} 
                style={{ 
                  flex: 1,
                  height: '6px', 
                  borderRadius: '2px', 
                  background: [
                    'var(--surface, rgba(255,255,255,0.05))', 
                    'rgba(78, 205, 196, 0.3)', 
                    'rgba(78, 205, 196, 0.5)', 
                    'rgba(78, 205, 196, 0.7)', 
                    'var(--secondary-color, #4ECDC4)'
                  ][d.level] 
                }} 
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div style={{ 
      padding: '20px', 
      background: 'var(--bg-secondary, #1a1a2e)', 
      borderRadius: '16px', 
      color: 'var(--text-primary, white)' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary, white)' }}>📊 Time Analytics</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['week', 'month', 'all'].map(r => (
            <button 
              key={r} 
              onClick={() => setTimeRange(r)} 
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                border: 'none', 
                background: timeRange === r ? 'var(--accent-color, #FF6B6B)' : 'var(--surface, rgba(255,255,255,0.1))', 
                color: timeRange === r ? 'white' : 'var(--text-secondary, rgba(255,255,255,0.7))', 
                cursor: 'pointer',
                fontWeight: timeRange === r ? '600' : '400'
              }}
            >
              {r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface, rgba(255,255,255,0.05))', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>⏱️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-color, #FF6B6B)' }}>{formatTime(totalTime)}</div>
          <div style={{ color: 'var(--text-muted, rgba(255,255,255,0.5))', fontSize: '14px' }}>Total Focus</div>
        </div>
        <div style={{ background: 'var(--surface, rgba(255,255,255,0.05))', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>✅</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--secondary-color, #4ECDC4)' }}>{filteredBlocks.filter(b => b.completed).length}</div>
          <div style={{ color: 'var(--text-muted, rgba(255,255,255,0.5))', fontSize: '14px' }}>Completed</div>
        </div>
        <div style={{ background: 'var(--surface, rgba(255,255,255,0.05))', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>📈</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary, white)' }}>{Math.round(totalTime / 60 / Math.max(1, (timeRange === 'week' ? 7 : 30)))}m</div>
          <div style={{ color: 'var(--text-muted, rgba(255,255,255,0.5))', fontSize: '14px' }}>Daily Avg</div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '12px', color: 'var(--text-primary, white)' }}>🗓️ Activity Heatmap</h3>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {heatmap.map((d, i) => (
            <div 
              key={i} 
              title={`${d.date}: ${Math.round(d.mins)}m`} 
              style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '4px', 
                background: [
                  'var(--surface, rgba(255,255,255,0.05))', 
                  'rgba(78, 205, 196, 0.25)', 
                  'rgba(78, 205, 196, 0.5)', 
                  'rgba(78, 205, 196, 0.75)', 
                  'var(--secondary-color, #4ECDC4)'
                ][d.level] 
              }} 
            />
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: '12px', color: 'var(--text-primary, white)' }}>🏷️ Time by Category</h3>
        {categoryStats.length === 0 ? (
          <div style={{ color: 'var(--text-muted, rgba(255,255,255,0.4))', fontSize: '14px' }}>
            No data yet. Complete some focus blocks to see category breakdown.
          </div>
        ) : (
          categoryStats.map((c, i) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors[i % colors.length] }} />
              <span style={{ flex: 1, color: 'var(--text-primary, white)' }}>{c.name}</span>
              <span style={{ color: 'var(--text-muted, rgba(255,255,255,0.5))' }}>{formatTime(c.time)}</span>
              <div style={{ width: '100px', height: '8px', background: 'var(--surface, rgba(255,255,255,0.1))', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${c.pct}%`, height: '100%', background: colors[i % colors.length], transition: 'width 0.3s ease' }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

AnalyticsDashboard.displayName = 'AnalyticsDashboard';

AnalyticsDashboard.propTypes = {
  blocks: PropTypes.array,
  stats: PropTypes.array,
  compact: PropTypes.bool
};

AnalyticsDashboard.defaultProps = {
  blocks: [],
  stats: [],
  compact: false
};

export default AnalyticsDashboard;
