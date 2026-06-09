import React from 'react';
import ModalShell from './ModalShell';

const pillButton = { borderRadius: 999 };

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  confirmTone = 'danger',
  onConfirm,
  onCancel,
}) {
  const confirmStyle = confirmTone === 'danger'
    ? {
        background: '#e05252',
        color: '#fff',
        border: '1px solid rgba(224,82,82,0.4)',
      }
    : {
        background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
        color: '#0a0f1e',
        border: '1px solid rgba(201,168,76,0.4)',
      };

  return (
    <ModalShell onClose={onCancel} maxWidth={420}>
      <div style={{ textTransform: 'uppercase' }}>
        <h2 style={{ color: '#c9a84c', fontSize: 22, fontWeight: 900, marginBottom: 10, textAlign: 'center' }}>
          {title}
        </h2>
        <p style={{ color: '#8a9bb5', fontSize: 13, lineHeight: 1.5, textAlign: 'center', marginBottom: 18 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '14px 16px',
              fontWeight: 800,
              fontSize: 14,
              ...pillButton,
              ...confirmStyle,
            }}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '14px 16px',
              background: 'transparent',
              border: '1.5px solid #1e2d45',
              color: '#8a9bb5',
              fontWeight: 700,
              fontSize: 14,
              ...pillButton,
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
