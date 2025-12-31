import React, { useState, useEffect, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  SOUNDS, 
  SOUND_CATEGORIES, 
  SOUND_PRESETS, 
  soundManager 
} from '../utils/focusSounds';

/**
 * Focus Sounds Panel Component
 * Audio mixer for ambient sounds during focus sessions
 */
const FocusSoundsPanel = memo(({ isTimerRunning, onClose, compact = false }) => {
  const [activeVolumes, setActiveVolumes] = useState({});
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [autoPlay, setAutoPlay] = useState(false);

  // Load initial state
  useEffect(() => {
    setActiveVolumes(soundManager.getMix());
    setMasterVolume(soundManager.masterVolume);
    setIsPlaying(soundManager.isPlaying);
    setAutoPlay(soundManager.autoPlayOnTimer);
  }, []);

  // Sync with timer
  useEffect(() => {
    if (autoPlay && soundManager.hasActiveSounds()) {
      if (isTimerRunning && !isPlaying) {
        soundManager.play();
        setIsPlaying(true);
      } else if (!isTimerRunning && isPlaying) {
        soundManager.pause();
        setIsPlaying(false);
      }
    }
  }, [isTimerRunning, autoPlay, isPlaying]);

  const handleVolumeChange = useCallback((soundId, volume) => {
    const newVolume = parseFloat(volume);
    soundManager.setVolume(soundId, newVolume);
    setActiveVolumes(prev => ({ ...prev, [soundId]: newVolume }));
    
    if (newVolume > 0 && !isPlaying) {
      soundManager.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleMasterVolumeChange = useCallback((volume) => {
    const newVolume = parseFloat(volume);
    setMasterVolume(newVolume);
    soundManager.setMasterVolume(newVolume);
  }, []);

  const handleTogglePlay = useCallback(() => {
    const playing = soundManager.toggle();
    setIsPlaying(playing);
  }, []);

  const handleApplyPreset = useCallback((presetId) => {
    soundManager.applyPreset(presetId);
    setActiveVolumes(soundManager.getMix());
    if (!isPlaying) {
      soundManager.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleClearAll = useCallback(() => {
    soundManager.clearMix();
    setActiveVolumes({});
  }, []);

  const handleAutoPlayToggle = useCallback(() => {
    const newValue = !autoPlay;
    setAutoPlay(newValue);
    soundManager.setAutoPlayOnTimer(newValue);
  }, [autoPlay]);

  const filteredSounds = selectedCategory === 'all'
    ? Object.values(SOUNDS)
    : Object.values(SOUNDS).filter(s => s.category === selectedCategory);

  const activeSoundsCount = Object.values(activeVolumes).filter(v => v > 0).length;

  // Compact mode for sidebar/mini player
  if (compact) {
    return (
      <div style={{
        background: 'rgba(30,30,40,0.95)',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <span style={{ color: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎵 Sounds {activeSoundsCount > 0 && `(${activeSoundsCount})`}
          </span>
          <button
            onClick={handleTogglePlay}
            disabled={!soundManager.hasActiveSounds()}
            style={{
              background: isPlaying ? 'rgba(255,107,107,0.2)' : 'rgba(78,205,196,0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: isPlaying ? '#FF6B6B' : '#4ECDC4',
              cursor: soundManager.hasActiveSounds() ? 'pointer' : 'not-allowed',
              opacity: soundManager.hasActiveSounds() ? 1 : 0.5
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
        </div>
        
        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SOUND_PRESETS.slice(0, 3).map(preset => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.id)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {preset.icon}
            </button>
          ))}
        </div>
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
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🎵 Focus Sounds
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

        {/* Master Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginTop: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleTogglePlay}
            disabled={!soundManager.hasActiveSounds()}
            style={{
              background: isPlaying 
                ? 'linear-gradient(135deg, #FF6B6B, #FF8E8E)' 
                : 'linear-gradient(135deg, #4ECDC4, #45B7D1)',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              color: '#fff',
              fontWeight: '600',
              cursor: soundManager.hasActiveSounds() ? 'pointer' : 'not-allowed',
              opacity: soundManager.hasActiveSounds() ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            flex: 1,
            minWidth: '200px'
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => handleMasterVolumeChange(e.target.value)}
              style={{
                flex: 1,
                accentColor: '#4ECDC4',
                height: '6px'
              }}
            />
            <span style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '13px',
              minWidth: '40px'
            }}>
              {Math.round(masterVolume * 100)}%
            </span>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={handleAutoPlayToggle}
              style={{ accentColor: '#4ECDC4' }}
            />
            Auto-play with timer
          </label>
        </div>
      </div>

      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        {/* Presets */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: '#fff', 
            margin: '0 0 12px',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ✨ Quick Presets
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            {SOUND_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{preset.icon}</div>
                <div style={{ color: '#fff', fontWeight: '500', fontSize: '14px' }}>{preset.name}</div>
              </button>
            ))}
            <button
              onClick={handleClearAll}
              style={{
                background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔇</div>
              <div style={{ color: '#FF6B6B', fontWeight: '500', fontSize: '14px' }}>Clear All</div>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {SOUND_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                background: selectedCategory === cat.id 
                  ? 'rgba(78,205,196,0.2)' 
                  : 'rgba(255,255,255,0.05)',
                border: selectedCategory === cat.id 
                  ? '1px solid rgba(78,205,196,0.5)' 
                  : '1px solid transparent',
                borderRadius: '20px',
                padding: '8px 16px',
                color: selectedCategory === cat.id ? '#4ECDC4' : 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Sound Mixer */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {filteredSounds.map(sound => (
            <SoundSlider
              key={sound.id}
              sound={sound}
              volume={activeVolumes[sound.id] || 0}
              onVolumeChange={handleVolumeChange}
              isPlaying={isPlaying && (activeVolumes[sound.id] || 0) > 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * Individual Sound Slider Component
 */
const SoundSlider = memo(({ sound, volume, onVolumeChange, isPlaying }) => {
  const isActive = volume > 0;

  return (
    <div style={{
      background: isActive 
        ? 'rgba(78,205,196,0.1)' 
        : 'rgba(255,255,255,0.03)',
      border: isActive 
        ? '1px solid rgba(78,205,196,0.3)' 
        : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.2s ease'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '28px',
          width: '44px',
          height: '44px',
          background: isActive ? 'rgba(78,205,196,0.2)' : 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {sound.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            color: isActive ? '#4ECDC4' : '#fff', 
            fontWeight: '600',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {sound.name}
            {isPlaying && (
              <span style={{ 
                fontSize: '10px',
                color: '#4ECDC4',
                animation: 'pulse 1s infinite'
              }}>
                ●
              </span>
            )}
          </div>
          <div style={{ 
            color: 'rgba(255,255,255,0.5)', 
            fontSize: '12px',
            marginTop: '2px'
          }}>
            {sound.description}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(sound.id, e.target.value)}
          style={{
            flex: 1,
            accentColor: '#4ECDC4',
            height: '6px',
            cursor: 'pointer'
          }}
        />
        <span style={{ 
          color: isActive ? '#4ECDC4' : 'rgba(255,255,255,0.4)', 
          fontSize: '13px',
          minWidth: '36px',
          textAlign: 'right'
        }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
});

FocusSoundsPanel.displayName = 'FocusSoundsPanel';
SoundSlider.displayName = 'SoundSlider';

FocusSoundsPanel.propTypes = {
  isTimerRunning: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  compact: PropTypes.bool
};

export default FocusSoundsPanel;
