import React, { useState } from 'react';

export default function Lobby({ socket, onJoined }) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return setError('Enter your name.');
    setLoading(true);
    socket.emit('createRoom', { playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoined({ roomCode: res.roomCode, playerId: res.playerId, playerName: name.trim() });
      } else {
        setError(res.error);
      }
    });
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Enter your name.');
    if (!roomCode.trim()) return setError('Enter a room code.');
    setLoading(true);
    socket.emit('joinRoom', { roomCode: roomCode.trim().toUpperCase(), playerName: name.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        onJoined({ roomCode: res.roomCode, playerId: res.playerId, playerName: name.trim() });
      } else {
        setError(res.error);
      }
    });
  };

  const inputStyle = {
    background: '#0d1520',
    border: '1.5px solid #1e2d45',
    borderRadius: 8,
    color: '#e8e0d4',
    padding: '12px 16px',
    fontSize: 16,
    width: '100%',
    transition: 'border-color 0.2s',
  };

  const btnPrimary = {
    background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
    color: '#0a0f1e',
    fontWeight: 700,
    fontSize: 15,
    padding: '13px 0',
    borderRadius: 8,
    width: '100%',
    letterSpacing: '0.03em',
    transition: 'opacity 0.2s',
    cursor: 'pointer',
  };

  const btnSecondary = {
    background: 'transparent',
    border: '1.5px solid #1e2d45',
    color: '#8a9bb5',
    fontWeight: 500,
    fontSize: 14,
    padding: '10px 0',
    borderRadius: 8,
    width: '100%',
    cursor: 'pointer',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 60% 20%, #1a2a4a 0%, #0a0f1e 70%)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }} className="slide-up">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🃏</div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: '#c9a84c', letterSpacing: '-0.02em', lineHeight: 1 }}>
            Digu
          </h1>
          <p style={{ color: '#8a9bb5', marginTop: 8, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gin Rummy — Maldives Edition
          </p>
          <p style={{ color: '#3a4a65', marginTop: 6, fontSize: 11, letterSpacing: '0.08em' }}>v1.4</p>
        </div>

        {/* Mode: null — just two buttons */}
        {mode === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="fade-in">
            <button style={btnPrimary} onClick={() => { setMode('create'); setError(''); }}>
              Create Room
            </button>
            <button style={{ ...btnPrimary, background: 'transparent', border: '1.5px solid #c9a84c', color: '#c9a84c' }}
              onClick={() => { setMode('join'); setError(''); }}>
              Join Room
            </button>
            <p style={{ color: '#3a4a65', textAlign: 'center', marginTop: 8, fontSize: 12 }}>
              2–5 players · Share the room code with friends
            </p>
          </div>
        )}

        {/* Mode: create */}
        {mode === 'create' && (
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
            <div>
              <label style={{ color: '#8a9bb5', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Your Name
              </label>
              <input
                style={inputStyle}
                placeholder="Enter your name"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                maxLength={20}
                autoFocus
              />
            </div>
            {error && <div style={{ color: '#e05252', fontSize: 13, textAlign: 'center' }}>{error}</div>}
            <button style={btnPrimary} onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <button style={btnSecondary} onClick={() => { setMode(null); setError(''); setName(''); }}>
              Back
            </button>
          </div>
        )}

        {/* Mode: join */}
        {mode === 'join' && (
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
            <div>
              <label style={{ color: '#8a9bb5', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Your Name
              </label>
              <input
                style={inputStyle}
                placeholder="Enter your name"
                value={name}
                onChange={e => { setName(e.target.value); setError(''); }}
                maxLength={20}
                autoFocus
              />
            </div>
            <div>
              <label style={{ color: '#8a9bb5', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Room Code
              </label>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 20, textAlign: 'center' }}
                placeholder="XXXXXX"
                value={roomCode}
                onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError(''); }}
                maxLength={6}
              />
            </div>
            {error && <div style={{ color: '#e05252', fontSize: 13, textAlign: 'center' }}>{error}</div>}
            <button style={btnPrimary} onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining...' : 'Join Room'}
            </button>
            <button style={btnSecondary} onClick={() => { setMode(null); setError(''); setName(''); setRoomCode(''); }}>
              Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
