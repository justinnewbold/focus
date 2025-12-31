import React, { useMemo } from "react";

const DailyProgressWidget = ({ blocks = [], selectedDate }) => {
  const stats = useMemo(() => {
    const today = selectedDate || new Date().toISOString().split("T")[0];
    const todayBlocks = blocks.filter(b => b.date === today);
    const completedBlocks = todayBlocks.filter(b => b.completed);
    const totalMinutes = todayBlocks.reduce((acc, b) => acc + (b.duration || 25), 0);
    const completedMinutes = completedBlocks.reduce((acc, b) => acc + (b.duration || 25), 0);
    
    // Category breakdown
    const categories = todayBlocks.reduce((acc, b) => {
      const cat = b.category || "work";
      if (!acc[cat]) acc[cat] = { total: 0, completed: 0 };
      acc[cat].total++;
      if (b.completed) acc[cat].completed++;
      return acc;
    }, {});

    const percentage = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;
    
    return {
      total: todayBlocks.length,
      completed: completedBlocks.length,
      totalMinutes,
      completedMinutes,
      percentage,
      categories
    };
  }, [blocks, selectedDate]);

  const categoryColors = {
    work: "#007AFF",
    meeting: "#FF9500",
    break: "#34C759",
    personal: "#AF52DE",
    learning: "#5856D6",
    exercise: "#FF2D55"
  };

  const categoryEmojis = {
    work: "💼",
    meeting: "👥",
    break: "☕",
    personal: "🏠",
    learning: "📚",
    exercise: "🏃"
  };

  // Calculate stroke offset for circular progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (stats.percentage / 100) * circumference;

  return (
    <div className="daily-progress-widget">
      <style>{`
        .daily-progress-widget {
          background: var(--ios-card-bg, rgba(255, 255, 255, 0.8));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--ios-border, rgba(0, 0, 0, 0.1));
        }
        
        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .widget-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--ios-text-primary, #000);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
        }
        
        .widget-badge {
          background: var(--ios-tint, #007AFF);
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .progress-container {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        
        .circular-progress {
          position: relative;
          width: 120px;
          height: 120px;
          flex-shrink: 0;
        }
        
        .circular-progress svg {
          transform: rotate(-90deg);
        }
        
        .progress-bg {
          fill: none;
          stroke: var(--ios-separator, rgba(0, 0, 0, 0.1));
          stroke-width: 8;
        }
        
        .progress-bar {
          fill: none;
          stroke: var(--ios-tint, #007AFF);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.5s ease;
        }
        
        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        .progress-percentage {
          font-size: 28px;
          font-weight: 700;
          color: var(--ios-text-primary, #000);
          line-height: 1;
        }
        
        .progress-label {
          font-size: 11px;
          color: var(--ios-text-secondary, #6B6B6B);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
        }
        
        .stats-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .stat-label {
          font-size: 15px;
          color: var(--ios-text-secondary, #6B6B6B);
        }
        
        .stat-value {
          font-size: 17px;
          font-weight: 600;
          color: var(--ios-text-primary, #000);
        }
        
        .categories-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--ios-separator, rgba(0, 0, 0, 0.1));
        }
        
        .categories-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--ios-text-secondary, #6B6B6B);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        
        .category-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 12px;
          background: var(--ios-grouped-bg, rgba(0, 0, 0, 0.05));
          font-size: 13px;
        }
        
        .category-emoji {
          font-size: 14px;
        }
        
        .category-count {
          font-weight: 600;
          color: var(--ios-text-primary, #000);
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--ios-text-secondary, #6B6B6B);
        }
        
        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .empty-state-text {
          font-size: 15px;
        }
        
        @media (max-width: 600px) {
          .progress-container {
            flex-direction: column;
            text-align: center;
          }
          
          .categories-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="widget-header">
        <span className="widget-title">Today's Progress</span>
        {stats.total > 0 && (
          <span className="widget-badge">{stats.completed}/{stats.total} blocks</span>
        )}
      </div>

      {stats.total === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">No blocks scheduled for today.<br/>Add some to get started!</div>
        </div>
      ) : (
        <>
          <div className="progress-container">
            <div className="circular-progress">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle className="progress-bg" cx="60" cy="60" r={radius} />
                <circle 
                  className="progress-bar" 
                  cx="60" 
                  cy="60" 
                  r={radius}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                />
              </svg>
              <div className="progress-text">
                <div className="progress-percentage">{stats.percentage}%</div>
                <div className="progress-label">Complete</div>
              </div>
            </div>

            <div className="stats-container">
              <div className="stat-row">
                <span className="stat-label">Time Planned</span>
                <span className="stat-value">{Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Completed</span>
                <span className="stat-value">{Math.floor(stats.completedMinutes / 60)}h {stats.completedMinutes % 60}m</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Remaining</span>
                <span className="stat-value">{Math.floor((stats.totalMinutes - stats.completedMinutes) / 60)}h {(stats.totalMinutes - stats.completedMinutes) % 60}m</span>
              </div>
            </div>
          </div>

          {Object.keys(stats.categories).length > 0 && (
            <div className="categories-section">
              <div className="categories-title">By Category</div>
              <div className="categories-grid">
                {Object.entries(stats.categories).map(([cat, data]) => (
                  <div 
                    key={cat} 
                    className="category-chip"
                    style={{ borderLeft: `3px solid ${categoryColors[cat] || "#666"}` }}
                  >
                    <span className="category-emoji">{categoryEmojis[cat] || "📌"}</span>
                    <span className="category-count">{data.completed}/{data.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyProgressWidget;