import React, { useEffect } from 'react';

export default function ModalShell({ children, onClose, maxWidth = 520, panelStyle = {}, backdropStyle = {} }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5,8,16,0.72)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        ...backdropStyle,
      }}
      onClick={() => onClose?.()}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          maxHeight: '86vh',
          overflow: 'auto',
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 24,
          padding: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          ...panelStyle,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
