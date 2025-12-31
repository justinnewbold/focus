import React, { useState, useEffect } from 'react';

export default function StreakBadge({ streak = 0, bestStreak = 0, onPress }) {
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    if (streak > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  const getStreakEmoji = () => {
    if (streak >= 30) return '🏆';
    if (streak >= 14) return '⭐';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '💪';
  };

  const getStreakMessage = () => {
    if (streak >= 30) return 'Legendary!';
    if (streak >= 14) return 'On fire!';
    if (streak >= 7) return 'Great week!';
    if (streak >= 3) return 'Building momentum';
    if (streak >= 1) return 'Keep it up!';
    return 'Start your streak';
  };

  const progressPercent = Math.min((streak / 7) * 100, 100);

  return (
    <button 
      className={`streak-badge ${isAnimating ? 'animating' : ''}`}
      onClick={onPress}
      type="button"
    >
      <div className="streak-icon">
        <span className="streak-emoji">{getStreakEmoji()}</span>
        <svg className="streak-ring" viewBox="0 0 36 36">
          <circle
            className="streak-ring-bg"
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3"
          />
          <circle
            className="streak-ring-progress"
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${progressPercent}, 100`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      
      <div className="streak-info">
        <div className="streak-count">
          <span className="streak-number">{streak}</span>
          <span className="streak-label">day streak</span>
        </div>
        <div className="streak-message">{getStreakMessage()}</div>
      </div>

      {bestStreak > streak && (
        <div className="streak-best">
          Best: {bestStreak}
        </div>
      )}

      <style>{`
        .streak-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--ios-card-bg, #fff);
          border: none;
          border-radius: 14px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .streak-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .streak-badge:active {
          transform: scale(0.98);
        }

        .streak-badge.animating .streak-emoji {
          animation: bounceEmoji 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }

        @keyframes bounceEmoji {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.2) rotate(-10deg); }
          50% { transform: scale(1.3) rotate(10deg); }
          75% { transform: scale(1.1) rotate(-5deg); }
        }

        .streak-icon {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .streak-emoji {
          font-size: 24px;
          z-index: 1;
        }

        .streak-ring {
          position: absolute;
          inset: 0;
          transform: rotate(-90deg);
        }

        .streak-ring-bg {
          stroke: var(--ios-gray-5, #E5E5EA);
        }

        .streak-ring-progress {
          stroke: var(--ios-orange, #FF9500);
          transition: stroke-dasharray 0.5s ease;
        }

        .streak-info {
          flex: 1;
        }

        .streak-count {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .streak-number {
          font-size: 24px;
          font-weight: 700;
          color: var(--ios-label, #000);
          line-height: 1;
        }

        .streak-label {
          font-size: 13px;
          color: var(--ios-label-secondary, rgba(60, 60, 67, 0.6));
        }

        .streak-message {
          font-size: 13px;
          color: var(--ios-orange, #FF9500);
          margin-top: 2px;
          font-weight: 500;
        }

        .streak-best {
          font-size: 11px;
          color: var(--ios-label-tertiary, rgba(60, 60, 67, 0.3));
          background: var(--ios-fill, rgba(120, 120, 128, 0.12));
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        @media (max-width: 600px) {
          .streak-badge {
            padding: 10px 14px;
          }

          .streak-icon {
            width: 40px;
            height: 40px;
          }

          .streak-emoji {
            font-size: 20px;
          }

          .streak-number {
            font-size: 20px;
          }
        }
      `}</style>
    </button>
  );
}
