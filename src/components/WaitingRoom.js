import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import ConfirmDialog from './ConfirmDialog';

const pillButton = { borderRadius: 999 };

function playerLabel(name) {
  return String(name || '').toUpperCase();
}

export default function WaitingRoom({ gameState, socket, roomCode, playerId, onLeave }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isHost = gameState?.hostPlayerId === playerId;
  const players = gameState?.players || [];

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    socket.emit('startGame', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
    });
  };

  const handleLeaveConfirmed = () => {
    setConfirmOpen(false);
    socket.emit('leaveRoom', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
      else if (onLeave) onLeave();
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
      textTransform: 'uppercase',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="slide-up">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#c9a84c' }}>Digu</h1>
          <p style={{ color: '#8a9bb5', fontSize: 13, marginTop: 4 }}>Waiting for players...</p>
        </div>
        {error && <div style={{ color: '#e05252', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{error}</div>}

        {/* Room code */}
        <div style={{
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            background: '#f8f4ec',
            padding: 8,
            borderRadius: 8,
            marginBottom: 14,
          }}>
            <QRCodeSVG value={roomCode} size={104} bgColor="#f8f4ec" fgColor="#0a0f1e" />
          </div>
          <p style={{ color: '#8a9bb5', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Room Code
          </p>
          <div style={{
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: '0.18em',
            color: '#c9a84c',
            fontFamily: "'Manrope', sans-serif",
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
              ...pillButton,
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
                <span style={{ flex: 1, fontSize: 15, color: '#e8e0d4' }}>{playerLabel(p.name)}</span>
                {gameState.hostPlayerId === p.playerId && (
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
                Waiting for players...
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
              ...pillButton,
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
        <button
          onClick={() => setConfirmOpen(true)}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '12px',
            background: 'transparent',
            border: '1.5px solid #1e2d45',
            color: '#8a9bb5',
            fontWeight: 600,
            fontSize: 14,
            ...pillButton,
          }}
        >
          Leave Room
        </button>
        {confirmOpen && (
          <ConfirmDialog
            title="Leave this room?"
            message="You will return to the home screen."
            confirmLabel="Leave Room"
            confirmTone="danger"
            onConfirm={handleLeaveConfirmed}
            onCancel={() => setConfirmOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
