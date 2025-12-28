import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { generateWeeklyReport } from '../services/aiService';

/**
 * Enhanced Analytics Dashboard with AI-powered insights
 */
export default function EnhancedAnalytics({ blocks, stats, isVisible, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [weeklyReport, setWeeklyReport] = useState('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [dateRange, setDateRange] = useState('week');

  // Calculate analytics data
  const getFilteredData = useCallback(() => {
    const now = new Date();
    let startDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.toISOString().split('T')[0]);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return {
      blocks: blocks.filter(b => new Date(b.date) >= startDate),
      stats: Array.isArray(stats) ? stats.filter(s => new Date(s.created_at) >= startDate) : []
    };
  }, [blocks, stats, dateRange]);

  const { blocks: filteredBlocks, stats: filteredStats } = getFilteredData();

  // Calculate category breakdown
  const categoryData = filteredBlocks.reduce((acc, block) => {
    const cat = block.category || 'uncategorized';
    acc[cat] = (acc[cat] || 0) + (block.duration || 25);
    return acc;
  }, {});

  // Calculate daily distribution
  const dailyData = filteredBlocks.reduce((acc, block) => {
    const day = new Date(block.date).toLocaleDateString('en-US', { weekday: 'short' });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  // Calculate hourly distribution
  const hourlyData = filteredBlocks.reduce((acc, block) => {
    const hour = block.hour || 9;
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  // Stats calculations
  const totalBlocks = filteredBlocks.length;
  const totalMinutes = filteredBlocks.reduce((acc, b) => acc + (b.duration || 25), 0);
  const completedPomodoros = filteredStats.filter(s => s.completed).length;
  const avgDailyBlocks = dateRange === 'today' ? totalBlocks : Math.round(totalBlocks / 7);
  const completionRate = filteredStats.length > 0 
    ? Math.round((completedPomodoros / filteredStats.length) * 100) 
    : 0;

  // Load AI weekly report
  const loadWeeklyReport = useCallback(async () => {
    setIsLoadingReport(true);
    try {
      const report = await generateWeeklyReport(filteredBlocks, filteredStats);
      setWeeklyReport(report);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setWeeklyReport('Unable to generate AI report. Please try again later.');
    } finally {
      setIsLoadingReport(false);
    }
  }, [filteredBlocks, filteredStats]);

  useEffect(() => {
    if (activeTab === 'ai-report') {
      loadWeeklyReport();
    }
  }, [activeTab, loadWeeklyReport]);

  if (!isVisible) return null;

  const categoryColors = {
    work: '#3b82f6',
    meeting: '#8b5cf6',
    personal: '#10b981',
    learning: '#f59e0b',
    exercise: '#ef4444',
    break: '#6b7280',
    uncategorized: '#94a3b8'
  };

  const maxCategoryValue = Math.max(...Object.values(categoryData), 1);
  const maxHourlyValue = Math.max(...Object.values(hourlyData), 1);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-primary, white)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: 'var(--text-primary, #1a1a2e)' }}>
              📊 Enhanced Analytics
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>
              AI-powered productivity insights
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary, #f1f5f9)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--text-primary, #1a1a2e)'
            }}
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          background: 'var(--bg-secondary, #f8fafc)'
        }}>
          {[
            { id: 'overview', label: '📈 Overview', icon: '' },
            { id: 'categories', label: '📁 Categories', icon: '' },
            { id: 'patterns', label: '🕐 Patterns', icon: '' },
            { id: 'ai-report', label: '🤖 AI Report', icon: '' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#667eea' : 'var(--text-secondary, #64748b)',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range Filter */}
        <div style={{
          padding: '12px 24px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)' }}>Period:</span>
          {['today', 'week', 'month', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: dateRange === range ? '2px solid #667eea' : '1px solid var(--border-color, #e2e8f0)',
                background: dateRange === range ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                color: dateRange === range ? '#667eea' : 'var(--text-secondary, #64748b)',
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {activeTab === 'overview' && (
            <div>
              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {[
                  { label: 'Total Blocks', value: totalBlocks, icon: '📦', color: '#3b82f6' },
                  { label: 'Focus Time', value: `${Math.round(totalMinutes / 60)}h`, icon: '⏱️', color: '#10b981' },
                  { label: 'Pomodoros', value: completedPomodoros, icon: '🍅', color: '#ef4444' },
                  { label: 'Completion', value: `${completionRate}%`, icon: '✅', color: '#8b5cf6' },
                  { label: 'Avg/Day', value: avgDailyBlocks, icon: '📊', color: '#f59e0b' }
                ].map((stat, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-secondary, #f8fafc)',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Category Overview */}
              <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-primary, #1a1a2e)' }}>
                Time by Category
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(categoryData).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, minutes]) => (
                  <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '80px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--text-primary, #1a1a2e)',
                      textTransform: 'capitalize'
                    }}>
                      {category}
                    </div>
                    <div style={{ flex: 1, height: '24px', background: 'var(--bg-secondary, #e2e8f0)', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(minutes / maxCategoryValue) * 100}%`,
                        background: categoryColors[category] || '#94a3b8',
                        borderRadius: '6px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                    <div style={{ width: '60px', fontSize: '13px', color: 'var(--text-secondary, #64748b)', textAlign: 'right' }}>
                      {Math.round(minutes / 60)}h {minutes % 60}m
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary, #1a1a2e)' }}>
                Category Breakdown
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {Object.entries(categoryData).map(([category, minutes]) => {
                  const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
                  return (
                    <div key={category} style={{
                      background: 'var(--bg-secondary, #f8fafc)',
                      borderRadius: '12px',
                      padding: '16px',
                      borderLeft: `4px solid ${categoryColors[category] || '#94a3b8'}`
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text-primary, #1a1a2e)',
                        textTransform: 'capitalize',
                        marginBottom: '8px'
                      }}>
                        {category}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: categoryColors[category] || '#94a3b8' }}>
                        {Math.round(minutes / 60)}h {minutes % 60}m
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
                        {percentage}% of total time
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary, #1a1a2e)' }}>
                🕐 Peak Productivity Hours
              </h3>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                  {Array.from({ length: 14 }, (_, i) => i + 6).map(hour => {
                    const count = hourlyData[hour] || 0;
                    const height = maxHourlyValue > 0 ? (count / maxHourlyValue) * 100 : 0;
                    return (
                      <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                          width: '100%',
                          height: `${height}%`,
                          minHeight: count > 0 ? '4px' : '0',
                          background: count > 0 ? 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease'
                        }} />
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary, #64748b)', marginTop: '4px' }}>
                          {hour}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary, #1a1a2e)' }}>
                📅 Daily Activity
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const count = dailyData[day] || 0;
                  const maxDaily = Math.max(...Object.values(dailyData), 1);
                  return (
                    <div key={day} style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '12px 8px',
                      background: 'var(--bg-secondary, #f8fafc)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        margin: '0 auto 8px',
                        borderRadius: '50%',
                        background: count > 0 
                          ? `rgba(102, 126, 234, ${0.2 + (count / maxDaily) * 0.8})`
                          : 'var(--bg-tertiary, #e2e8f0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: count > 0 ? '#667eea' : 'var(--text-secondary, #64748b)'
                      }}>
                        {count}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)' }}>
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'ai-report' && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--text-primary, #1a1a2e)' }}>
                  🤖 AI-Generated Weekly Report
                </h3>
                <button
                  onClick={loadWeeklyReport}
                  disabled={isLoadingReport}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontSize: '13px',
                    cursor: isLoadingReport ? 'not-allowed' : 'pointer',
                    opacity: isLoadingReport ? 0.7 : 1
                  }}
                >
                  {isLoadingReport ? 'Generating...' : '🔄 Regenerate'}
                </button>
              </div>

              {isLoadingReport ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-secondary, #64748b)'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(102, 126, 234, 0.2)',
                    borderTopColor: '#667eea',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  AI is analyzing your productivity data...
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-secondary, #f8fafc)',
                  borderRadius: '12px',
                  padding: '24px',
                  lineHeight: '1.7',
                  color: 'var(--text-primary, #1a1a2e)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {weeklyReport || 'Click "Regenerate" to create your personalized AI report.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

EnhancedAnalytics.propTypes = {
  blocks: PropTypes.array.isRequired,
  stats: PropTypes.array.isRequired,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
