import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { getTemplates, blockFromTemplate } from '../utils/templates';
import { getTags } from '../utils/tags';
import { CATEGORY_COLORS } from '../constants';

/**
 * Quick Add Bar (Cmd+K / Ctrl+K)
 * Natural language input for quickly adding blocks
 */
const QuickAdd = memo(({ isOpen, onClose, onAdd, selectedDate }) => {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState('input'); // 'input', 'templates', 'categories'

  const inputRef = useRef(null);
  const templates = useMemo(() => getTemplates(), []);
  const tags = useMemo(() => getTags(), []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setMode('input');
      setSelectedIndex(0);
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timeoutId);
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

    // Category shortcuts
    Object.entries(CATEGORY_COLORS).forEach(([cat, colors]) => {
      if (cat.startsWith(input.toLowerCase())) {
        newSuggestions.push({
          type: 'category',
          label: `New ${cat} block`,
          sublabel: 'Create a new block',
          data: { category: cat },
          icon: '➕',
          color: colors.bg
        });
      }
    });

    // Time parsing suggestions
    if (parsed.time) {
      newSuggestions.unshift({
        type: 'create',
        label: parsed.title || 'New block',
        sublabel: `at ${parsed.time}${parsed.duration ? ` • ${parsed.duration}min` : ''}`,
        data: parsed,
        icon: '⏰'
      });
    }

    setSuggestions(newSuggestions.slice(0, 6));
    setSelectedIndex(0);
  }, [input, templates]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

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
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle through modes
        setMode(prev => prev === 'input' ? 'templates' : prev === 'templates' ? 'categories' : 'input');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, input, onClose]);

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
    switch (suggestion.type) {
      case 'template': {
        const block = blockFromTemplate(
          suggestion.data,
          selectedDate,
          suggestion.data.hour ?? 9
        );
        onAdd(block);
        break;
      }
      case 'category': {
        onAdd({
          title: input.replace(/^\w+\s*/, '').trim() || 'New block',
          category: suggestion.data.category,
          date: selectedDate,
          hour: 9,
          start_minute: 0,
          duration_minutes: 60
        });
        break;
      }
      case 'create': {
        const data = suggestion.data;
        onAdd({
          title: data.title || 'New block',
          category: data.category || 'work',
          date: selectedDate,
          hour: data.hour ?? 9,
          start_minute: data.start_minute ?? 0,
          duration_minutes: data.duration || 60
        });
        break;
      }
    }
    onClose();
  };

  const handleCreateFromInput = () => {
    const parsed = parseInput(input);
    onAdd({
      title: parsed.title || input,
      category: parsed.category || 'work',
      date: selectedDate,
      hour: parsed.hour ?? 9,
      start_minute: parsed.start_minute ?? 0,
      duration_minutes: parsed.duration || 60
    });
    onClose();
  };

  if (!isOpen) return null;

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

        {/* Hint */}
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
