// Focus Sounds Service for FOCUS
// Ambient audio for concentration with lo-fi, nature, and noise generators

class FocusSoundsService {
  constructor() {
    this.audioContext = null;
    this.currentSound = null;
    this.gainNode = null;
    this.volume = 0.5;
    this.isPlaying = false;
    this.oscillators = [];
    this.bufferSources = [];
  }

  // Initialize audio context (must be called after user interaction)
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
    }
    
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  // Set volume (0-1)
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    }
  }

  // Stop all sounds
  stop() {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.bufferSources.forEach(source => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    this.oscillators = [];
    this.bufferSources = [];
    this.isPlaying = false;
    this.currentSound = null;
  }

  // Generate brown noise (deep, soothing)
  playBrownNoise() {
    this.init();
    this.stop();
    
    const bufferSize = 2 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Increase volume
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'brown-noise';
  }

  // Generate white noise
  playWhiteNoise() {
    this.init();
    this.stop();
    
    const bufferSize = 2 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'white-noise';
  }

  // Generate pink noise (balanced, natural)
  playPinkNoise() {
    this.init();
    this.stop();
    
    const bufferSize = 2 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'pink-noise';
  }

  // Simulate rain sounds
  playRain() {
    this.init();
    this.stop();
    
    // Base rain (pink noise filtered)
    const bufferSize = 4 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0;
      
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        
        // Add occasional "drops"
        const drop = Math.random() < 0.001 ? (Math.random() - 0.5) * 0.5 : 0;
        data[i] = (b0 + b1 + b2) * 0.05 + drop;
      }
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    // Low pass filter for rain effect
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    
    source.connect(filter);
    filter.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'rain';
  }

  // Coffee shop ambiance (layered noise)
  playCoffeeShop() {
    this.init();
    this.stop();
    
    // Background chatter (filtered noise)
    const bufferSize = 4 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        // Modulated noise for "voices"
        const mod = Math.sin(i * 0.0001) * 0.5 + 0.5;
        data[i] = (Math.random() * 2 - 1) * mod * 0.15;
      }
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    // Bandpass for voice frequencies
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.5;
    
    source.connect(filter);
    filter.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'coffee-shop';
  }

  // Ocean waves
  playOceanWaves() {
    this.init();
    this.stop();
    
    const bufferSize = 8 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      const waveLength = this.audioContext.sampleRate * 6; // 6 second waves
      
      for (let i = 0; i < bufferSize; i++) {
        const wave = Math.sin((i / waveLength) * Math.PI * 2);
        const envelope = (wave + 1) / 2; // 0-1
        const noise = Math.random() * 2 - 1;
        data[i] = noise * envelope * 0.3;
      }
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    
    source.connect(filter);
    filter.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'ocean-waves';
  }

  // Forest/birds ambient
  playForest() {
    this.init();
    this.stop();
    
    // Wind base
    const bufferSize = 4 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0;
      
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Gentle wind (very soft brown noise)
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 0.5;
      }
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    
    source.connect(filter);
    filter.connect(this.gainNode);
    source.start();
    
    this.bufferSources.push(source);
    this.isPlaying = true;
    this.currentSound = 'forest';
  }

  // Binaural beats for focus (40Hz gamma)
  playBinauralFocus() {
    this.init();
    this.stop();
    
    const baseFreq = 200;
    const beatFreq = 40; // Gamma waves for focus
    
    // Left ear
    const oscLeft = this.audioContext.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.value = baseFreq;
    
    // Right ear
    const oscRight = this.audioContext.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.value = baseFreq + beatFreq;
    
    // Stereo panner
    const pannerLeft = this.audioContext.createStereoPanner();
    pannerLeft.pan.value = -1;
    
    const pannerRight = this.audioContext.createStereoPanner();
    pannerRight.pan.value = 1;
    
    // Lower volume for binaural
    const binauralGain = this.audioContext.createGain();
    binauralGain.gain.value = 0.3;
    
    oscLeft.connect(pannerLeft);
    pannerLeft.connect(binauralGain);
    
    oscRight.connect(pannerRight);
    pannerRight.connect(binauralGain);
    
    binauralGain.connect(this.gainNode);
    
    oscLeft.start();
    oscRight.start();
    
    this.oscillators.push(oscLeft, oscRight);
    this.isPlaying = true;
    this.currentSound = 'binaural-focus';
  }

  // Get all available sounds
  getSounds() {
    return [
      { id: 'brown-noise', name: 'Brown Noise', icon: '🌊', description: 'Deep, soothing rumble' },
      { id: 'white-noise', name: 'White Noise', icon: '📻', description: 'Classic static sound' },
      { id: 'pink-noise', name: 'Pink Noise', icon: '🌸', description: 'Balanced, natural' },
      { id: 'rain', name: 'Rain', icon: '🌧️', description: 'Gentle rainfall' },
      { id: 'coffee-shop', name: 'Coffee Shop', icon: '☕', description: 'Ambient chatter' },
      { id: 'ocean-waves', name: 'Ocean Waves', icon: '🌊', description: 'Rolling waves' },
      { id: 'forest', name: 'Forest', icon: '🌲', description: 'Wind through trees' },
      { id: 'binaural-focus', name: 'Focus Beats', icon: '🧠', description: '40Hz gamma binaural' }
    ];
  }

  // Play sound by ID
  play(soundId) {
    const sounds = {
      'brown-noise': () => this.playBrownNoise(),
      'white-noise': () => this.playWhiteNoise(),
      'pink-noise': () => this.playPinkNoise(),
      'rain': () => this.playRain(),
      'coffee-shop': () => this.playCoffeeShop(),
      'ocean-waves': () => this.playOceanWaves(),
      'forest': () => this.playForest(),
      'binaural-focus': () => this.playBinauralFocus()
    };
    
    if (sounds[soundId]) {
      sounds[soundId]();
      return true;
    }
    return false;
  }

  // Toggle play/pause
  toggle(soundId) {
    if (this.isPlaying && this.currentSound === soundId) {
      this.stop();
    } else {
      this.play(soundId);
    }
  }

  // Fade out
  fadeOut(duration = 2) {
    if (!this.gainNode || !this.audioContext || !this.isPlaying) return;

    this.gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

    setTimeout(() => this.stop(), duration * 1000);
  }

  // Fade in
  fadeIn(soundId, duration = 2) {
    const originalVolume = this.volume;
    this.setVolume(0);
    this.play(soundId);

    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(originalVolume, this.audioContext.currentTime + duration);
    }
  }
}

