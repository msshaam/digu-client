import React from 'react';

const SUIT_COLOR = { '♠': '#1a1a2e', '♣': '#1a1a2e', '♥': '#c0392b', '♦': '#c0392b' };

export default function Card({ card, selected, onClick, small, faceDown, style, animDelay, highlight }) {
  if (faceDown) {
    return (
      <div
        style={{
          width: small ? 42 : 64,
          height: small ? 60 : 90,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #1a2a4a 0%, #0d1b33 100%)',
          border: '2px solid #2a3f6a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: small ? 16 : 22,
          color: '#2a3f6a',
          flexShrink: 0,
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          ...style
        }}
      >
        ✦
      </div>
    );
  }

  const color = SUIT_COLOR[card.suit] || '#1a1a2e';
  const highlightStyles = highlight ? {
    background: highlight.background,
    border: `2.5px solid ${highlight.border}`,
    boxShadow: `0 0 0 3px ${highlight.glow}, 0 4px 16px rgba(0,0,0,0.3)`,
  } : {};

  return (
    <div
      onClick={onClick}
      style={{
        width: small ? 42 : 64,
        height: small ? 60 : 90,
        borderRadius: 8,
        background: selected ? '#fffbe6' : (highlightStyles.background || '#f8f4ec'),
        border: selected ? '2.5px solid #c9a84c' : (highlightStyles.border || '1.5px solid #d4c9b0'),
        boxShadow: selected
          ? '0 0 0 3px rgba(201,168,76,0.4), 0 4px 16px rgba(0,0,0,0.3)'
          : (highlightStyles.boxShadow || '0 2px 8px rgba(0,0,0,0.25)'),
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: small ? '3px 4px' : '5px 6px',
        transition: 'all 0.15s ease',
        transform: selected ? 'translateY(-8px)' : 'translateY(0)',
        flexShrink: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        animation: animDelay !== undefined ? `cardDeal 0.3s ease ${animDelay}s both` : undefined,
        ...style
      }}
    >
      <div style={{
        alignSelf: 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1,
      }}>
        <div style={{
          fontSize: small ? 11 : 15,
          fontWeight: 700,
          color,
          lineHeight: 1,
          fontFamily: "'Manrope', sans-serif",
        }}>
          {card.rank}
        </div>
        <div style={{ fontSize: small ? 9 : 12, color, lineHeight: 1, marginTop: 2 }}>
          {card.suit}
        </div>
      </div>
      <div style={{ fontSize: small ? 16 : 24, color, lineHeight: 1 }}>
        {card.suit}
      </div>
      <div style={{
        fontSize: small ? 11 : 15,
        fontWeight: 700,
        color,
        lineHeight: 1,
        fontFamily: "'Manrope', sans-serif",
        alignSelf: 'flex-end',
        transform: 'rotate(180deg)'
      }}>
        {card.rank}
      </div>
    </div>
  );
}
