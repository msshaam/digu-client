import React, { useState } from 'react';

export default function WaitingRoom({ gameState, socket, roomCode, playerId, playerName }) {
  const [copied, setCopied] = useState(false);
  const isHost = gameState?.hostPlayerId === playerId;
  const players = gameState?.players || [];

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    socket.emit('startGame', { roomCode }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 40% 30%, #1a2a4a 0%, #0a0f1e 70%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#c9a84c' }}>Digu</h1>
          <p style={{ color: '#8a9bb5', fontSize: 13, marginTop: 4 }}>Waiting for players...</p>
        </div>

        {/* Room code */}
        <div style={{
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <p style={{ color: '#8a9bb5', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Room Code
          </p>
          <div style={{
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: '#c9a84c',
            fontFamily: "'Playfair Display', serif",
            marginBottom: 16,
          }}>
            {roomCode}
          </div>
          <button
            onClick={copyCode}
            style={{
              background: copied ? '#1a3a2a' : '#1a2235',
              border: `1px solid ${copied ? '#4caf88' : '#1e2d45'}`,
              color: copied ? '#4caf88' : '#8a9bb5',
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Players */}
        <div style={{
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
        }}>
          <p style={{ color: '#8a9bb5', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
            Players ({players.length}/5)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {players.map((p, i) => (
              <div key={p.playerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                background: '#0d1520',
                borderRadius: 10,
                border: p.playerId === playerId ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: `hsl(${(i * 67) % 360}, 50%, 35%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 15, color: '#e8e0d4' }}>{p.name}</span>
                {gameState.hostPlayerId === p.id && (
                  <span style={{ fontSize: 10, color: '#c9a84c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Host</span>
                )}
                {p.playerId === playerId && (
                  <span style={{ fontSize: 10, color: '#4caf88', letterSpacing: '0.08em', textTransform: 'uppercase' }}>You</span>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                padding: '10px 14px',
                background: '#0d1520',
                borderRadius: 10,
                border: '1px dashed #1e2d45',
                color: '#3a4a65',
                fontSize: 14,
                textAlign: 'center',
              }}>
                Waiting for player...
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button
            onClick={handleStart}
            disabled={players.length < 2}
            style={{
              width: '100%',
              padding: '14px',
              background: players.length >= 2
                ? 'linear-gradient(135deg, #c9a84c, #e8c96a)'
                : '#1a2235',
              color: players.length >= 2 ? '#0a0f1e' : '#3a4a65',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 10,
              cursor: players.length >= 2 ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              letterSpacing: '0.03em',
            }}
          >
            {players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
          </button>
        )}
        {!isHost && (
          <p style={{ textAlign: 'center', color: '#3a4a65', fontSize: 13, marginTop: 8 }}>
            Waiting for host to start...
          </p>
        )}
      </div>
    </div>
  );
}
