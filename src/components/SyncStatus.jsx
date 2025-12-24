import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Sync status indicator showing connection state
 */
const SyncStatus = memo(({ isSyncing }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isSyncing ? 'Syncing data...' : 'All changes synced'}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0,0,0,0.6)',
        padding: '8px 14px',
        borderRadius: '16px',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: isSyncing ? '#FFC75F' : '#4ECDC4',
          animation: isSyncing ? 'pulse 1s infinite' : 'none'
        }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: 'rgba(255,255,255,0.6)'
        }}
      >
        {isSyncing ? 'Syncing...' : 'Synced'}
      </span>
    </div>
  );
});

SyncStatus.displayName = 'SyncStatus';

SyncStatus.propTypes = {
  isSyncing: PropTypes.bool.isRequired
};

export default SyncStatus;
