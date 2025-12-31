/**
 * Focus Sounds Library
 * Ambient sounds for productivity and focus
 */

// Sound definitions with free CDN sources
export const SOUNDS = {
  rain: {
    id: 'rain',
    name: 'Rain',
    icon: '🌧️',
    category: 'nature',
    // Using freesound.org creative commons sounds via CDN
    url: 'https://cdn.freesound.org/previews/531/531947_6079990-lq.mp3',
    description: 'Gentle rain on window'
  },
  thunder: {
    id: 'thunder',
    name: 'Thunderstorm',
    icon: '⛈️',
    category: 'nature',
    url: 'https://cdn.freesound.org/previews/401/401275_7671552-lq.mp3',
    description: 'Distant thunder with rain'
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    icon: '🌲',
    category: 'nature',
    url: 'https://cdn.freesound.org/previews/588/588304_7037-lq.mp3',
    description: 'Birds and rustling leaves'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: '🌊',
    category: 'nature',
    url: 'https://cdn.freesound.org/previews/527/527604_2593623-lq.mp3',
    description: 'Calming ocean waves'
  },
  fire: {
    id: 'fire',
    name: 'Fireplace',
    icon: '🔥',
    category: 'nature',
    url: 'https://cdn.freesound.org/previews/499/499558_7865523-lq.mp3',
    description: 'Crackling fireplace'
  },
  wind: {
    id: 'wind',
    name: 'Wind',
    icon: '💨',
    category: 'nature',
    url: 'https://cdn.freesound.org/previews/244/244372_4186459-lq.mp3',
    description: 'Gentle breeze'
  },
  coffee: {
    id: 'coffee',
    name: 'Coffee Shop',
    icon: '☕',
    category: 'ambient',
    url: 'https://cdn.freesound.org/previews/394/394185_7399170-lq.mp3',
    description: 'Busy café ambience'
  },
  keyboard: {
    id: 'keyboard',
    name: 'Typing',
    icon: '⌨️',
    category: 'ambient',
    url: 'https://cdn.freesound.org/previews/556/556823_10534065-lq.mp3',
    description: 'Mechanical keyboard sounds'
  },
  whiteNoise: {
    id: 'whiteNoise',
    name: 'White Noise',
    icon: '📻',
    category: 'noise',
    url: 'https://cdn.freesound.org/previews/136/136594_2437358-lq.mp3',
    description: 'Pure white noise'
  },
  brownNoise: {
    id: 'brownNoise',
    name: 'Brown Noise',
    icon: '🟤',
    category: 'noise',
    url: 'https://cdn.freesound.org/previews/560/560792_8031614-lq.mp3',
    description: 'Deep, rumbling brown noise'
  },
  pinkNoise: {
    id: 'pinkNoise',
    name: 'Pink Noise',
    icon: '🩷',
    category: 'noise',
    url: 'https://cdn.freesound.org/previews/133/133099_2398403-lq.mp3',
    description: 'Balanced pink noise'
  },
  library: {
    id: 'library',
    name: 'Library',
    icon: '📚',
    category: 'ambient',
    url: 'https://cdn.freesound.org/previews/382/382444_1979593-lq.mp3',
    description: 'Quiet library ambience'
  }
};

export const SOUND_CATEGORIES = [
  { id: 'all', name: 'All', icon: '🎵' },
  { id: 'nature', name: 'Nature', icon: '🌿' },
  { id: 'ambient', name: 'Ambient', icon: '🏙️' },
  { id: 'noise', name: 'Noise', icon: '📻' }
];

// Preset mixes
export const SOUND_PRESETS = [
  {
    id: 'rainy_day',
    name: 'Rainy Day',
    icon: '🌧️☕',
    sounds: [
      { id: 'rain', volume: 0.6 },
      { id: 'coffee', volume: 0.3 }
    ]
  },
  {
    id: 'cozy_cabin',
    name: 'Cozy Cabin',
    icon: '🏔️🔥',
    sounds: [
      { id: 'fire', volume: 0.5 },
      { id: 'wind', volume: 0.2 }
    ]
  },
  {
    id: 'deep_focus',
    name: 'Deep Focus',
    icon: '🧠✨',
    sounds: [
      { id: 'brownNoise', volume: 0.4 },
      { id: 'rain', volume: 0.2 }
    ]
  },
  {
    id: 'nature_escape',
    name: 'Nature Escape',
    icon: '🌲🌊',
    sounds: [
      { id: 'forest', volume: 0.5 },
      { id: 'ocean', volume: 0.3 }
    ]
  }
];

/**
 * Sound Manager Class
 * Handles audio playback, mixing, and persistence
 */
