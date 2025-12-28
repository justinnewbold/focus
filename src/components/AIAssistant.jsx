import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { generateProductivityInsights, getFallbackInsights } from '../services/aiService';

/**
 * AI Productivity Assistant Component
 * Provides personalized insights and suggestions powered by Gemini
 */
export default function AIAssistant({ blocks, stats, preferences }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const hasLoadedRef = useRef(false);
  const refreshIntervalRef = useRef(null);
  const loadInsightsRef = useRef(null);

  const loadInsights = useCallback(async () => {
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
  }, [blocks, stats, preferences]);

  // Keep ref updated with latest loadInsights function
  useEffect(() => {
    loadInsightsRef.current = loadInsights;
  }, [loadInsights]);

  // Load insights only once on mount and set up refresh interval
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadInsightsRef.current?.();

    // Refresh every 30 minutes using ref to get latest props
    refreshIntervalRef.current = setInterval(() => {
      loadInsightsRef.current?.();
    }, 30 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

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
      border: '1px solid rgba(102, 126, 234, 0.2)'
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
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>AI Assistant</h3>
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
          color: '#6b7280'
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
            background: 'rgba(255,255,255,0.5)',
            borderRadius: '12px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `conic-gradient(${getFocusScoreColor(insights.focusScore)} ${insights.focusScore * 3.6}deg, #e5e7eb 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'white',
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
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Focus Score</div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>
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
            color: '#374151'
          }}>
            {insights.greeting}
          </div>

          {/* Today's Insight */}
          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            borderLeft: '3px solid #667eea'
          }}>
            <div style={{ fontSize: '12px', color: '#667eea', marginBottom: '4px', fontWeight: '500' }}>
              TODAY'S INSIGHT
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              {insights.todayInsight}
            </div>
          </div>

          {/* Suggestion */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            borderLeft: '3px solid #f59e0b'
          }}>
            <div style={{ fontSize: '12px', color: '#d97706', marginBottom: '4px', fontWeight: '500' }}>
              💡 SUGGESTION
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              {insights.suggestion}
            </div>
          </div>

          {/* Encouragement */}
          <div style={{
            textAlign: 'center',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#059669'
          }}>
            {insights.encouragement}
          </div>

          {/* Last refresh time */}
          {lastRefresh && (
            <div style={{
              marginTop: '12px',
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'right'
            }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
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
