import React, { useState, useMemo } from 'react';

const AnalyticsDashboard = ({ blocks = [] }) => {
  const [timeRange, setTimeRange] = useState('week');
  const filteredBlocks = useMemo(() => {
    const now = new Date();
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return blocks.filter(b => new Date(b.date || b.created_at) >= start);
  }, [blocks, timeRange]);

  const totalTime = filteredBlocks.reduce((s, b) => s + (b.completed ? (b.timer_duration || 1500) : 0), 0);
  const formatTime = (s) => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };

  const heatmap = useMemo(() => {
    const days = [], now = new Date(), range = timeRange === 'week' ? 7 : 30;
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const mins = filteredBlocks.filter(b => (b.date || b.created_at)?.startsWith(dateStr)).reduce((s, b) => s + ((b.timer_duration || 1500) / 60), 0);
      days.push({ date: dateStr, mins, level: mins === 0 ? 0 : mins < 60 ? 1 : mins < 120 ? 2 : mins < 180 ? 3 : 4 });
    }
    return days;
  }, [filteredBlocks, timeRange]);

  const categoryStats = useMemo(() => {
    const cats = {};
    filteredBlocks.forEach(b => { const c = b.category || 'General'; cats[c] = (cats[c] || 0) + (b.timer_duration || 1500); });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, time]) => ({ name, time, pct: Math.round((time / (totalTime || 1)) * 100) }));
  }, [filteredBlocks, totalTime]);

  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div style={{ padding: '20px', background: '#1a1a2e', borderRadius: '16px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>📊 Time Analytics</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['week', 'month', 'all'].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: timeRange === r ? '#4F46E5' : '#333', color: 'white', cursor: 'pointer' }}>
              {r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#252540', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>⏱️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatTime(totalTime)}</div>
          <div style={{ color: '#888', fontSize: '14px' }}>Total Focus</div>
        </div>
        <div style={{ background: '#252540', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>✅</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{filteredBlocks.filter(b => b.completed).length}</div>
          <div style={{ color: '#888', fontSize: '14px' }}>Completed</div>
        </div>
        <div style={{ background: '#252540', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '4px' }}>📈</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.round(totalTime / 60 / (timeRange === 'week' ? 7 : 30))}m</div>
          <div style={{ color: '#888', fontSize: '14px' }}>Daily Avg</div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>🗓️ Activity Heatmap</h3>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {heatmap.map((d, i) => (
            <div key={i} title={`${d.date}: ${Math.round(d.mins)}m`} style={{ width: '20px', height: '20px', borderRadius: '4px', background: ['#1a1a2e', '#2d4a3e', '#3d6b4f', '#4d8c60', '#10B981'][d.level] }} />
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: '12px' }}>🏷️ Time by Category</h3>
        {categoryStats.map((c, i) => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: colors[i % colors.length] }} />
            <span style={{ flex: 1 }}>{c.name}</span>
            <span style={{ color: '#888' }}>{formatTime(c.time)}</span>
            <div style={{ width: '100px', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${c.pct}%`, height: '100%', background: colors[i % colors.length] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
