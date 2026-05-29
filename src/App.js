import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import GameBoard from './components/GameBoard';
import RoundEnd from './components/RoundEnd';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || '';

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [rejoining, setRejoining] = useState(true); // true on load while we attempt rejoin
  const [session, setSession] = useState(null); // { roomCode, playerId, playerName }
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Attempt rejoin on every connect (covers refresh + reconnect after drop)
      const saved = localStorage.getItem('digu_session');
      if (saved) {
        try {
          const sess = JSON.parse(saved);
          socket.emit('rejoinRoom', { roomCode: sess.roomCode, playerId: sess.playerId }, (res) => {
            if (res.success) {
              // Update session with any server-side name (in case it changed)
              const updated = { ...sess, playerName: res.playerName || sess.playerName };
              setSession(updated);
              localStorage.setItem('digu_session', JSON.stringify(updated));
            } else {
              // Room gone (server restarted) — clear session, go to lobby
              localStorage.removeItem('digu_session');
              setSession(null);
              setGameState(null);
            }
            setRejoining(false);
          });
        } catch (e) {
          localStorage.removeItem('digu_session');
          setRejoining(false);
        }
      } else {
        setRejoining(false);
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
    });

    return () => socket.disconnect();
  }, []);

  const handleJoined = ({ roomCode, playerId, playerName }) => {
    const sess = { roomCode, playerId, playerName };
    setSession(sess);
    localStorage.setItem('digu_session', JSON.stringify(sess));
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('digu_session');
    setSession(null);
    setGameState(null);
  };

  const socket = socketRef.current;

  // Loading / reconnecting screen
  if (!connected || rejoining) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1e',
        color: '#8a9bb5',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>🃏</div>
        <p style={{ fontSize: 14, animation: 'pulse 1.5s infinite' }}>
          {!connected ? 'Reconnecting...' : 'Loading game...'}
        </p>
        {!connected && session && (
          <button
            onClick={handleLeaveRoom}
            style={{
              marginTop: 8,
              background: 'transparent',
              border: '1px solid #1e2d45',
              color: '#3a4a65',
              padding: '8px 20px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Leave Room
          </button>
        )}
      </div>
    );
  }

  if (!session) {
    return <Lobby socket={socket} onJoined={handleJoined} />;
  }

  if (!gameState) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0a0f1e', color: '#8a9bb5',
      }}>
        Loading game...
      </div>
    );
  }

  const { roomCode, playerId, playerName } = session;

  if (gameState.status === 'waiting') {
    return <WaitingRoom gameState={gameState} socket={socket} roomCode={roomCode} playerId={playerId} playerName={playerName} onLeave={handleLeaveRoom} />;
  }

  if (gameState.status === 'roundEnd') {
    return <RoundEnd gameState={gameState} socket={socket} roomCode={roomCode} playerId={playerId} />;
  }

  return <GameBoard gameState={gameState} socket={socket} roomCode={roomCode} playerId={playerId} />;
}
