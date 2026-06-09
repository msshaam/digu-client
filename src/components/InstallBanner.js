import React from 'react';
import { CloseIcon, InstallIcon } from './Icons';

const pillButton = { borderRadius: 999 };

export default function InstallBanner({ onInstall, onDismiss, iosMode = false }) {
  const isCompact = window.innerWidth <= 430;

  return (
    <div style={{
      position: 'fixed',
      left: isCompact ? 12 : 16,
      right: isCompact ? 12 : 16,
      bottom: isCompact ? 12 : 16,
      zIndex: 1600,
      background: 'rgba(248,244,236,0.98)',
      border: '1px solid rgba(201,168,76,0.28)',
      borderRadius: isCompact ? 20 : 24,
      boxShadow: '0 14px 28px rgba(0,0,0,0.24)',
      padding: isCompact ? 12 : 14,
      color: '#0a0f1e',
      textTransform: 'uppercase',
      maxWidth: 520,
      margin: '0 auto',
    }}>
      <button
        onClick={onDismiss}
        aria-label="Dismiss install banner"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 34,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 999,
          cursor: 'pointer',
        }}
      >
        <CloseIcon color="#5b6782" />
      </button>
      <div style={{ display: 'flex', gap: isCompact ? 10 : 12, alignItems: 'center', paddingRight: 28 }}>
        <img
          src="/app-icon-192.png"
          alt=""
          width={isCompact ? 38 : 44}
          height={isCompact ? 38 : 44}
          style={{ borderRadius: isCompact ? 10 : 12, flexShrink: 0, background: '#0a0f1e' }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isCompact ? 16 : 18, fontWeight: 800, lineHeight: 1.05 }}>Install Digu</div>
          <div style={{ fontSize: isCompact ? 10 : 11, color: '#5b6782', marginTop: 4, lineHeight: 1.35 }}>
            {iosMode ? 'Add to your home screen from Safari for quick access' : 'Add to your device for quick access'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'nowrap' }}>
        <button
          onClick={onInstall}
          style={{
            flex: isCompact ? '1 1 auto' : '1 1 220px',
            minHeight: isCompact ? 44 : 48,
            padding: isCompact ? '0 14px' : '0 16px',
            background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
            color: '#0a0f1e',
            fontWeight: 800,
            fontSize: isCompact ? 14 : 15,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            ...pillButton,
            minWidth: 0,
            whiteSpace: 'nowrap',
          }}
        >
          <InstallIcon color="#0a0f1e" />
          {iosMode ? 'Show Steps' : 'Install App'}
        </button>
        <button
          onClick={onDismiss}
          style={{
            flex: isCompact ? '0 0 122px' : '0 1 132px',
            minHeight: isCompact ? 44 : 48,
            padding: isCompact ? '0 16px' : '0 18px',
            background: '#fff',
            border: '1px solid rgba(30,45,69,0.18)',
            color: '#0a0f1e',
            fontWeight: 700,
            fontSize: isCompact ? 13 : 14,
            ...pillButton,
            whiteSpace: 'nowrap',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
