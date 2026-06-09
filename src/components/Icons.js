import React from 'react';

export function OfflineIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M3 3L21 21" stroke="#e05252" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 15.5C10.3 13.8 13.7 13.8 15.5 15.5" stroke="#8a9bb5" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.5 12.5C7.6 10.4 10 9.5 12 9.5C12.9 9.5 13.8 9.7 14.7 10" stroke="#8a9bb5" strokeWidth="2" strokeLinecap="round" />
      <path d="M2.5 9.5C4.9 7 8.3 5.5 12 5.5C14.4 5.5 16.6 6.1 18.5 7.2" stroke="#8a9bb5" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1.5" fill="#e05252" />
    </svg>
  );
}

export function AttentionIcon({ size = 54 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 7L58 53H6L32 7Z" fill="rgba(201,168,76,0.12)" stroke="#c9a84c" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 22V36" stroke="#e8c96a" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="45" r="3.2" fill="#e8c96a" />
    </svg>
  );
}

export function InstallIcon({ size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4V14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 10L12 14L16 10" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18H19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ShareIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 8L12 4L16 8" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12V18C6 19.1 6.9 20 8 20H16C17.1 20 18 19.1 18 18V12" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 20, color = '#8a9bb5' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
