import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { aiCoach } from '../utils/aiCoach';

/**
 * AI Productivity Coach Panel
 * Displays personalized insights, tips, and recommendations
 */
const AICoachPanel = memo(({ userId, onClose, compact = false }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [dailyTip, setDailyTip] = useState(null);
  const [weeklyInsights, setWeeklyInsights] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const [tip, insights, sched, userStats] = await Promise.all([
          aiCoach.getCachedDailyTip(userId),
          aiCoach.generateWeeklyInsights(userId),
          aiCoach.getScheduleSuggestions(userId),
          aiCoach.getUserStats(userId, 30)
        ]);
        
        setDailyTip(tip);
        setWeeklyInsights(insights);
        setSuggestions(sched);
        setStats(userStats);
      } catch (error) {
        console.error('Error loading AI insights:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

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

  const formatHour = (hour) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:00 ${ampm}`;
  };

  // Compact mode for embedding
  if (compact) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(78,205,196,0.1), rgba(69,183,209,0.1))',
        border: '1px solid rgba(78,205,196,0.2)',
        borderRadius: '16px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <span style={{ color: '#4ECDC4', fontWeight: '600', fontSize: '14px' }}>
            AI Coach
          </span>
        </div>
        
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Analyzing your patterns...
          </div>
        ) : dailyTip ? (
          <div style={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontSize: '14px',
            lineHeight: 1.5
          }}>
            {dailyTip.tip}
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Complete some focus sessions to get personalized tips!
          </div>
        )}
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
        background: 'linear-gradient(180deg, rgba(30,30,40,0.98), rgba(30,30,40,0.95))',
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
            <span style={{ fontSize: '32px' }}>🤖</span>
            AI Productivity Coach
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px'
        }}>
          {[
            { id: 'today', label: "Today's Tip", icon: '💡' },
            { id: 'weekly', label: 'Weekly Review', icon: '📊' },
            { id: 'schedule', label: 'Smart Schedule', icon: '📅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id 
                  ? 'linear-gradient(135deg, #4ECDC4, #45B7D1)' 
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 16px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayTab 
                dailyTip={dailyTip} 
                stats={stats}
              />
            )}
            {activeTab === 'weekly' && (
              <WeeklyTab 
                insights={weeklyInsights}
                stats={stats}
              />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab 
                suggestions={suggestions}
                formatHour={formatHour}
                getCategoryColor={getCategoryColor}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});

/**
 * Loading State Component
 */
const LoadingState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      animation: 'pulse 1.5s infinite',
      marginBottom: '20px'
    }}>
      🤖
    </div>
    <div style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
      Analyzing your productivity patterns...
    </div>
    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
      This may take a moment
    </div>
  </div>
);

/**
 * Today's Tip Tab
 */
const TodayTab = ({ dailyTip, stats }) => (
  <div>
    {/* Main Tip Card */}
    <div style={{
      background: 'linear-gradient(135deg, rgba(78,205,196,0.15), rgba(69,183,209,0.15))',
      border: '1px solid rgba(78,205,196,0.3)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {dailyTip?.icon || '💡'}
        </div>
        <div>
          <div style={{ color: '#4ECDC4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Today's Insight
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            {dailyTip?.category === 'ai_generated' ? 'Powered by AI' : 'Based on your patterns'}
          </div>
        </div>
      </div>
      
      <p style={{
        color: '#fff',
        fontSize: '18px',
        lineHeight: 1.6,
        margin: 0
      }}>
        {dailyTip?.tip || "Start your first focus session to get personalized insights!"}
      </p>
    </div>

    {/* Quick Stats */}
    {stats && (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          color: '#fff', 
          margin: '0 0 16px',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📈 Your Stats
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px'
        }}>
          <StatCard 
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            icon="✅"
            color={stats.completionRate >= 70 ? '#4ECDC4' : stats.completionRate >= 50 ? '#FFD93D' : '#FF6B6B'}
          />
          <StatCard 
            label="Current Streak"
            value={`${stats.currentStreak} days`}
            icon="🔥"
            color="#FF6B6B"
          />
          <StatCard 
            label="Focus Time"
            value={`${Math.round(stats.totalMinutes / 60)}h`}
            icon="⏱️"
            color="#45B7D1"
          />
          <StatCard 
            label="Peak Hour"
            value={stats.peakHours[0] ? `${stats.peakHours[0]}:00` : 'N/A'}
            icon="⚡"
            color="#DDA0DD"
          />
        </div>
      </div>
    )}

    {/* Quick Actions */}
    <div>
      <h3 style={{ 
        color: '#fff', 
        margin: '0 0 16px',
        fontSize: '16px'
      }}>
        💪 Quick Wins for Today
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          { text: 'Complete your first focus block', icon: '🎯' },
          { text: stats?.peakHours[0] ? `Schedule deep work at ${stats.peakHours[0]}:00` : 'Find your peak productivity hour', icon: '⏰' },
          { text: 'Take a 5-minute break between sessions', icon: '☕' }
        ].map((action, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>{action.icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{action.text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Weekly Review Tab
 */
const WeeklyTab = ({ insights, stats }) => (
  <div>
    {insights ? (
      <>
        {/* Weekly Summary Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.1))',
          border: '1px solid rgba(255,215,0,0.2)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              📊
            </div>
            <div>
              <div style={{ color: '#FFD700', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                Weekly Review
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                Last 7 days analysis
              </div>
            </div>
          </div>
          
          <p style={{
            color: '#fff',
            fontSize: '16px',
            lineHeight: 1.7,
            margin: 0
          }}>
            {insights.insights}
          </p>
        </div>

        {/* Week Stats Grid */}
        {insights.stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#4ECDC4' }}>
                {insights.stats.completedBlocks}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                Blocks Completed
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#45B7D1' }}>
                {Math.round(insights.stats.totalMinutes / 60)}h
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                Focus Time
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '36px', 
                fontWeight: '700', 
                color: insights.completionChange >= 0 ? '#4ECDC4' : '#FF6B6B'
              }}>
                {insights.completionChange >= 0 ? '+' : ''}{insights.completionChange}%
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                vs Last Week
              </div>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#FF6B6B' }}>
                {insights.stats.currentStreak}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                Day Streak
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {insights.stats?.categories && (
          <div>
            <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: '16px' }}>
              📁 Category Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(insights.stats.categories)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => {
                  const total = Object.values(insights.stats.categories).reduce((a, b) => a + b, 0);
                  const percentage = Math.round((count / total) * 100);
                  return (
                    <div key={category} style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '12px 16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{ color: '#fff', textTransform: 'capitalize' }}>{category}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{count} blocks ({percentage}%)</span>
                      </div>
                      <div style={{
                        height: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${percentage}%`,
                          background: getCategoryColorLocal(category),
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </>
    ) : (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <div style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
          Not enough data yet
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Complete a few more focus sessions to see weekly insights
        </div>
      </div>
    )}
  </div>
);