class SoundManager {
  constructor() {
    this.audioElements = {};
    this.activeVolumes = {};
    this.masterVolume = 0.5;
    this.isPlaying = false;
    this.autoPlayOnTimer = this.loadAutoPlaySetting();
    this.loadSavedMix();
  }

  /**
   * Initialize an audio element for a sound
   */
  initSound(soundId) {
    if (this.audioElements[soundId]) return this.audioElements[soundId];

    const sound = SOUNDS[soundId];
    if (!sound) return null;

    const audio = new Audio(sound.url);
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;
    
    this.audioElements[soundId] = audio;
    return audio;
  }

  /**
   * Set volume for a specific sound (0-1)
   */
  setVolume(soundId, volume) {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.activeVolumes[soundId] = normalizedVolume;

    const audio = this.audioElements[soundId] || this.initSound(soundId);
    if (audio) {
      audio.volume = normalizedVolume * this.masterVolume;
      
      if (normalizedVolume > 0 && this.isPlaying) {
        audio.play().catch(e => console.log('Audio play prevented:', e));
      } else if (normalizedVolume === 0) {
        audio.pause();
      }
    }

    this.saveMix();
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update all active sounds
    Object.keys(this.activeVolumes).forEach(soundId => {
      const audio = this.audioElements[soundId];
      if (audio) {
        audio.volume = this.activeVolumes[soundId] * this.masterVolume;
      }
    });

    localStorage.setItem('focus_master_volume', this.masterVolume.toString());
  }

  /**
   * Play all active sounds
   */
  play() {
    this.isPlaying = true;
    
    Object.entries(this.activeVolumes).forEach(([soundId, volume]) => {
      if (volume > 0) {
        const audio = this.audioElements[soundId] || this.initSound(soundId);
        if (audio) {
          audio.volume = volume * this.masterVolume;
          audio.play().catch(e => console.log('Audio play prevented:', e));
        }
      }
    });
  }

  /**
   * Pause all sounds
   */
  pause() {
    this.isPlaying = false;
    
    Object.values(this.audioElements).forEach(audio => {
      audio.pause();
    });
  }

  /**
   * Toggle play/pause
   */
  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  /**
   * Stop and reset all sounds
   */
  stop() {
    this.pause();
    Object.values(this.audioElements).forEach(audio => {
      audio.currentTime = 0;
    });
  }

  /**
   * Apply a preset mix
   */
  applyPreset(presetId) {
    const preset = SOUND_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Clear current mix
    this.clearMix();

    // Apply preset sounds
    preset.sounds.forEach(({ id, volume }) => {
      this.setVolume(id, volume);
    });

    if (this.isPlaying) {
      this.play();
    }
  }

  /**
   * Clear all sounds
   */
  clearMix() {
    Object.keys(this.activeVolumes).forEach(soundId => {
      this.setVolume(soundId, 0);
    });
    this.activeVolumes = {};
    this.saveMix();
  }

  /**
   * Get current mix state
   */
  getMix() {
    return { ...this.activeVolumes };
  }

  /**
   * Check if any sound is active
   */
  hasActiveSounds() {
    return Object.values(this.activeVolumes).some(v => v > 0);
  }

  /**
   * Save current mix to localStorage
   */
  saveMix() {
    const mix = {
      volumes: this.activeVolumes,
      masterVolume: this.masterVolume
    };
    localStorage.setItem('focus_sound_mix', JSON.stringify(mix));
  }

  /**
   * Load saved mix from localStorage
   */
  loadSavedMix() {
    try {
      const saved = localStorage.getItem('focus_sound_mix');
      if (saved) {
        const mix = JSON.parse(saved);
        this.activeVolumes = mix.volumes || {};
        this.masterVolume = mix.masterVolume ?? 0.5;
        
        // Pre-initialize saved sounds
        Object.keys(this.activeVolumes).forEach(soundId => {
          this.initSound(soundId);
        });
      }

      const savedMaster = localStorage.getItem('focus_master_volume');
      if (savedMaster) {
        this.masterVolume = parseFloat(savedMaster);
      }
    } catch (e) {
      console.error('Error loading sound mix:', e);
    }
  }

  /**
   * Auto-play settings
   */
  setAutoPlayOnTimer(enabled) {
    this.autoPlayOnTimer = enabled;
    localStorage.setItem('focus_sound_autoplay', enabled ? 'true' : 'false');
  }

  loadAutoPlaySetting() {
    return localStorage.getItem('focus_sound_autoplay') === 'true';
  }

  /**
   * Called when timer starts
   */
  onTimerStart() {
    if (this.autoPlayOnTimer && this.hasActiveSounds()) {
      this.play();
    }
  }

  /**
   * Called when timer ends/pauses
   */
  onTimerEnd() {
    if (this.autoPlayOnTimer) {
      this.pause();
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();

export default soundManager;
