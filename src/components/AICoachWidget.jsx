import React, { useState, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { aiCoach } from '../utils/aiCoach';

/**
 * AI Coach Widget
 * Compact display for daily tips and encouragement
 */
const AICoachWidget = memo(({ userId, onClick, showRefresh = true }) => {
  const [tip, setTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTip();
  }, [userId]);

  const loadTip = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const dailyTip = await aiCoach.getCachedDailyTip(userId);
      setTip(dailyTip);
    } catch (error) {
      console.error('Error loading tip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      const newTip = await aiCoach.generateDailyTip(userId);
      setTip(newTip);
    } catch (error) {
      console.error('Error refreshing tip:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(78,205,196,0.08), rgba(69,183,209,0.08))',
        border: '1px solid rgba(78,205,196,0.15)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'rgba(78,205,196,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          animation: 'pulse 1.5s infinite'
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '13px'
          }}>
            Loading insights...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, rgba(78,205,196,0.1), rgba(69,183,209,0.1))',
        border: '1px solid rgba(78,205,196,0.2)',
        borderRadius: '16px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0
        }}>
          {tip?.icon || '🤖'}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}>
            <span style={{ 
              color: '#4ECDC4', 
              fontSize: '12px', 
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              AI Coach
            </span>
            {showRefresh && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={refreshing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  fontSize: '14px',
                  opacity: refreshing ? 0.5 : 1,
                  transform: refreshing ? 'rotate(360deg)' : 'none',
                  transition: 'transform 0.5s ease'
                }}
                title="Get new tip"
              >
                🔄
              </button>
            )}
          </div>
          
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '14px',
            lineHeight: 1.5,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical'
          }}>
            {tip?.tip || "Complete focus sessions to get personalized tips!"}
          </p>
          
          {onClick && (
            <div style={{
              marginTop: '10px',
              color: 'rgba(78,205,196,0.8)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              View full insights →
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AICoachWidget.displayName = 'AICoachWidget';

AICoachWidget.propTypes = {
  userId: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  showRefresh: PropTypes.bool
};

export default AICoachWidget;
