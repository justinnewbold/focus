import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { getTemplates, blockFromTemplate } from '../utils/templates';
import { getTags } from '../utils/tags';
import { CATEGORY_COLORS } from '../constants';
import BottomSheet from './BottomSheet';
import { useDevice, triggerHaptic } from '../hooks/useDevice';

/**
 * Quick Add - iOS Native Implementation
 * Mobile: Bottom sheet with swipe gestures
 * Desktop: Command palette (maintains keyboard shortcuts)
 */
const QuickAdd = memo(({ isOpen, onClose, onAdd, selectedDate }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCategories, setShowCategories] = useState(false);

  const inputRef = useRef(null);
  const templates = useMemo(() => getTemplates(), []);
  const { isMobile, isTouch, isIOS } = useDevice();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setSelectedIndex(0);
      setShowCategories(false);
      // Delay focus to allow animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Parse input for suggestions
  useEffect(() => {
    if (!input) {
      setSuggestions([]);
      return;
    }

    const parsed = parseInput(input);
    const newSuggestions = [];

    // Time parsing suggestions - prioritize this
    if (parsed.time) {
      newSuggestions.unshift({
        type: 'create',
        label: parsed.title || 'New block',
        sublabel: `at ${parsed.time}${parsed.duration ? ` • ${parsed.duration}min` : ''}`,
        data: parsed,
        icon: '⏰'
      });
    }

    // Template matches
    templates.forEach(template => {
      if (template.name.toLowerCase().includes(input.toLowerCase())) {
        newSuggestions.push({
          type: 'template',
          label: template.name,
          sublabel: `${template.category} • ${template.duration_minutes}min`,
          data: template,
          icon: '📋'
        });
      }
    });

    // Category shortcuts (when # is typed)
    if (input.includes('#')) {
      Object.entries(CATEGORY_COLORS).forEach(([cat, colors]) => {
        const searchTerm = input.split('#')[1]?.toLowerCase() || '';
        if (cat.startsWith(searchTerm)) {
          newSuggestions.push({
            type: 'category',
            label: `#${cat}`,
            sublabel: 'Add category tag',
            data: { category: cat },
            icon: '🏷️',
            color: colors.bg
          });
        }
      });
    }

    setSuggestions(newSuggestions.slice(0, 6));
    setSelectedIndex(0);
  }, [input, templates]);

  // Handle keyboard navigation (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else if (input.trim()) {
          handleCreateFromInput();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, input, onClose, isMobile]);

  const parseInput = (text) => {
    const result = { title: text };

    // Parse time: "3pm", "15:00", "at 3"
    const timeMatch = text.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;

      result.time = `${hour}:${minutes.toString().padStart(2, '0')}`;
      result.hour = hour;
      result.start_minute = minutes;
      result.title = text.replace(timeMatch[0], '').trim();
    }

    // Parse duration: "30min", "1hr", "1.5h"
    const durationMatch = text.match(/(\d+(?:\.\d+)?)\s*(min|mins|minutes|hr|hrs|hours|h|m)/i);
    if (durationMatch) {
      const value = parseFloat(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      result.duration = unit.startsWith('h') ? value * 60 : value;
      result.title = result.title.replace(durationMatch[0], '').trim();
    }

    // Parse category: "#work", "#meeting"
    const categoryMatch = text.match(/#(\w+)/);
    if (categoryMatch) {
      const cat = categoryMatch[1].toLowerCase();
      if (CATEGORY_COLORS[cat]) {
        result.category = cat;
        result.title = result.title.replace(categoryMatch[0], '').trim();
      }
    }

    return result;
  };

  const handleSelect = (suggestion) => {
    triggerHaptic('light');
    
    switch (suggestion.type) {
      case 'template': {
        const block = blockFromTemplate(
          suggestion.data,
          selectedDate,
          suggestion.data.hour || 9
        );
        onAdd(block);
        break;
      }
      case 'category': {
        // Insert category into input
        const newInput = input.replace(/#\w*$/, `#${suggestion.data.category} `);
        setInput(newInput);
        return; // Don't close
      }
      case 'create': {
        const data = suggestion.data;
        onAdd({
          title: data.title || 'New block',
          category: data.category || 'work',
          date: selectedDate,
          hour: data.hour || 9,
          start_minute: data.start_minute || 0,
          duration_minutes: data.duration || 60
        });
        break;
      }
    }
    onClose();
  };

  const handleCreateFromInput = () => {
    triggerHaptic('success');
    const parsed = parseInput(input);
    onAdd({
      title: parsed.title || input,
      category: parsed.category || 'work',
      date: selectedDate,
      hour: parsed.hour || 9,
      start_minute: parsed.start_minute || 0,
      duration_minutes: parsed.duration || 60
    });
    onClose();
  };

  const handleQuickCategory = (category) => {
    triggerHaptic('light');
    const parsed = parseInput(input);
    onAdd({
      title: parsed.title || 'New block',
      category: category,
      date: selectedDate,
      hour: parsed.hour || 9,
      start_minute: parsed.start_minute || 0,
      duration_minutes: parsed.duration || 60
    });
    onClose();
  };

  if (!isOpen) return null;

  // Mobile: iOS Bottom Sheet
  if (isMobile || isTouch) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        snapPoints={['70%']}
        showHandle={true}
      >
        {/* Input Area */}
        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          >
            <span style={{ fontSize: '20px' }}>⚡</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Meeting at 3pm #work 30min"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '17px',
                outline: 'none',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  handleCreateFromInput();
                }
              }}
            />
          </div>
          
          {/* Helper text */}
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.4)',
            margin: '8px 0 0 4px'
          }}>
            Try: "Review docs at 2pm #work 45min"
          </p>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ padding: '0 8px' }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelect(suggestion)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onTouchStart={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onTouchEnd={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span
                  style={{
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: suggestion.color ? `${suggestion.color}30` : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {suggestion.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: '#fff', 
                    fontSize: '16px', 
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {suggestion.label}
                  </div>
                  <div style={{ 
                    color: 'rgba(255,255,255,0.5)', 
                    fontSize: '14px',
                    marginTop: '2px'
                  }}>
                    {suggestion.sublabel}
                  </div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Quick Category Buttons */}
        <div style={{ padding: '16px 20px' }}>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.4)',
            marginBottom: '12px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Quick Add
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {Object.entries(CATEGORY_COLORS).slice(0, 6).map(([cat, colors]) => (
              <button
                key={cat}
                onClick={() => handleQuickCategory(cat)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  background: `${colors.bg}30`,
                  color: colors.bg,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.1s'
                }}
                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        {input.trim() && (
          <div style={{ padding: '16px 20px', paddingBottom: '8px' }}>
            <button
              onClick={handleCreateFromInput}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                color: '#fff',
                fontSize: '17px',
                fontWeight: '600',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              Create Block
            </button>
          </div>
        )}
      </BottomSheet>
    );
  }

  // Desktop: Command Palette (original style with keyboard hints)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type to add a block... (e.g., 'Meeting at 3pm #work 30min')"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleSelect(suggestion)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: index === selectedIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
                  cursor: 'pointer',
                  borderLeft: index === selectedIndex ? '3px solid #4ECDC4' : '3px solid transparent'
                }}
              >
                <span
                  style={{
                    fontSize: '18px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: suggestion.color ? `${suggestion.color}30` : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {suggestion.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                    {suggestion.label}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                    {suggestion.sublabel}
                  </div>
                </div>
                {index === selectedIndex && (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    Enter ↵
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Keyboard Hints - Desktop Only */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)'
          }}
        >
          <span>
            <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>↑↓</kbd> Navigate
          </span>
          <span>
            <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>Enter</kbd> Select
          </span>
          <span>
            <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>Esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
});

QuickAdd.displayName = 'QuickAdd';

QuickAdd.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  selectedDate: PropTypes.string.isRequired
};

export default QuickAdd;
