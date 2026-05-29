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
  const [session, setSession] = useState(null); // { roomCode, playerId, playerName }
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Attempt rejoin if session exists in localStorage
      const saved = localStorage.getItem('digu_session');
      if (saved) {
        try {
          const sess = JSON.parse(saved);
          socket.emit('rejoinRoom', { roomCode: sess.roomCode, playerId: sess.playerId }, (res) => {
            if (res.success) {
              setSession(sess);
            } else {
              localStorage.removeItem('digu_session');
            }
          });
        } catch (e) {
          localStorage.removeItem('digu_session');
        }
      }
    });

    socket.on('disconnect', () => setConnected(false));

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

  const socket = socketRef.current;

  if (!connected) {
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
        <p style={{ fontSize: 14, animation: 'pulse 1.5s infinite' }}>Connecting to server...</p>
      </div>
    );
  }

  if (!session) {
    return <Lobby socket={socket} onJoined={handleJoined} />;
  }

  if (!gameState) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1e',
        color: '#8a9bb5',
      }}>
        Loading game...
      </div>
    );
  }

  const { roomCode, playerId, playerName } = session;

  if (gameState.status === 'waiting') {
    return (
      <WaitingRoom
        gameState={gameState}
        socket={socket}
        roomCode={roomCode}
        playerId={playerId}
        playerName={playerName}
      />
    );
  }

  if (gameState.status === 'roundEnd') {
    return (
      <RoundEnd
        gameState={gameState}
        socket={socket}
        roomCode={roomCode}
        playerId={playerId}
      />
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      socket={socket}
      roomCode={roomCode}
      playerId={playerId}
    />
  );
}
