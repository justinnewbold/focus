import React, { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { timeEstimates } from '../utils/timeEstimates';

/**
 * Time Estimates Analytics Component
 * Shows detailed time tracking statistics and milestones
 */
const TimeEstimatesAnalytics = memo(({ userId, onClose }) => {
  const [stats, setStats] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const [statsData, weekly] = await Promise.all([
          timeEstimates.getStats(userId),
          timeEstimates.getWeeklySummary(userId, 8)
        ]);
        
        setStats(statsData);
        setWeeklyData(weekly);
        setMilestones(timeEstimates.getMilestones(statsData));
      } catch (error) {
        console.error('Error loading time estimates:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const formatMinutes = (mins) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
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
        <div style={{ color: '#fff' }}>Loading analytics...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'timeline', name: 'Timeline', icon: '📈' },
    { id: 'milestones', name: 'Milestones', icon: '🎯' }
  ];

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
            ⏱️ Time Analytics
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
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id 
                  ? 'rgba(78,205,196,0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: activeTab === tab.id 
                  ? '1px solid rgba(78,205,196,0.5)' 
                  : '1px solid transparent',
                borderRadius: '12px',
                padding: '10px 20px',
                color: activeTab === tab.id ? '#4ECDC4' : 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* Key Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <StatCard
                icon="⏱️"
                label="Time Saved"
                value={formatMinutes(stats.totalTimeSaved)}
                color="#4ECDC4"
              />
              <StatCard
                icon="🎯"
                label="Accuracy"
                value={`${stats.averageAccuracy}%`}
                color="#FFD700"
              />
              <StatCard
                icon="⚡"
                label="Early Completions"
                value={stats.tasksCompletedEarly}
                color="#FF6B6B"
              />
              <StatCard
                icon="📊"
                label="Tasks Estimated"
                value={stats.totalEstimates}
                color="#45B7D1"
              />
            </div>

            {/* Comparison Bar */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                color: '#fff', 
                margin: '0 0 16px',
                fontSize: '16px'
              }}>
                Estimated vs Actual Time
              </h3>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                    Estimated
                  </span>
                  <span style={{ color: '#4ECDC4', fontSize: '13px' }}>
                    {formatMinutes(stats.totalEstimatedMinutes)}
                  </span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  height: '12px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#4ECDC4',
                    height: '100%',
                    width: '100%',
                    borderRadius: '6px'
                  }} />
                </div>
              </div>

              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                    Actual
                  </span>
                  <span style={{ color: '#FF6B6B', fontSize: '13px' }}>
                    {formatMinutes(stats.totalActualMinutes)}
                  </span>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  height: '12px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#FF6B6B',
                    height: '100%',
                    width: stats.totalEstimatedMinutes > 0 
                      ? `${Math.min(100, (stats.totalActualMinutes / stats.totalEstimatedMinutes) * 100)}%`
                      : '0%',
                    borderRadius: '6px'
                  }} />
                </div>
              </div>
            </div>

            {/* Completion Distribution */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <h3 style={{ 
                color: '#fff', 
                margin: '0 0 16px',
                fontSize: '16px'
              }}>
                Completion Distribution
              </h3>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <DistributionItem
                  label="Early"
                  value={stats.tasksCompletedEarly}
                  total={stats.totalCompleted}
                  color="#4ECDC4"
                  icon="⚡"
                />
                <DistributionItem
                  label="On Time"
                  value={stats.tasksCompletedOnTime}
                  total={stats.totalCompleted}
                  color="#FFD700"
                  icon="✓"
                />
                <DistributionItem
                  label="Late"
                  value={stats.tasksCompletedLate}
                  total={stats.totalCompleted}
                  color="#FF6B6B"
                  icon="⏰"
                />
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            <h3 style={{ 
              color: '#fff', 
              margin: '0 0 20px',
              fontSize: '18px'
            }}>
              Weekly Performance
            </h3>
            
            {weeklyData.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255,255,255,0.5)'
              }}>
                No data yet. Start tracking time estimates!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {weeklyData.map((week, index) => (
                  <WeekCard key={index} week={week} formatMinutes={formatMinutes} />
                ))}
              </div>
            )}

            {/* Daily Performance */}
            {stats?.recentPerformance?.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ 
                  color: '#fff', 
                  margin: '0 0 20px',
                  fontSize: '18px'
                }}>
                  Daily Breakdown (Last 30 Days)
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '4px'
                }}>
                  {stats.recentPerformance.map((day, index) => (
                    <div
                      key={index}
                      title={`${day.date}: ${day.count} tasks, ${formatMinutes(day.saved)} saved`}
                      style={{
                        aspectRatio: '1',
                        background: day.saved > 0 
                          ? `rgba(78, 205, 196, ${Math.min(1, day.saved / 60)})` 
                          : 'rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div>
            <h3 style={{ 
              color: '#fff', 
              margin: '0 0 20px',
              fontSize: '18px'
            }}>
              Time Tracking Milestones
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {milestones.map(milestone => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// Sub-components
const StatCard = memo(({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ 
      fontSize: '24px', 
      fontWeight: '700', 
      color,
      marginBottom: '4px'
    }}>
      {value}
    </div>
    <div style={{ 
      fontSize: '12px', 
      color: 'rgba(255,255,255,0.5)'
    }}>
      {label}
    </div>
  </div>
));

const DistributionItem = memo(({ label, value, total, color, icon }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  
  return (
    <div style={{
      flex: 1,
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ 
        fontSize: '28px', 
        fontWeight: '700', 
        color,
        marginBottom: '4px'
      }}>
        {percent}%
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: 'rgba(255,255,255,0.5)'
      }}>
        {label} ({value})
      </div>
    </div>
  );
});

const WeekCard = memo(({ week, formatMinutes }) => (
  <div style={{
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px'
    }}>
      <span style={{ color: '#fff', fontWeight: '600' }}>
        Week of {new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>
      <span style={{ 
        color: week.totalSaved > 0 ? '#4ECDC4' : 'rgba(255,255,255,0.5)',
        fontSize: '14px'
      }}>
        {week.totalSaved > 0 ? `+${formatMinutes(week.totalSaved)} saved` : 'No time saved'}
      </span>
    </div>
    
    <div style={{
      display: 'flex',
      gap: '16px',
      fontSize: '13px',
      color: 'rgba(255,255,255,0.6)'
    }}>
      <span>📋 {week.tasksCompleted} tasks</span>
      <span>⚡ {week.earlyCompletions} early</span>
      <span>⏱️ {formatMinutes(week.totalActual)} actual</span>
    </div>
  </div>
));

const MilestoneCard = memo(({ milestone }) => (
  <div style={{
    background: milestone.completed 
      ? 'rgba(78,205,196,0.1)' 
      : 'rgba(255,255,255,0.05)',
    border: milestone.completed 
      ? '1px solid rgba(78,205,196,0.3)' 
      : '1px solid transparent',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }}>
    <div style={{
      fontSize: '32px',
      opacity: milestone.completed ? 1 : 0.5
    }}>
      {milestone.icon}
    </div>
    
    <div style={{ flex: 1 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ 
          color: milestone.completed ? '#4ECDC4' : '#fff',
          fontWeight: '600'
        }}>
          {milestone.name}
        </span>
        <span style={{ 
          color: milestone.completed ? '#4ECDC4' : 'rgba(255,255,255,0.5)',
          fontSize: '13px'
        }}>
          {milestone.completed ? '✓ Complete' : `${milestone.progress}%`}
        </span>
      </div>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '6px',
        height: '6px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: milestone.completed ? '#4ECDC4' : '#FFD700',
          height: '100%',
          width: `${milestone.progress}%`,
          borderRadius: '6px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      <div style={{
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        marginTop: '6px'
      }}>
        {milestone.current}{milestone.isPercent ? '%' : ''} / {milestone.target}{milestone.isPercent ? '%' : ''}
      </div>
    </div>
  </div>
));

TimeEstimatesAnalytics.displayName = 'TimeEstimatesAnalytics';

TimeEstimatesAnalytics.propTypes = {
  userId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

export default TimeEstimatesAnalytics;
