import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import AchievementBadge from './AchievementBadge';
import { achievements as achievementsUtil, ACHIEVEMENTS, TIER_COLORS } from '../utils/achievements';

/**
 * Achievements Panel Component
 * Displays all achievements grouped by category
 */
const AchievementsPanel = memo(({ userId, onClose }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'streaks', name: 'Streaks', icon: '🔥' },
    { id: 'focus_time', name: 'Focus Time', icon: '⏱️' },
    { id: 'tasks', name: 'Tasks', icon: '✅' },
    { id: 'estimates', name: 'Estimates', icon: '📊' },
    { id: 'timing', name: 'Timing', icon: '🌅' },
    { id: 'rollover', name: 'Rollover', icon: '🔄' }
  ];

  useEffect(() => {
    const loadAchievements = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        await achievementsUtil.initializeUserAchievements(userId);
        const data = await achievementsUtil.getUserAchievements(userId);
        setAchievements(data);
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [userId]);

  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const handleAchievementClick = useCallback((achievement) => {
    setSelectedAchievement(achievement);
  }, []);

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading achievements...</div>
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
        background: 'rgba(30,30,40,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div>
          <h2 style={{ 
            margin: 0, 
            color: '#fff', 
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🏆 Achievements
          </h2>
          <p style={{ 
            margin: '4px 0 0', 
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px'
          }}>
            {unlockedCount} of {totalCount} unlocked
          </p>
        </div>
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
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          height: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #FFD700, #FFA500)',
            height: '100%',
            width: `${(unlockedCount / totalCount) * 100}%`,
            borderRadius: '10px',
            transition: 'width 0.5s ease'
          }} />
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '0 20px 16px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              background: selectedCategory === cat.id 
                ? 'rgba(255,215,0,0.2)' 
                : 'rgba(255,255,255,0.05)',
              border: selectedCategory === cat.id 
                ? '1px solid rgba(255,215,0,0.5)' 
                : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '8px 16px',
              color: selectedCategory === cat.id ? '#FFD700' : 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
        gap: '20px',
        padding: '20px',
        paddingBottom: '100px'
      }}>
        {filteredAchievements.map(achievement => (
          <AchievementBadge
            key={achievement.id}
            achievement={achievement}
            size="medium"
            showProgress
            onClick={() => handleAchievementClick(achievement)}
            animated={achievement.unlocked}
          />
        ))}
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <div
          onClick={() => setSelectedAchievement(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(40,40,50,0.98)',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <AchievementBadge
              achievement={selectedAchievement}
              size="large"
              showProgress
              animated={selectedAchievement.unlocked}
            />
            
            <h3 style={{ 
              color: '#fff', 
              margin: '20px 0 8px',
              fontSize: '20px'
            }}>
              {selectedAchievement.name}
            </h3>
            
            <p style={{ 
              color: 'rgba(255,255,255,0.6)', 
              margin: '0 0 16px',
              fontSize: '14px',
              lineHeight: 1.5
            }}>
              {selectedAchievement.description}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '16px'
            }}>
              <span style={{
                background: TIER_COLORS[selectedAchievement.tier]?.bg || '#CD7F32',
                color: TIER_COLORS[selectedAchievement.tier]?.text || '#fff',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {selectedAchievement.tier}
              </span>
            </div>

            {!selectedAchievement.unlocked && (
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                  marginBottom: '8px'
                }}>
                  Progress
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: TIER_COLORS[selectedAchievement.tier]?.bg || '#CD7F32',
                    height: '100%',
                    width: `${Math.min(100, (selectedAchievement.progress / selectedAchievement.requirement) * 100)}%`,
                    borderRadius: '6px'
                  }} />
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#fff',
                  marginTop: '8px'
                }}>
                  {selectedAchievement.progress} / {selectedAchievement.requirement}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedAchievement(null)}
              style={{
                marginTop: '24px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 32px',
                color: '#fff',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

AchievementsPanel.displayName = 'AchievementsPanel';

AchievementsPanel.propTypes = {
  userId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

export default AchievementsPanel;
