import React, { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { smartScheduler } from '../utils/smartScheduler';

/**
 * Smart Schedule Panel
 * Auto-schedule tasks and generate optimal daily templates
 */
const SmartSchedulePanel = memo(({ 
  userId, 
  existingBlocks = [],
  pendingTasks = [],
  date = null,
  onScheduleAccept,
  onClose 
}) => {
  const [view, setView] = useState('auto'); // 'auto' | 'template' | 'optimize'
  const [scheduledTasks, setScheduledTasks] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);

  const targetDate = date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (pendingTasks.length > 0) {
      setSelectedTasks(pendingTasks.map((_, i) => i));
    }
  }, [pendingTasks]);

  const handleAutoSchedule = async () => {
    if (selectedTasks.length === 0) return;

    setLoading(true);
    try {
      const tasksToSchedule = selectedTasks.map(i => pendingTasks[i]);
      const result = await smartScheduler.autoScheduleDay(userId, tasksToSchedule, targetDate);
      
      if (result.success) {
        setScheduledTasks(result.scheduledTasks);
      }
    } catch (error) {
      console.error('Auto-schedule failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTemplate = async () => {
    setLoading(true);
    try {
      const result = await smartScheduler.generateDayTemplate(userId, targetDate);
      setTemplate(result);
    } catch (error) {
      console.error('Template generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSchedule = () => {
    if (onScheduleAccept) {
      onScheduleAccept(scheduledTasks);
    }
  };

  const handleAcceptTemplate = () => {
    if (onScheduleAccept && template) {
      onScheduleAccept(template.template);
    }
  };

  const toggleTask = (index) => {
    setSelectedTasks(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

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

  const formatTime = (hour, minute = 0) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = minute > 0 ? `:${String(minute).padStart(2, '0')}` : '';
    return `${h}${m} ${ampm}`;
  };

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
            fontSize: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>📅</span>
            Smart Scheduler
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

        {/* View Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px'
        }}>
          {[
            { id: 'auto', label: 'Auto Schedule', icon: '🤖' },
            { id: 'template', label: 'Day Template', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                background: view === tab.id 
                  ? 'linear-gradient(135deg, #4ECDC4, #45B7D1)' 
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '10px',
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
      <div style={{ padding: '20px', paddingBottom: '120px' }}>
        {view === 'auto' ? (
          <AutoScheduleView
            pendingTasks={pendingTasks}
            selectedTasks={selectedTasks}
            scheduledTasks={scheduledTasks}
            loading={loading}
            onToggleTask={toggleTask}
            onSchedule={handleAutoSchedule}
            onAccept={handleAcceptSchedule}
            getCategoryColor={getCategoryColor}
            formatTime={formatTime}
          />
        ) : (
          <TemplateView
            template={template}
            loading={loading}
            onGenerate={handleGenerateTemplate}
            onAccept={handleAcceptTemplate}
            getCategoryColor={getCategoryColor}
            formatTime={formatTime}
          />
        )}
      </div>
    </div>
  );
});

/**
 * Auto Schedule View
 */
const AutoScheduleView = ({ 
  pendingTasks, 
  selectedTasks, 
  scheduledTasks,
  loading,
  onToggleTask,
  onSchedule,
  onAccept,
  getCategoryColor,
  formatTime
}) => (
  <div>
    {/* Task Selection */}
    {pendingTasks.length > 0 && scheduledTasks.length === 0 && (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', margin: '0 0 16px', fontSize: '16px' }}>
          📝 Select Tasks to Schedule
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingTasks.map((task, i) => (
            <label
              key={i}
              style={{
                background: selectedTasks.includes(i) 
                  ? 'rgba(78,205,196,0.1)' 
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedTasks.includes(i) 
                  ? 'rgba(78,205,196,0.3)' 
                  : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={selectedTasks.includes(i)}
                onChange={() => onToggleTask(i)}
                style={{ 
                  width: '18px', 
                  height: '18px',
                  accentColor: '#4ECDC4'
                }}
              />
              <div style={{
                width: '4px',
                height: '30px',
                borderRadius: '2px',
                background: getCategoryColor(task.category)
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: '500' }}>{task.title}</div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.4)', 
                  fontSize: '12px',
                  textTransform: 'capitalize'
                }}>
                  {task.category} • {task.duration || 25}min
                </div>
              </div>
            </label>
          ))}
        </div>
        
        <button
          onClick={onSchedule}
          disabled={loading || selectedTasks.length === 0}
          style={{
            width: '100%',
            marginTop: '16px',
            background: selectedTasks.length > 0 
              ? 'linear-gradient(135deg, #4ECDC4, #45B7D1)' 
              : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            color: '#fff',
            fontWeight: '600',
            fontSize: '15px',
            cursor: selectedTasks.length > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? '⏳ Finding optimal times...' : `🤖 Auto-Schedule ${selectedTasks.length} Task${selectedTasks.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    )}

    {/* No pending tasks */}
    {pendingTasks.length === 0 && scheduledTasks.length === 0 && (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
        <div style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
          No tasks to schedule
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Add some tasks first, then use auto-schedule to find the best times
        </div>
      </div>
    )}

    {/* Scheduled Results */}
    {scheduledTasks.length > 0 && (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
            ✅ Optimized Schedule
          </h3>
          <span style={{ 
            color: 'rgba(78,205,196,0.8)', 
            fontSize: '13px' 
          }}>
            AI-powered
          </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scheduledTasks
            .sort((a, b) => (a.hour * 60 + (a.start_minute || 0)) - (b.hour * 60 + (b.start_minute || 0)))
            .map((task, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{
                  width: '60px',
                  textAlign: 'center',
                  flexShrink: 0
                }}>
                  <div style={{ 
                    color: '#4ECDC4', 
                    fontWeight: '700',
                    fontSize: '16px'
                  }}>
                    {formatTime(task.hour, task.start_minute)}
                  </div>
                </div>
                
                <div style={{
                  width: '4px',
                  height: '40px',
                  borderRadius: '2px',
                  background: getCategoryColor(task.category)
                }} />
                
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: '500' }}>
                    {task.title}
                  </div>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '13px',
                    marginTop: '4px'
                  }}>
                    {task.reason}
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '12px'
                }}>
                  {task.duration}min
                </div>
              </div>
            ))}
        </div>

        <button
          onClick={onAccept}
          style={{
            width: '100%',
            marginTop: '24px',
            background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
            border: 'none',
            borderRadius: '12px',
            padding: '16px',
            color: '#fff',
            fontWeight: '600',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ✓ Apply Schedule
        </button>
      </div>
    )}
  </div>
);

/**
 * Template View
 */
const TemplateView = ({ 
  template, 
  loading,
  onGenerate,
  onAccept,
  getCategoryColor,
  formatTime
}) => (
  <div>
    {!template && (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
        <div style={{ color: '#fff', fontSize: '18px', marginBottom: '8px' }}>
          Generate a Day Template
        </div>
        <div style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '14px',
          marginBottom: '24px',
          maxWidth: '400px',
          margin: '0 auto 24px'
        }}>
          Creates an optimized daily schedule based on your productivity patterns and best practices
        </div>
        
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 32px',
            color: '#fff',
            fontWeight: '600',
            fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '⏳ Generating...' : '✨ Generate Template'}
        </button>
      </div>
    )}

    {template && (
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
            📋 Suggested Day Template
          </h3>
          {template.basedOnPatterns && (
            <span style={{ 
              color: 'rgba(78,205,196,0.8)', 
              fontSize: '13px' 
            }}>
              Based on your patterns
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {template.template.map((block, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div style={{
                width: '55px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  color: '#fff', 
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {formatTime(block.hour, block.start_minute)}
                </div>
              </div>
              
              <div style={{
                width: '4px',
                height: '35px',
                borderRadius: '2px',
                background: getCategoryColor(block.category)
              }} />
              
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>
                  {block.title}
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.4)', 
                  fontSize: '12px',
                  marginTop: '2px'
                }}>
                  {block.reason}
                </div>
              </div>
              
              <div style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px'
              }}>
                {block.duration}min
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '24px'
        }}>
          <button
            onClick={onGenerate}
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '14px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Regenerate
          </button>
          <button
            onClick={onAccept}
            style={{
              flex: 2,
              background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              color: '#fff',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer'
            }}
          >
            ✓ Apply Template
          </button>
        </div>
      </div>
    )}
  </div>
);

SmartSchedulePanel.displayName = 'SmartSchedulePanel';

SmartSchedulePanel.propTypes = {
  userId: PropTypes.string.isRequired,
  existingBlocks: PropTypes.array,
  pendingTasks: PropTypes.array,
  date: PropTypes.string,
  onScheduleAccept: PropTypes.func,
  onClose: PropTypes.func.isRequired
};

export default SmartSchedulePanel;
