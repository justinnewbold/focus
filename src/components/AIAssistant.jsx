import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { generateProductivityInsights, getFallbackInsights } from '../services/aiService';

/**
 * AI Productivity Assistant Component
 * Provides personalized insights and suggestions powered by Gemini
 * Uses CSS theme variables for consistent theming
 */
export default function AIAssistant({ blocks, stats, preferences }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const hasLoadedRef = useRef(false);
  const refreshIntervalRef = useRef(null);

  // Load insights only once on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    loadInsights();
    
    // Refresh every 30 minutes
    refreshIntervalRef.current = setInterval(() => {
      loadInsights();
    }, 30 * 60 * 1000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const data = await generateProductivityInsights(blocks, stats, preferences);
      setInsights(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('Using fallback insights');
      setInsights(getFallbackInsights(blocks, stats));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadInsights();
  };

  const getFocusScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--error)';
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
          background: 'var(--accent-gradient)',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 15px var(--surface-hover)',
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
      background: 'var(--surface)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid var(--border-color)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>AI Assistant</h3>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              background: 'none',
              border: 'none',
              cursor: isLoading ? 'wait' : 'pointer',
              fontSize: '16px',
              opacity: isLoading ? 0.5 : 1,
              transition: 'transform 0.2s'
            }}
            title="Refresh insights"
          >
            🔄
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title="Minimize"
          >
            ➖
          </button>
        </div>
      </div>

      {isLoading && !insights ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
          <p>Analyzing your productivity...</p>
        </div>
      ) : insights ? (
        <>
          {/* Focus Score */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--surface-hover)',
            borderRadius: '12px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `conic-gradient(${getFocusScoreColor(insights.focusScore)} ${insights.focusScore * 3.6}deg, var(--border-color) 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px',
                color: getFocusScoreColor(insights.focusScore)
              }}>
                {insights.focusScore}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text-primary)' }}>Focus Score</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {insights.focusScore >= 80 ? 'Excellent!' : 
                 insights.focusScore >= 60 ? 'Good progress' : 'Room to grow'}
              </div>
            </div>
          </div>

          {/* Greeting */}
          <div style={{
            fontSize: '18px',
            fontWeight: '500',
            marginBottom: '12px',
            color: 'var(--text-primary)'
          }}>
            {insights.greeting}
          </div>

          {/* Today's Insight */}
          <div style={{
            background: 'var(--surface-hover)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            borderLeft: '3px solid var(--accent-color)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--accent-color)', marginBottom: '4px', fontWeight: '500' }}>
              TODAY'S INSIGHT
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {insights.todayInsight}
            </div>
          </div>

          {/* Suggestion */}
          <div style={{
            background: 'var(--surface-hover)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            borderLeft: '3px solid var(--warning)'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: '4px', fontWeight: '500' }}>
              💡 SUGGESTION
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {insights.suggestion}
            </div>
          </div>

          {/* Encouragement */}
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'var(--surface-hover)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--success)'
          }}>
            {insights.encouragement}
          </div>

          {/* Last refresh time */}
          {lastRefresh && (
            <div style={{
              marginTop: '12px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textAlign: 'right'
            }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
          <p>Unable to load insights. Click refresh to try again.</p>
        </div>
      )}
    </div>
  );
}

AIAssistant.propTypes = {
  blocks: PropTypes.array.isRequired,
  stats: PropTypes.object,
  preferences: PropTypes.object
};

AIAssistant.defaultProps = {
  stats: {},
  preferences: {}
};
