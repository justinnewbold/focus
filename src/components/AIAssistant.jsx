import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { generateProductivityInsights, getSchedulingSuggestions } from '../services/aiService';

/**
 * AI Productivity Assistant Component
 * Provides personalized insights and suggestions powered by Gemini
 */
export default function AIAssistant({ blocks, stats, preferences, onSuggestionApply }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await generateProductivityInsights(blocks, stats, preferences);
      setInsights(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blocks, stats, preferences]);

  useEffect(() => {
    loadInsights();
    // Refresh insights every 30 minutes
    const interval = setInterval(loadInsights, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadInsights]);

  const handleRefresh = () => {
    loadInsights();
  };

  const getFocusScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Open AI Assistant"
      >
        🤖
      </button>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary, #1a1a2e)' }}>
              AI Assistant
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748b)' }}>
              Powered by Gemini
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              opacity: isLoading ? 0.5 : 1,
              transition: 'transform 0.3s ease'
            }}
            title="Refresh insights"
          >
            🔄
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: 'var(--text-secondary, #64748b)'
            }}
            title="Minimize"
          >
            ✕
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px',
          color: 'var(--text-secondary, #64748b)'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid rgba(102, 126, 234, 0.2)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '12px'
          }} />
          Analyzing your productivity...
        </div>
      ) : insights ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Greeting */}
          <p style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '500',
            color: 'var(--text-primary, #1a1a2e)'
          }}>
            {insights.greeting}
          </p>

          {/* Focus Score */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--bg-secondary, #f8fafc)',
            borderRadius: '12px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: `conic-gradient(${getFocusScoreColor(insights.focusScore)} ${insights.focusScore * 3.6}deg, #e2e8f0 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--bg-secondary, #f8fafc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: getFocusScoreColor(insights.focusScore)
              }}>
                {insights.focusScore}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748b)', marginBottom: '2px' }}>
                Focus Score
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary, #1a1a2e)' }}>
                {insights.focusScore >= 80 ? 'Excellent!' : insights.focusScore >= 60 ? 'Good progress' : 'Room to grow'}
              </div>
            </div>
          </div>

          {/* Today's Insight */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '12px',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600', marginBottom: '4px' }}>
              📊 TODAY'S INSIGHT
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary, #1a1a2e)', lineHeight: '1.5' }}>
              {insights.todayInsight}
            </p>
          </div>

          {/* Suggestion */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>
              💡 SUGGESTION
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary, #1a1a2e)', lineHeight: '1.5' }}>
              {insights.suggestion}
            </p>
          </div>

          {/* Encouragement */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: '500',
              color: '#667eea'
            }}>
              {insights.encouragement}
            </p>
          </div>

          {/* Streak */}
          {insights.streakMessage && (
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #64748b)',
              textAlign: 'center'
            }}>
              🔥 {insights.streakMessage}
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary, #64748b)', textAlign: 'center' }}>
          Unable to load insights. Please try again.
        </p>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

AIAssistant.propTypes = {
  blocks: PropTypes.array.isRequired,
  stats: PropTypes.array.isRequired,
  preferences: PropTypes.object,
  onSuggestionApply: PropTypes.func
};

AIAssistant.defaultProps = {
  preferences: {},
  onSuggestionApply: () => {}
};