// Singleton instance
export const focusSoundsService = new FocusSoundsService();

// React hook
import { useState, useCallback, useEffect } from 'react';

export function useFocusSounds() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [volume, setVolumeState] = useState(0.5);

  useEffect(() => {
    setIsPlaying(focusSoundsService.isPlaying);
    setCurrentSound(focusSoundsService.currentSound);
  }, []);

  const play = useCallback((soundId) => {
    focusSoundsService.play(soundId);
    setIsPlaying(true);
    setCurrentSound(soundId);
  }, []);

  const stop = useCallback(() => {
    focusSoundsService.stop();
    setIsPlaying(false);
    setCurrentSound(null);
  }, []);

  const toggle = useCallback((soundId) => {
    focusSoundsService.toggle(soundId);
    setIsPlaying(focusSoundsService.isPlaying);
    setCurrentSound(focusSoundsService.currentSound);
  }, []);

  const setVolume = useCallback((value) => {
    focusSoundsService.setVolume(value);
    setVolumeState(value);
  }, []);

  const fadeOut = useCallback((duration) => {
    focusSoundsService.fadeOut(duration);
    setTimeout(() => {
      setIsPlaying(false);
      setCurrentSound(null);
    }, duration * 1000);
  }, []);

  return {
    isPlaying,
    currentSound,
    volume,
    sounds: focusSoundsService.getSounds(),
    play,
    stop,
    toggle,
    setVolume,
    fadeOut
  };
}

export default focusSoundsService;
