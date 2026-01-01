import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { aiCoach } from '../utils/aiCoach';
import { smartScheduler } from '../utils/smartScheduler';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * AI Planning Assistant
 * Provides AI-powered suggestions for daily planning
 */
const AIPlanningAssistant = memo(({ 
  userId, 
  priorities = [], 
  existingBlocks = [],
  date = null,
  onSuggestionsAccept,
  compact = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [prioritySuggestions, setPrioritySuggestions] = useState([]);
  const [timeOptimizations, setTimeOptimizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('priorities');

  const targetDate = date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadSuggestions();
  }, [userId, priorities]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const [aiSuggestions, timeSuggestions] = await Promise.all([
        generatePrioritySuggestions(),
        generateTimeOptimizations()
      ]);

      setPrioritySuggestions(aiSuggestions);
      setTimeOptimizations(timeSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePrioritySuggestions = async () => {
    // Get user's patterns
    const stats = await aiCoach.getUserStats(userId, 14);
    
    if (!GEMINI_API_KEY) {
      return getDefaultPrioritySuggestions(stats);
    }

    const prompt = `You are a productivity coach helping plan today's priorities.

${stats ? `User's recent patterns:
- Completion rate: ${stats.completionRate}%
- Peak hours: ${stats.peakHours?.map(h => `${h}:00`).join(', ')}
- Most common categories: ${Object.entries(stats.categories || {}).slice(0, 3).map(([c, n]) => c).join(', ')}
- Current streak: ${stats.currentStreak} days` : 'New user - no history yet'}

${priorities.length > 0 ? `User's stated priorities: ${priorities.join(', ')}` : 'No priorities set yet'}

Suggest 3 specific, actionable priorities for today. Return ONLY a JSON array:
[{"title": "priority title", "category": "work|meeting|learning|personal|exercise", "suggestedDuration": 30, "reason": "why this is important"}]

Make suggestions specific and achievable. Consider their patterns.`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
        })
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      const jsonMatch = text?.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.log('AI suggestions failed:', error);
    }

    return getDefaultPrioritySuggestions(stats);
  };

  const getDefaultPrioritySuggestions = (stats) => {
    const suggestions = [
      { 
        title: 'Deep Work Session', 
        category: 'work', 
        suggestedDuration: 90,
        reason: 'Tackle your most important task with focused time'
      },
      { 
        title: 'Review & Planning', 
        category: 'personal', 
        suggestedDuration: 30,
        reason: 'Clear your mind and organize upcoming work'
      },
      { 
        title: 'Learning Block', 
        category: 'learning', 
        suggestedDuration: 45,
        reason: 'Invest in skill development'
      }
    ];

    // Customize based on patterns
    if (stats?.categories?.meeting > stats?.categories?.work) {
      suggestions[0] = {
        title: 'Prepare for Meetings',
        category: 'work',
        suggestedDuration: 30,
        reason: 'You have many meetings - prepare agendas and notes'
      };
    }

    if (stats?.completionRate < 50) {
      suggestions.push({
        title: 'Quick Win Task',
        category: 'work',
        suggestedDuration: 15,
        reason: 'Start with something small to build momentum'
      });
    }

    return suggestions;
  };

  const generateTimeOptimizations = async () => {
    const stats = await aiCoach.getUserStats(userId, 30);
    const optimizations = [];

    // Peak hour suggestion
    if (stats?.peakHours?.[0]) {
      optimizations.push({
        type: 'peak_hour',
        title: 'Protect Your Peak Hour',
        description: `${stats.peakHours[0]}:00 is your most productive time. Schedule your most important work here.`,
        action: { hour: stats.peakHours[0], category: 'work' }
      });
    }

    // Break suggestion
    if (existingBlocks.filter(b => b.category === 'work').length >= 2) {
      optimizations.push({
        type: 'break',
        title: 'Add Recovery Time',
        description: 'You have multiple work blocks. Adding short breaks improves focus.',
        action: { category: 'break', duration: 15 }
      });
    }

    // Meeting clustering
    const meetingBlocks = existingBlocks.filter(b => b.category === 'meeting');
    if (meetingBlocks.length >= 2) {
      const hours = meetingBlocks.map(b => b.hour);
      const spread = Math.max(...hours) - Math.min(...hours);
      if (spread > 4) {
        optimizations.push({
          type: 'clustering',
          title: 'Cluster Your Meetings',
          description: 'Your meetings are spread out. Grouping them preserves focus time.',
          action: null
        });
      }
    }

    // End of day planning
    optimizations.push({
      type: 'planning',
      title: 'End-of-Day Review',
      description: 'Schedule 15 min at 5pm to review today and plan tomorrow.',
      action: { hour: 17, category: 'personal', duration: 15, title: 'Daily Review' }
    });

    return optimizations;
  };

  const handleAcceptSuggestion = (suggestion) => {
    if (onSuggestionsAccept) {
      onSuggestionsAccept({
        title: suggestion.title,
        category: suggestion.category,
        duration: suggestion.suggestedDuration || 30
      });
    }
  };

  const handleAcceptOptimization = async (optimization) => {
    if (!optimization.action || !onSuggestionsAccept) return;

    const { action } = optimization;
    
    // Find best time slot if not specified
    if (!action.hour) {
      const result = await smartScheduler.autoScheduleTask(userId, {
        title: action.title || optimization.title,
        category: action.category,
        duration: action.duration || 25
      }, targetDate);

      if (result.success) {
        onSuggestionsAccept({
          ...result.suggestion,
          fromOptimization: true
        });
      }
    } else {
      onSuggestionsAccept({
        title: action.title || optimization.title,
        category: action.category,
        hour: action.hour,
        duration: action.duration || 25,
        fromOptimization: true
      });
    }
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

  const getCategoryIcon = (category) => {
    const icons = {
      work: '💼', meeting: '👥', break: '☕',
      personal: '🏠', learning: '📚', exercise: '🏃'
    };
    return icons[category] || '📋';
  };

  if (compact) {
    return (
      <CompactView
        loading={loading}
        prioritySuggestions={prioritySuggestions}
        onAccept={handleAcceptSuggestion}
        getCategoryColor={getCategoryColor}
        getCategoryIcon={getCategoryIcon}
      />
    );
  }

  return (
    <div style={{
      background: 'rgba(30,30,40,0.95)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(135deg, rgba(78,205,196,0.1), rgba(69,183,209,0.1))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            ✨
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
              AI Planning Assistant
            </h3>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Smart suggestions based on your patterns
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {[
          { id: 'priorities', label: 'Priorities', icon: '🎯' },
          { id: 'optimize', label: 'Optimize', icon: '⚡' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              flex: 1,
              padding: '12px',
              background: activeSection === tab.id 
                ? 'rgba(78,205,196,0.1)' 
                : 'transparent',
              border: 'none',
              borderBottom: activeSection === tab.id 
                ? '2px solid #4ECDC4' 
                : '2px solid transparent',
              color: activeSection === tab.id ? '#4ECDC4' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <LoadingState />
        ) : activeSection === 'priorities' ? (
          <PrioritiesSection
            suggestions={prioritySuggestions}
            onAccept={handleAcceptSuggestion}
            getCategoryColor={getCategoryColor}
            getCategoryIcon={getCategoryIcon}
          />
        ) : (
          <OptimizationsSection
            optimizations={timeOptimizations}
            onAccept={handleAcceptOptimization}
          />
        )}
      </div>
    </div>
  );
});

/**
 * Loading State
 */
const LoadingState = () => (
  <div style={{
    textAlign: 'center',
    padding: '40px 20px'
  }}>
    <div style={{
      width: '50px',
      height: '50px',
      margin: '0 auto 16px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      animation: 'pulse 1.5s infinite'
    }}>
      ✨
    </div>
    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
      Analyzing your patterns...
    </div>
  </div>
);

/**
 * Priorities Section
 */
const PrioritiesSection = ({ suggestions, onAccept, getCategoryColor, getCategoryIcon }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <p style={{ 
      color: 'rgba(255,255,255,0.5)', 
      fontSize: '13px', 
      margin: '0 0 8px'
    }}>
      Suggested priorities based on your productivity patterns:
    </p>
    
    {suggestions.map((suggestion, i) => (
      <div
        key={i}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px'
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: `${getCategoryColor(suggestion.category)}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          flexShrink: 0
        }}>
          {getCategoryIcon(suggestion.category)}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            color: '#fff', 
            fontWeight: '600',
            fontSize: '15px',
            marginBottom: '4px'
          }}>
            {suggestion.title}
          </div>
          <div style={{ 
            color: 'rgba(255,255,255,0.5)',
            fontSize: '13px',
            marginBottom: '8px'
          }}>
            {suggestion.reason}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              background: `${getCategoryColor(suggestion.category)}30`,
              color: getCategoryColor(suggestion.category),
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              textTransform: 'capitalize'
            }}>
              {suggestion.category}
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px'
            }}>
              ~{suggestion.suggestedDuration}min
            </span>
          </div>
        </div>

        <button
          onClick={() => onAccept(suggestion)}
          style={{
            background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 16px',
            color: '#fff',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Add
        </button>
      </div>
    ))}
  </div>
);

