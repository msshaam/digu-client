import React, { useState } from 'react';
import Card from './Card';

const pillButton = { borderRadius: 999 };

function playerLabel(name, isYou = false) {
  return `${String(name || '').toUpperCase()}${isYou ? ' (YOU)' : ''}`;
}

export default function RoundEnd({ gameState, socket, roomCode, playerId, onBackHome }) {
  const isHost = gameState?.hostPlayerId === playerId;
  const scores = gameState?.roundScores || [];
  const isInterrupted = gameState?.status === 'interrupted';
  const scoreRows = isInterrupted ? (gameState?.scoreSnapshot || []) : scores;
  const scoreHistory = gameState?.scoreHistory || [];
  const diguCounts = scoreRows.reduce((counts, row) => {
    counts[row.playerId] = scoreHistory.filter(round => round.winnerPlayerId === row.playerId).length;
    return counts;
  }, {});
  const [error, setError] = useState('');

  const handleNextRound = () => {
    socket.emit('nextRound', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
    });
  };

  const handleEndGame = () => {
    socket.emit('endCurrentGame', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
    });
  };

  const handleStartNewGame = () => {
    socket.emit('startNewGame', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
    });
  };

  const handleBackHome = () => {
    socket.emit('leaveRoom', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
      else if (onBackHome) onBackHome();
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 20%, #1a2a4a 0%, #0a0f1e 70%)',
      padding: '24px 16px',
      overflowY: 'auto',
      textTransform: 'uppercase',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }} className="slide-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          {!isInterrupted && (
            <div style={{ fontSize: 48, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
              🎉
            </div>
          )}
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#c9a84c' }}>
            {isInterrupted ? 'Game ended' : `${playerLabel(gameState.winnerName)} called Digu!`}
          </h2>
          <p style={{ color: '#8a9bb5', fontSize: 13, marginTop: 6 }}>
            {isInterrupted ? gameState.interruptionReason : 'Round Results'}
          </p>
        </div>
        {error && <div style={{ color: '#e05252', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{error}</div>}

        {/* Score cards */}
        {!isInterrupted && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {scores
              .slice()
              .sort((a, b) => b.netScore - a.netScore)
              .map((s, i) => {
                const isYou = s.playerId === playerId;
                const isWinner = s.playerName === gameState.winnerName;
                return (
                  <div key={s.playerId} style={{
                    background: isWinner ? 'rgba(201,168,76,0.08)' : '#111827',
                    border: `1.5px solid ${isWinner ? 'rgba(201,168,76,0.35)' : isYou ? 'rgba(76,175,136,0.3)' : '#1e2d45'}`,
                    borderRadius: 14,
                    padding: '18px 20px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '}</span>
                        <div>
                          <span style={{ fontSize: 16, fontWeight: 600, color: isWinner ? '#c9a84c' : '#e8e0d4' }}>
                            {playerLabel(s.playerName)}
                          </span>
                          {isWinner && <span style={{ marginLeft: 6, fontSize: 11, color: '#c9a84c' }}>· Digu!</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: s.netScore >= 0 ? '#4caf88' : '#e05252',
                          fontFamily: "'Manrope', sans-serif",
                        }}>
                          {s.netScore >= 0 ? '+' : ''}{s.netScore}
                        </div>
                        <div style={{ fontSize: 11, color: '#8a9bb5' }}>
                          Total: {s.totalScore}
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                      {s.specialType === 'pureSequence10' && (
                        <span style={{ color: '#c9a84c' }}>+1000 HAAS DIGU!</span>
                      )}
                      {s.meldPoints > 0 && (
                        <span style={{ color: '#4caf88' }}>+{s.meldPoints} melds</span>
                      )}
                      {s.nonMeldPoints > 0 && (
                        <span style={{ color: '#e05252' }}>-{s.nonMeldPoints} deadwood</span>
                      )}
                      {s.noMeldPenalty > 0 && (
                        <span style={{ color: '#e05252' }}>-100 no melds</span>
                      )}
                      {s.bonus > 0 && (
                        <span style={{ color: '#c9a84c' }}>+{s.bonus} digu bonus</span>
                      )}
                    </div>

                    {/* Show each player's counted meld groups and remaining cards after Digu */}
                    {(s.melds?.length > 0 || s.nonMeldCards?.length > 0) && (
                      <div style={{ marginTop: 14 }}>
                        <p style={{ color: '#8a9bb5', fontSize: 11, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {isWinner ? 'Winning groups' : 'Melds'}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                          {(s.melds || []).map((meld, mi) => (
                            <div key={mi} style={{ display: 'flex', gap: 3, padding: '4px 6px', background: 'rgba(201,168,76,0.08)', borderRadius: 8, border: '1px solid rgba(201,168,76,0.2)', width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap' }}>
                              {meld.map(card => (
                                <Card key={card.id} card={card} small />
                              ))}
                            </div>
                          ))}
                          {s.nonMeldCards?.length > 0 && (
                            <div>
                              <p style={{ color: '#3a4a65', fontSize: 10, margin: '4px 0 6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Deadwood</p>
                              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                {s.nonMeldCards.map(card => (
                                  <Card key={card.id} card={card} small />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* Total scores */}
        <div style={{
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 72px 58px', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <span />
            <span style={{ color: '#8a9bb5', fontSize: 10, letterSpacing: '0.08em', textAlign: 'right', fontWeight: 800 }}>Score</span>
            <span style={{ color: '#8a9bb5', fontSize: 10, letterSpacing: '0.08em', textAlign: 'right', fontWeight: 800 }}>Digu</span>
          </div>
          {scoreRows
            .slice()
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((s, i) => (
              <div key={s.playerId || s.playerName || i} style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 72px 58px',
                gap: 10,
                alignItems: 'center',
                padding: '7px 0',
                borderBottom: '1px solid #1a2235',
              }}>
                <span style={{ color: s.playerId === playerId ? '#4caf88' : '#e8e0d4', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {playerLabel(s.playerName)}
                </span>
                <span style={{ fontWeight: 700, color: s.totalScore >= 0 ? '#e8e0d4' : '#e05252', fontFamily: "'Manrope', sans-serif", textAlign: 'right' }}>
                  {s.totalScore}
                </span>
                <span style={{ fontWeight: 800, color: '#c9a84c', fontFamily: "'Manrope', sans-serif", textAlign: 'right' }}>
                  {diguCounts[s.playerId] || 0}
                </span>
              </div>
            ))}
        </div>

        {isInterrupted ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isHost && (gameState.players?.length || 0) >= 2 && (
              <button
                onClick={handleStartNewGame}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
                  color: '#0a0f1e',
                  fontWeight: 700,
                  fontSize: 16,
                  ...pillButton,
                  letterSpacing: '0.03em',
                }}
              >
                Start New Game
              </button>
            )}
            <button
              onClick={handleBackHome}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '1.5px solid #1e2d45',
                color: '#8a9bb5',
                fontWeight: 600,
                fontSize: 14,
                ...pillButton,
              }}
            >
              Back to Home
            </button>
          </div>
        ) : isHost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleNextRound}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
                color: '#0a0f1e',
                fontWeight: 700,
                fontSize: 16,
                ...pillButton,
                letterSpacing: '0.03em',
              }}
            >
              Next Round
            </button>
            <button
              onClick={handleEndGame}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: '1.5px solid rgba(224,82,82,0.38)',
                color: '#e05252',
                fontWeight: 700,
                fontSize: 14,
                ...pillButton,
                letterSpacing: '0.03em',
              }}
            >
              End Game
            </button>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#3a4a65', fontSize: 13 }}>
            Waiting for host to start next round...
          </p>
        )}
      </div>
    </div>
  );
}
