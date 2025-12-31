import React from 'react';

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['←', '→'], description: 'Previous / Next day' },
    { keys: ['T'], description: 'Jump to today' },
    { keys: ['W'], description: 'Toggle week view' },
  ]},
  { category: 'Actions', items: [
    { keys: ['N'], description: 'Add new block' },
    { keys: ['Space'], description: 'Start / Stop timer' },
    { keys: ['R'], description: 'Reset timer' },
    { keys: ['S'], description: 'Skip to next phase' },
  ]},
  { category: 'Panels', items: [
    { keys: ['A'], description: 'Toggle analytics' },
    { keys: ['G'], description: 'Toggle goals panel' },
    { keys: ['M'], description: 'Toggle focus sounds' },
    { keys: ['?'], description: 'Show this help' },
  ]},
  { category: 'System', items: [
    { keys: ['Esc'], description: 'Close modal / Exit focus mode' },
    { keys: ['⌘', 'K'], description: 'Quick add (spotlight)', isMac: true },
    { keys: ['Ctrl', 'K'], description: 'Quick add (spotlight)', isWindows: true },
  ]},
];

export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="shortcuts-content">
          {shortcuts.map(category => (
            <div key={category.category} className="shortcuts-category">
              <h3>{category.category}</h3>
              <div className="shortcuts-list">
                {category.items
                  .filter(item => {
                    if (item.isMac) return isMac;
                    if (item.isWindows) return !isMac;
                    return true;
                  })
                  .map((item, idx) => (
                    <div key={idx} className="shortcut-item">
                      <div className="shortcut-keys">
                        {item.keys.map((key, i) => (
                          <React.Fragment key={i}>
                            <kbd className="shortcut-key">{key}</kbd>
                            {i < item.keys.length - 1 && <span className="shortcut-plus">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                      <span className="shortcut-desc">{item.description}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <span>Press <kbd>?</kbd> to toggle this panel</span>
        </div>
      </div>

      <style>{`
        .shortcuts-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
          padding: 20px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .shortcuts-modal {
          background: var(--ios-card-bg, #ffffff);
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .shortcuts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.29));
        }

        .shortcuts-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--ios-label, #000);
        }

        .shortcuts-close {
          background: var(--ios-fill, rgba(120, 120, 128, 0.2));
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--ios-label-secondary, rgba(60, 60, 67, 0.6));
          transition: all 0.2s ease;
        }

        .shortcuts-close:hover {
          background: var(--ios-gray-5, #E5E5EA);
          color: var(--ios-label, #000);
        }

        .shortcuts-content {
          padding: 16px 24px;
          overflow-y: auto;
          max-height: calc(80vh - 140px);
        }

        .shortcuts-category {
          margin-bottom: 24px;
        }

        .shortcuts-category:last-child {
          margin-bottom: 0;
        }

        .shortcuts-category h3 {
          margin: 0 0 12px 0;
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--ios-label-secondary, rgba(60, 60, 67, 0.6));
        }

        .shortcuts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shortcut-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--ios-fill, rgba(120, 120, 128, 0.12));
          border-radius: 10px;
        }

        .shortcut-keys {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .shortcut-key {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 28px;
          height: 28px;
          padding: 0 8px;
          background: var(--ios-card-bg, #fff);
          border: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.29));
          border-radius: 6px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: var(--ios-label, #000);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .shortcut-plus {
          color: var(--ios-label-tertiary, rgba(60, 60, 67, 0.3));
          font-size: 12px;
        }

        .shortcut-desc {
          font-size: 15px;
          color: var(--ios-label, #000);
        }

        .shortcuts-footer {
          padding: 16px 24px;
          text-align: center;
          border-top: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.29));
          font-size: 13px;
          color: var(--ios-label-secondary, rgba(60, 60, 67, 0.6));
        }

        .shortcuts-footer kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          background: var(--ios-fill, rgba(120, 120, 128, 0.12));
          border: 1px solid var(--ios-separator, rgba(60, 60, 67, 0.29));
          border-radius: 4px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          margin: 0 4px;
        }

        @media (max-width: 600px) {
          .shortcuts-modal {
            max-width: 100%;
            margin: 0 10px;
          }

          .shortcuts-header {
            padding: 16px 20px;
          }

          .shortcuts-content {
            padding: 12px 20px;
          }

          .shortcut-item {
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
}
