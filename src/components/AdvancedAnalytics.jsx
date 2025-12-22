import React, { useState, useEffect, useMemo } from 'react';

const styles = {
  container: { padding: '20px', background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)', minHeight: '100vh', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  card: { background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' },
  statValue: { fontSize: '36px', fontWeight: 'bold', marginBottom: '4px' },
  streakContainer: { display: 'flex', gap: '20px', alignItems: 'center' },
  streakNumber: { fontSize: '48px', fontWeight: 'bold', color: '#FF6B6B' },
  heatmap: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginTop: '16px' },
  heatmapDay: { width: '100%', aspectRatio: '1', borderRadius: '4px', background: 'rgba(78, 205, 196, 0.2)' },
  goalCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  progressBar: { height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginTop: '8px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4)', borderRadius: '4px', transition: 'width 0.3s' },
  monthNav: { display: 'flex', alignItems: 'center', gap: '16px' },
  navButton: { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  weekBar: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px', marginTop: '16px' },
  bar: { flex: 1, background: 'linear-gradient(180deg, #FF6B6B, #4ECDC4)', borderRadius: '4px 4px 0 0', minHeight: '4px' },
  categoryBar: { display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', marginTop: '12px' }
};

const categoryColors = { work: '#FF6B6B', meeting: '#9B59B6', break: '#2ECC71', personal: '#F1C40F', learning: '#3498DB', exercise: '#E67E22' };

const GoalCard = ({ goal, progress, target }) => {
  const percent = Math.min((progress / target) * 100, 100);
  const achieved = percent >= 100;
  return (
    <div style={{ ...styles.goalCard, background: achieved ? 'rgba(78, 205, 196, 0.2)' : styles.goalCard.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '500' }}>{goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        {achieved && <span style={{ color: '#4ECDC4' }}>✓</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
        <span>{progress} / {target}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${percent}%` }} />
      </div>
    </div>
  );
};

const StreakDisplay = ({ currentStreak, longestStreak, last30Days }) => (
  <div style={styles.card}>
    <div style={styles.cardTitle}>🔥 Streak</div>
    <div style={styles.streakContainer}>
      <div>
        <div style={styles.streakNumber}>{currentStreak}</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Current</div>
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ECDC4' }}>{longestStreak}</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Best</div>
      </div>
    </div>
    <div style={styles.heatmap}>
      {last30Days.map((day, i) => (
        <div key={i} style={{ ...styles.heatmapDay, opacity: day.intensity || 0.2, background: day.count > 0 ? '#4ECDC4' : 'rgba(255,255,255,0.1)' }} title={`${day.date}: ${day.count} pomodoros`} />
      ))}
    </div>
  </div>
);

const MonthlyReport = ({ stats, month, onMonthChange }) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const totalPomodoros = stats.reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0);
  const totalMinutes = stats.reduce((sum, s) => sum + (s.focus_minutes || 0), 0);
  const activeDays = stats.filter(s => s.pomodoros_completed > 0).length;
  const avgPerDay = activeDays > 0 ? (totalPomodoros / activeDays).toFixed(1) : 0;
  
  const weeklyData = [0, 0, 0, 0, 0];
  stats.forEach(s => {
    const week = Math.floor(new Date(s.date).getDate() / 7);
    weeklyData[Math.min(week, 4)] += s.pomodoros_completed || 0;
  });
  const maxWeek = Math.max(...weeklyData, 1);

  const categoryTotals = {};
  stats.forEach(s => {
    Object.entries(s.categories_breakdown || {}).forEach(([cat, count]) => {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + count;
    });
  });
  const totalCats = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={styles.cardTitle}>📊 Monthly Report</div>
        <div style={styles.monthNav}>
          <button style={styles.navButton} onClick={() => onMonthChange(-1)}>←</button>
          <span>{monthNames[month.getMonth()]} {month.getFullYear()}</span>
          <button style={styles.navButton} onClick={() => onMonthChange(1)}>→</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalPomodoros}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Pomodoros</div></div>
        <div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(totalMinutes / 60).toFixed(1)}h</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Focus Time</div></div>
        <div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{activeDays}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Active Days</div></div>
        <div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{avgPerDay}</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Avg/Day</div></div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Weekly Trend</div>
        <div style={styles.weekBar}>
          {weeklyData.map((w, i) => (<div key={i} style={{ ...styles.bar, height: `${(w / maxWeek) * 100}%` }} title={`Week ${i + 1}: ${w}`} />))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>Categories</div>
        <div style={styles.categoryBar}>
          {Object.entries(categoryTotals).map(([cat, count]) => (
            <div key={cat} style={{ width: `${(count / totalCats) * 100}%`, background: categoryColors[cat] || '#888' }} title={`${cat}: ${count}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function AdvancedAnalytics({ userId, stats = [], goals = [], onSaveGoals }) {
  const [month, setMonth] = useState(new Date());
  const [showGoalSettings, setShowGoalSettings] = useState(false);
  const [editGoals, setEditGoals] = useState({ daily_pomodoros: { enabled: true, target: 8 }, weekly_pomodoros: { enabled: true, target: 40 }, streak_days: { enabled: true, target: 7 } });

  const monthStats = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().split('T')[0];
    return stats.filter(s => s.date >= start && s.date <= end);
  }, [stats, month]);

  const { currentStreak, longestStreak, last30Days } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sorted = [...stats].sort((a, b) => b.date.localeCompare(a.date));
    let current = 0, longest = 0, streak = 0;
    const days = [];
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stat = stats.find(s => s.date === dateStr);
      const count = stat?.pomodoros_completed || 0;
      days.push({ date: dateStr, count, intensity: Math.min(count / 8, 1) });
    }
    
    sorted.forEach((s, i) => {
      if (s.pomodoros_completed > 0) {
        if (i === 0 && (s.date === today || s.date === new Date(Date.now() - 86400000).toISOString().split('T')[0])) {
          streak++;
        } else if (i > 0) {
          const prev = new Date(sorted[i - 1].date);
          const curr = new Date(s.date);
          if ((prev - curr) / 86400000 === 1) streak++;
          else { longest = Math.max(longest, streak); streak = 1; }
        }
      }
    });
    longest = Math.max(longest, streak);
    return { currentStreak: streak, longestStreak: longest, last30Days: days };
  }, [stats]);

  const todayStats = stats.find(s => s.date === new Date().toISOString().split('T')[0]) || { pomodoros_completed: 0 };
  const weekStats = stats.filter(s => {
    const d = new Date(s.date);
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return d >= weekStart;
  }).reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📈 Analytics</h1>
        <button style={styles.navButton} onClick={() => setShowGoalSettings(!showGoalSettings)}>⚙️ Goals</button>
      </div>
      
      {showGoalSettings && (
        <div style={{ ...styles.card, marginBottom: '20px' }}>
          <div style={styles.cardTitle}>🎯 Goal Settings</div>
          {Object.entries(editGoals).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>{key.replace(/_/g, ' ')}</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="number" value={val.target} onChange={e => setEditGoals({ ...editGoals, [key]: { ...val, target: +e.target.value } })} style={{ width: '60px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px', padding: '4px 8px', color: '#fff' }} />
                <button onClick={() => setEditGoals({ ...editGoals, [key]: { ...val, enabled: !val.enabled } })} style={{ ...styles.navButton, background: val.enabled ? '#4ECDC4' : 'rgba(255,255,255,0.1)' }}>{val.enabled ? 'On' : 'Off'}</button>
              </div>
            </div>
          ))}
          <button onClick={() => { onSaveGoals?.(Object.entries(editGoals).filter(([_, v]) => v.enabled).map(([k, v]) => ({ type: k, target: v.target, period: k.includes('daily') ? 'daily' : k.includes('weekly') ? 'weekly' : 'ongoing' }))); setShowGoalSettings(false); }} style={{ ...styles.navButton, marginTop: '12px', width: '100%', background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)' }}>Save Goals</button>
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>🎯 Today's Goals</div>
          <GoalCard goal="daily_pomodoros" progress={todayStats.pomodoros_completed} target={editGoals.daily_pomodoros?.target || 8} />
          <GoalCard goal="weekly_pomodoros" progress={weekStats} target={editGoals.weekly_pomodoros?.target || 40} />
          <GoalCard goal="streak_days" progress={currentStreak} target={editGoals.streak_days?.target || 7} />
        </div>
        <StreakDisplay currentStreak={currentStreak} longestStreak={longestStreak} last30Days={last30Days} />
        <MonthlyReport stats={monthStats} month={month} onMonthChange={(dir) => setMonth(new Date(month.getFullYear(), month.getMonth() + dir, 1))} />
      </div>
    </div>
  );
}