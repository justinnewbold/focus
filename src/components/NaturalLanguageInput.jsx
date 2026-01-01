import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { parseNaturalLanguage, quickParse, getSuggestions } from '../utils/naturalLanguageParser';

/**
 * Natural Language Task Input
 * Smart input field that parses natural language into time blocks
 */
const NaturalLanguageInput = memo(({ 
  onTaskCreated, 
  onClose,
  existingBlocks = [],
  defaultDate = null 
}) => {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced preview update
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!input.trim()) {
      setPreview(null);
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Quick parse for preview (no AI)
      const result = quickParse(input);
      if (result.success) {
        setPreview(result.data);
        setError(null);
      }
      
      // Get suggestions
      setSuggestions(getSuggestions(input));
    }, 150);

    return () => clearTimeout(debounceRef.current);
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Full parse with AI
      const result = await parseNaturalLanguage(input, true);
      
      if (result.success) {
        onTaskCreated(result.data);
        setInput('');
        setPreview(null);
      } else {
        setError(result.error || 'Could not parse input');
      }
    } catch (err) {
      setError('Failed to process input');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  const applySuggestion = (suggestion) => {
    setInput(prev => {
      const words = prev.split(' ');
      words[words.length - 1] = suggestion;
      return words.join(' ') + ' ';
    });
    inputRef.current?.focus();
  };

  const getCategoryColor = (category) => {
    const colors = {
      work: '#FF6B6B',
      meeting: '#4ECDC4',
      break: '#45B7D1',
      personal: '#96CEB4',
      learning: '#DDA0DD',
      exercise: '#FFD93D'
    };
    return colors[category] || '#888';
  };

  const formatTime = (hour, minute = 0) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = minute > 0 ? `:${String(minute).padStart(2, '0')}` : '';
    return `${h}${m} ${ampm}`;
  };

  return (
    <div style={{
      background: 'rgba(30,30,40,0.98)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden',
      maxWidth: '600px',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>✨</span>
          <span style={{ color: '#fff', fontWeight: '600' }}>Quick Add</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: showHelp ? 'rgba(78,205,196,0.2)' : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              color: showHelp ? '#4ECDC4' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            ?
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(78,205,196,0.05)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.6 }}>
            <strong style={{ color: '#4ECDC4' }}>Examples:</strong>
            <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                "Deep work on project at 9am for 2 hours"
              </code>
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                "Team meeting tomorrow at 2pm for 30 minutes"
              </code>
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                "Gym workout this evening for 1 hour"
              </code>
              <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                "Quick coffee break in 30 minutes"
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '20px' }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type naturally... e.g., 'Code review at 2pm for 1 hour'"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(78,205,196,0.3)',
              borderRadius: '12px',
              padding: '16px 50px 16px 16px',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: input.trim() 
                ? 'linear-gradient(135deg, #4ECDC4, #45B7D1)' 
                : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            {loading ? '⏳' : '→'}
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px'
          }}>
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => applySuggestion(suggestion)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            background: 'rgba(255,107,107,0.1)',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: '10px',
            color: '#FF6B6B',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* Preview */}
        {preview && !error && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '4px',
                height: '40px',
                borderRadius: '2px',
                background: getCategoryColor(preview.category)
              }} />
              <div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '16px' }}>
                  {preview.title}
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  fontSize: '13px',
                  textTransform: 'capitalize'
                }}>
                  {preview.category}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>
                  DATE
                </div>
                <div style={{ color: '#fff', fontSize: '14px' }}>
                  {preview.date === new Date().toISOString().split('T')[0] ? 'Today' : preview.date}
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>
                  TIME
                </div>
                <div style={{ color: '#fff', fontSize: '14px' }}>
                  {formatTime(preview.hour, preview.minute)}
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '4px' }}>
                  DURATION
                </div>
                <div style={{ color: '#fff', fontSize: '14px' }}>
                  {preview.duration >= 60 
                    ? `${Math.floor(preview.duration / 60)}h ${preview.duration % 60 ? `${preview.duration % 60}m` : ''}`
                    : `${preview.duration}m`
                  }
                </div>
              </div>
            </div>

            {preview.confidence < 0.7 && (
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(255,215,0,0.1)',
                borderRadius: '8px',
                color: '#FFD700',
                fontSize: '12px'
              }}>
                ⚠️ Low confidence - review before saving
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
          Press Enter to add • Esc to close
        </span>
        <span style={{ 
          color: 'rgba(78,205,196,0.6)', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>🤖</span>
          <span>AI-powered parsing</span>
        </span>
      </div>
    </div>
  );
});

NaturalLanguageInput.displayName = 'NaturalLanguageInput';

NaturalLanguageInput.propTypes = {
  onTaskCreated: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  existingBlocks: PropTypes.array,
  defaultDate: PropTypes.string
};

export default NaturalLanguageInput;
