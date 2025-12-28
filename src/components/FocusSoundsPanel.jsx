import React, { useState, useEffect, useRef } from 'react';

const FocusSoundsPanel = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const sounds = [
    { id: 'brown-noise', name: 'Brown Noise', icon: '🌊', desc: 'Deep, soothing' },
    { id: 'white-noise', name: 'White Noise', icon: '📻', desc: 'Classic static' },
    { id: 'pink-noise', name: 'Pink Noise', icon: '🌸', desc: 'Balanced' },
    { id: 'rain', name: 'Rain', icon: '🌧️', desc: 'Gentle rainfall' },
    { id: 'coffee-shop', name: 'Coffee Shop', icon: '☕', desc: 'Ambient chatter' },
    { id: 'ocean', name: 'Ocean Waves', icon: '🌊', desc: 'Rolling waves' },
    { id: 'forest', name: 'Forest', icon: '🌲', desc: 'Wind & nature' },
    { id: 'binaural', name: 'Focus Beats', icon: '🧠', desc: '40Hz gamma' },
  ];

  const generateNoise = (type, ctx) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown-noise') {
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      } else if (type === 'pink-noise') {
        data[i] = (lastOut + 0.05 * white) / 1.05;
        lastOut = data[i];
        data[i] *= 2;
      } else {
        data[i] = white * 0.5;
      }
    }
    return buffer;
  };

  const playSound = (soundId) => {
    // Stop current sound
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }

    if (currentSound === soundId && isPlaying) {
      setIsPlaying(false);
      setCurrentSound(null);
      return;
    }

    // Reuse existing audio context or create new one
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    // Resume context if suspended (required after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const gain = ctx.createGain();
    gain.gain.value = volume;
    gain.connect(ctx.destination);
    gainNodeRef.current = gain;

    let source;
    if (['brown-noise', 'white-noise', 'pink-noise', 'rain', 'coffee-shop', 'ocean', 'forest'].includes(soundId)) {
      const buffer = generateNoise(soundId, ctx);
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      if (soundId === 'rain' || soundId === 'ocean') {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = soundId === 'rain' ? 3000 : 800;
        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }
    } else if (soundId === 'binaural') {
      // Binaural beats
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.frequency.value = 200;
      oscR.frequency.value = 240;
      
      const panL = ctx.createStereoPanner();
      const panR = ctx.createStereoPanner();
      panL.pan.value = -1;
      panR.pan.value = 1;
      
      oscL.connect(panL);
      oscR.connect(panR);
      panL.connect(gain);
      panR.connect(gain);
      
      oscL.start();
      oscR.start();
      // Create a mock source object with stop method for binaural beats
      source = { stop: () => { oscL.stop(); oscR.stop(); }, isBinaural: true };
    }

    // Only call start() on buffer sources, not binaural beat mock objects
    if (source && source.start && !source.isBinaural) source.start();
    sourceNodeRef.current = source;
    setCurrentSound(soundId);
    setIsPlaying(true);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (gainNodeRef.current) gainNodeRef.current.gain.value = vol;
  };

  return (
    <div style={{ background: '#1a1a2e', borderRadius: '16px', padding: '20px', color: 'white', maxWidth: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>🎵 Focus Sounds</h3>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>×</button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {sounds.map(sound => (
          <button
            key={sound.id}
            onClick={() => playSound(sound.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px',
              background: currentSound === sound.id ? '#4F46E5' : '#252540',
              border: 'none', borderRadius: '12px', cursor: 'pointer', color: 'white',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '28px', marginBottom: '8px' }}>{sound.icon}</span>
            <span style={{ fontWeight: '500', marginBottom: '4px' }}>{sound.name}</span>
            <span style={{ fontSize: '12px', color: currentSound === sound.id ? '#c7d2fe' : '#888' }}>{sound.desc}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>🔈</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          style={{ flex: 1, accentColor: '#4F46E5' }}
        />
        <span>🔊</span>
      </div>

      {isPlaying && (
        <div style={{ marginTop: '16px', textAlign: 'center', padding: '12px', background: '#252540', borderRadius: '8px' }}>
          <span style={{ color: '#10B981' }}>▶️ Now Playing: {sounds.find(s => s.id === currentSound)?.name}</span>
        </div>
      )}
    </div>
  );
};

export default FocusSoundsPanel;