/**
 * Smart Schedule Tab
 */
const ScheduleTab = ({ suggestions, formatHour, getCategoryColor }) => (
  <div>
    <div style={{
      background: 'linear-gradient(135deg, rgba(150,206,180,0.1), rgba(78,205,196,0.1))',
      border: '1px solid rgba(150,206,180,0.2)',
      borderRadius: '20px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #96CEB4, #4ECDC4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          📅
        </div>
        <div>
          <div style={{ color: '#96CEB4', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
            Smart Schedule
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            {suggestions?.message || 'AI-powered recommendations'}
          </div>
        </div>
      </div>
    </div>

    {/* Suggested Time Slots */}
    <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: '16px' }}>
      ⚡ Optimal Time Slots
    </h3>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {suggestions?.suggestions?.map((slot, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '56px',
            textAlign: 'center'
          }}>
            <div style={{ 
              color: '#fff', 
              fontWeight: '700',
              fontSize: '18px'
            }}>
              {formatHour(slot.hour)}
            </div>
          </div>
          
          <div style={{
            width: '4px',
            height: '40px',
            borderRadius: '2px',
            background: getCategoryColor(slot.category)
          }} />
          
          <div style={{ flex: 1 }}>
            <div style={{ 
              color: '#fff', 
              fontWeight: '500',
              textTransform: 'capitalize',
              marginBottom: '4px'
            }}>
              {slot.category}
              {slot.duration && (
                <span style={{ 
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: '400',
                  marginLeft: '8px'
                }}>
                  {slot.duration}min
                </span>
              )}
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px'
            }}>
              {slot.reason}
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Tips */}
    <div style={{
      marginTop: '24px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '14px',
      padding: '16px'
    }}>
      <div style={{ 
        color: 'rgba(255,255,255,0.5)', 
        fontSize: '13px',
        lineHeight: 1.6
      }}>
        💡 <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Tip:</strong> These suggestions are based on your historical productivity patterns. 
        The more you use FOCUS, the smarter these recommendations become!
      </div>
    </div>
  </div>
);

/**
 * Stat Card Component
 */
const StatCard = ({ label, value, icon, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ color, fontSize: '22px', fontWeight: '700' }}>{value}</div>
    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '4px' }}>{label}</div>
  </div>
);

// Helper function for category colors
const getCategoryColorLocal = (category) => {
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

AICoachPanel.displayName = 'AICoachPanel';

AICoachPanel.propTypes = {
  userId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  compact: PropTypes.bool
};

export default AICoachPanel;