/**
 * Optimizations Section
 */
const OptimizationsSection = ({ optimizations, onAccept }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <p style={{ 
      color: 'rgba(255,255,255,0.5)', 
      fontSize: '13px', 
      margin: '0 0 8px'
    }}>
      Ways to optimize your schedule:
    </p>
    
    {optimizations.map((opt, i) => (
      <div
        key={i}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '16px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ 
              color: '#fff', 
              fontWeight: '600',
              fontSize: '15px',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {opt.type === 'peak_hour' && '⚡'}
              {opt.type === 'break' && '☕'}
              {opt.type === 'clustering' && '📊'}
              {opt.type === 'planning' && '📝'}
              {opt.title}
            </div>
            <div style={{ 
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              lineHeight: 1.5
            }}>
              {opt.description}
            </div>
          </div>
          
          {opt.action && (
            <button
              onClick={() => onAccept(opt)}
              style={{
                background: 'rgba(78,205,196,0.15)',
                border: '1px solid rgba(78,205,196,0.3)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: '#4ECDC4',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Apply
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
);

/**
 * Compact View for embedding
 */
const CompactView = ({ loading, prioritySuggestions, onAccept, getCategoryColor, getCategoryIcon }) => (
  <div style={{
    background: 'linear-gradient(135deg, rgba(78,205,196,0.08), rgba(69,183,209,0.08))',
    border: '1px solid rgba(78,205,196,0.15)',
    borderRadius: '14px',
    padding: '14px'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px'
    }}>
      <span style={{ fontSize: '18px' }}>✨</span>
      <span style={{ color: '#4ECDC4', fontSize: '13px', fontWeight: '600' }}>
        AI Suggestions
      </span>
    </div>
    
    {loading ? (
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
        Loading...
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {prioritySuggestions.slice(0, 2).map((s, i) => (
          <div
            key={i}
            onClick={() => onAccept(s)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '16px' }}>{getCategoryIcon(s.category)}</span>
            <span style={{ 
              color: 'rgba(255,255,255,0.8)', 
              fontSize: '13px',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {s.title}
            </span>
            <span style={{ color: '#4ECDC4', fontSize: '12px' }}>+</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

AIPlanningAssistant.displayName = 'AIPlanningAssistant';

AIPlanningAssistant.propTypes = {
  userId: PropTypes.string.isRequired,
  priorities: PropTypes.array,
  existingBlocks: PropTypes.array,
  date: PropTypes.string,
  onSuggestionsAccept: PropTypes.func,
  compact: PropTypes.bool
};

export default AIPlanningAssistant;
