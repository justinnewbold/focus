import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { TIER_COLORS } from '../utils/achievements';

/**
 * Achievement Badge Component
 * Displays a single achievement with progress
 */
const AchievementBadge = memo(({ 
  achievement, 
  size = 'medium',
  showProgress = true,
  onClick,
  animated = false 
}) => {
  const { 
    name, 
    description, 
    icon, 
    tier, 
    progress = 0, 
    requirement, 
    unlocked,
    unlockedAt 
  } = achievement;

  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze;
  const progressPercent = Math.min(100, Math.round((progress / requirement) * 100));

  const sizes = {
    small: { badge: 48, icon: 20, ring: 2 },
    medium: { badge: 72, icon: 28, ring: 3 },
    large: { badge: 96, icon: 36, ring: 4 }
  };

  const s = sizes[size] || sizes.medium;
  const circumference = 2 * Math.PI * ((s.badge / 2) - s.ring);
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: unlocked ? 1 : 0.6,
        transition: 'all 0.3s ease',
        transform: animated && unlocked ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      {/* Badge Circle */}
      <div style={{ position: 'relative', width: s.badge, height: s.badge }}>
        {/* Progress Ring */}
        <svg
          width={s.badge}
          height={s.badge}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'rotate(-90deg)'
          }}
        >
          {/* Background ring */}
          <circle
            cx={s.badge / 2}
            cy={s.badge / 2}
            r={(s.badge / 2) - s.ring}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={s.ring}
          />
          {/* Progress ring */}
          {showProgress && (
            <circle
              cx={s.badge / 2}
              cy={s.badge / 2}
              r={(s.badge / 2) - s.ring}
              fill="none"
              stroke={unlocked ? tierColor.bg : 'rgba(255,255,255,0.3)'}
              strokeWidth={s.ring}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease',
                filter: unlocked ? 'drop-shadow(0 0 4px rgba(255,215,0,0.5))' : 'none'
              }}
            />
          )}
        </svg>

        {/* Badge Background */}
        <div
          style={{
            position: 'absolute',
            top: s.ring,
            left: s.ring,
            width: s.badge - (s.ring * 2),
            height: s.badge - (s.ring * 2),
            borderRadius: '50%',
            background: unlocked 
              ? (tierColor.gradient || tierColor.bg)
              : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: unlocked 
              ? `0 4px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)`
              : 'inset 0 2px 4px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          <span style={{ 
            fontSize: s.icon, 
            filter: unlocked ? 'none' : 'grayscale(100%)',
            transition: 'filter 0.3s ease'
          }}>
            {icon}
          </span>
        </div>

        {/* Lock Icon for locked achievements */}
        {!unlocked && (
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px'
            }}
          >
            🔒
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        fontSize: size === 'small' ? '11px' : '13px',
        fontWeight: '600',
        color: unlocked ? '#fff' : 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        maxWidth: s.badge + 20,
        lineHeight: 1.2
      }}>
        {name}
      </div>

      {/* Progress Text */}
      {showProgress && !unlocked && (
        <div style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center'
        }}>
          {progress}/{requirement}
        </div>
      )}

      {/* Unlocked Date */}
      {unlocked && unlockedAt && size !== 'small' && (
        <div style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.4)',
          textAlign: 'center'
        }}>
          {new Date(unlockedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
});

AchievementBadge.displayName = 'AchievementBadge';

AchievementBadge.propTypes = {
  achievement: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    icon: PropTypes.string.isRequired,
    tier: PropTypes.oneOf(['bronze', 'silver', 'gold', 'platinum']).isRequired,
    progress: PropTypes.number,
    requirement: PropTypes.number.isRequired,
    unlocked: PropTypes.bool,
    unlockedAt: PropTypes.string
  }).isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showProgress: PropTypes.bool,
  onClick: PropTypes.func,
  animated: PropTypes.bool
};

export default AchievementBadge;
