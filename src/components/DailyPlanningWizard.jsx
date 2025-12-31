import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabase';
import { rollover } from '../utils/rollover';

/**
 * Daily Planning Wizard Component
 * Morning startup flow for planning the day
 */
const DailyPlanningWizard = memo(({ 
  userId, 
  blocks = [], 
  onAddBlock, 
  onClose,
  onComplete 
}) => {
  const [step, setStep] = useState(0);
  const [pendingRollovers, setPendingRollovers] = useState([]);
  const [selectedRollovers, setSelectedRollovers] = useState([]);
  const [priorities, setPriorities] = useState(['', '', '']);
  const [dailyIntention, setDailyIntention] = useState('');
  const [focusHours, setFocusHours] = useState(4);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const steps = [
    { id: 'welcome', title: 'Good Morning! ☀️', icon: '🌅' },
    { id: 'yesterday', title: 'Yesterday\'s Tasks', icon: '📋' },
    { id: 'priorities', title: 'Top 3 Priorities', icon: '🎯' },
    { id: 'intention', title: 'Daily Intention', icon: '💭' },
    { id: 'schedule', title: 'Plan Your Day', icon: '📅' },
    { id: 'ready', title: 'Ready to Focus!', icon: '🚀' }
  ];

  // Load pending rollovers
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const pending = await rollover.getPendingRollovers(userId);
        setPendingRollovers(pending);
        setSelectedRollovers(pending.map(p => p.id)); // Select all by default
      } catch (error) {
        console.error('Error loading rollovers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get day info
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleToggleRollover = (id) => {
    setSelectedRollovers(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleRolloverSelected = async () => {
    const tasksToRollover = pendingRollovers.filter(p => selectedRollovers.includes(p.id));
    
    for (const task of tasksToRollover) {
      await rollover.enableRollover(task.id, true);
    }
    
    const result = await rollover.rolloverToToday(userId);
    handleNext();
  };

  const handlePriorityChange = (index, value) => {
    const newPriorities = [...priorities];
    newPriorities[index] = value;
    setPriorities(newPriorities);
  };

  const handleComplete = async () => {
    // Save daily plan
    const planData = {
      date: today.toISOString().split('T')[0],
      priorities: priorities.filter(p => p.trim()),
      intention: dailyIntention,
      focus_hours_goal: focusHours
    };

    try {
      await supabase.from('daily_plans').upsert({
        user_id: userId,
        ...planData
      }, {
        onConflict: 'user_id,date'
      });
    } catch (error) {
      console.log('Note: daily_plans table may not exist yet');
    }

    // Mark wizard as completed for today
    localStorage.setItem('focus_wizard_completed', today.toISOString().split('T')[0]);

    if (onComplete) {
      onComplete(planData);
    }
    onClose();
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

  // Render current step
  const renderStep = () => {
    switch (steps[step].id) {
      case 'welcome':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🌅</div>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '28px', 
              margin: '0 0 8px',
              fontWeight: '600'
            }}>
              {getGreeting()}!
            </h2>
            <p style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '18px',
              margin: '0 0 32px'
            }}>
              It's {dayName}, {dateStr}
            </p>
            
            <div style={{
              background: 'rgba(78,205,196,0.1)',
              border: '1px solid rgba(78,205,196,0.2)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '16px',
                margin: 0,
                lineHeight: 1.6
              }}>
                Let's take a minute to plan your day for maximum productivity. 
                This will only take about 2 minutes.
              </p>
            </div>
          </div>
        );

      case 'yesterday':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>
                Unfinished Tasks
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                {pendingRollovers.length > 0 
                  ? 'Select tasks to move to today'
                  : 'Great job! No pending tasks from yesterday'}
              </p>
            </div>

            {pendingRollovers.length > 0 ? (
              <div style={{ 
                maxHeight: '300px', 
                overflow: 'auto',
                marginBottom: '16px'
              }}>
                {pendingRollovers.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleRollover(task.id)}
                    style={{
                      background: selectedRollovers.includes(task.id)
                        ? 'rgba(78,205,196,0.1)'
                        : 'rgba(255,255,255,0.03)',
                      border: selectedRollovers.includes(task.id)
                        ? '1px solid rgba(78,205,196,0.3)'
                        : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      border: selectedRollovers.includes(task.id)
                        ? '2px solid #4ECDC4'
                        : '2px solid rgba(255,255,255,0.3)',
                      background: selectedRollovers.includes(task.id)
                        ? '#4ECDC4'
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px'
                    }}>
                      {selectedRollovers.includes(task.id) && '✓'}
                    </div>
                    <div style={{
                      width: '4px',
                      height: '32px',
                      borderRadius: '2px',
                      background: getCategoryColor(task.category)
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: '500' }}>{task.title}</div>
                      <div style={{ 
                        color: 'rgba(255,255,255,0.5)', 
                        fontSize: '12px',
                        marginTop: '2px'
                      }}>
                        {task.category} • {task.duration || 25}min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'rgba(255,255,255,0.5)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                <p>All caught up!</p>
              </div>
            )}
          </div>
        );

      case 'priorities':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>
                What are your top 3 priorities today?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                Focus on what matters most
              </p>
            </div>

            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              {[0, 1, 2].map(index => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      color: '#333',
                      fontSize: '14px'
                    }}>
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={priorities[index]}
                      onChange={(e) => handlePriorityChange(index, e.target.value)}
                      placeholder={`Priority ${index + 1}`}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        color: '#fff',
                        fontSize: '16px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'intention':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💭</div>
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>
                Set Your Daily Intention
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                How do you want to show up today?
              </p>
            </div>

            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <textarea
                value={dailyIntention}
                onChange={(e) => setDailyIntention(e.target.value)}
                placeholder="Today I will focus on..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5
                }}
              />

              <div style={{ marginTop: '24px' }}>
                <label style={{ 
                  display: 'block',
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '12px',
                  fontSize: '14px'
                }}>
                  Focus time goal for today
                </label>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {[2, 4, 6, 8].map(hours => (
                    <button
                      key={hours}
                      onClick={() => setFocusHours(hours)}
                      style={{
                        flex: 1,
                        minWidth: '70px',
                        padding: '12px',
                        borderRadius: '12px',
                        border: focusHours === hours
                          ? '2px solid #4ECDC4'
                          : '1px solid rgba(255,255,255,0.1)',
                        background: focusHours === hours
                          ? 'rgba(78,205,196,0.2)'
                          : 'rgba(255,255,255,0.05)',
                        color: focusHours === hours ? '#4ECDC4' : '#fff',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>
                Quick Schedule Review
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                You have {blocks.length} blocks scheduled today
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '400px',
              margin: '0 auto'
            }}>
              {/* Quick stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#4ECDC4', fontSize: '24px', fontWeight: '700' }}>
                    {blocks.filter(b => b.category === 'work').length}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Work</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#FF6B6B', fontSize: '24px', fontWeight: '700' }}>
                    {blocks.filter(b => b.category === 'meeting').length}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Meetings</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#45B7D1', fontSize: '24px', fontWeight: '700' }}>
                    {blocks.filter(b => b.category === 'break').length}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Breaks</div>
                </div>
              </div>

              {/* Suggestion */}
              {priorities.filter(p => p.trim()).length > 0 && (
                <div style={{
                  background: 'rgba(78,205,196,0.1)',
                  border: '1px solid rgba(78,205,196,0.2)',
                  borderRadius: '12px',
                  padding: '14px'
                }}>
                  <div style={{ 
                    color: '#4ECDC4', 
                    fontSize: '13px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    💡 Tip
                  </div>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '14px',
                    lineHeight: 1.5
                  }}>
                    Block time for "{priorities[0]}" during your peak hours (usually 9-11 AM).
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'ready':
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚀</div>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '28px', 
              margin: '0 0 16px',
              fontWeight: '600'
            }}>
              You're All Set!
            </h2>
            
            {priorities.filter(p => p.trim()).length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '20px',
                maxWidth: '350px',
                margin: '0 auto 24px',
                textAlign: 'left'
              }}>
                <div style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '12px',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Today's Priorities
                </div>
                {priorities.filter(p => p.trim()).map((p, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#333'
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ color: '#fff' }}>{p}</span>
                  </div>
                ))}
              </div>
            )}

            {dailyIntention && (
              <div style={{
                background: 'rgba(78,205,196,0.1)',
                border: '1px solid rgba(78,205,196,0.2)',
                borderRadius: '12px',
                padding: '16px',
                maxWidth: '350px',
                margin: '0 auto',
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.8)'
              }}>
                "{dailyIntention}"
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(20px)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Progress Bar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Step {step + 1} of {steps.length}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Skip for now
          </button>
        </div>
        <div style={{
          display: 'flex',
          gap: '6px'
        }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i <= step 
                  ? 'linear-gradient(90deg, #4ECDC4, #45B7D1)' 
                  : 'rgba(255,255,255,0.1)',
                transition: 'background 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {renderStep()}
      </div>

      {/* Navigation */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '12px',
        justifyContent: 'center'
      }}>
        {step > 0 && (
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 28px',
              color: '#fff',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
        )}
        
        {step < steps.length - 1 ? (
          <button
            onClick={step === 1 && pendingRollovers.length > 0 ? handleRolloverSelected : handleNext}
            style={{
              background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 32px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {step === 1 && selectedRollovers.length > 0 
              ? `Roll Over ${selectedRollovers.length} Tasks →`
              : 'Continue →'
            }
          </button>
        ) : (
          <button
            onClick={handleComplete}
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 40px',
              color: '#333',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            🚀 Start My Day
          </button>
        )}
      </div>
    </div>
  );
});

DailyPlanningWizard.displayName = 'DailyPlanningWizard';

DailyPlanningWizard.propTypes = {
  userId: PropTypes.string.isRequired,
  blocks: PropTypes.array,
  onAddBlock: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func
};

export default DailyPlanningWizard;
