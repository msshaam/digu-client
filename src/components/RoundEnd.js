import React from 'react';
import Card from './Card';

export default function RoundEnd({ gameState, socket, roomCode, playerId }) {
  const isHost = gameState?.hostId === playerId;
  const scores = gameState?.roundScores || [];
  const winner = scores.find(s => s.playerName === gameState.winnerName);

  const handleNextRound = () => {
    socket.emit('nextRound', { roomCode }, (res) => {
      if (!res.success) alert(res.error);
    });
  };

  const cardValueLabel = (card) => {
    if (card.rank === 'A') return 15;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return parseInt(card.rank);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 20%, #1a2a4a 0%, #0a0f1e 70%)',
      padding: '24px 16px',
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }} className="slide-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#c9a84c' }}>
            {gameState.winnerName} called Digu!
          </h2>
          <p style={{ color: '#8a9bb5', fontSize: 13, marginTop: 6 }}>Round Results</p>
        </div>

        {/* Score cards */}
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
                          {s.playerName}
                        </span>
                        {isYou && <span style={{ marginLeft: 6, fontSize: 11, color: '#4caf88' }}>(you)</span>}
                        {isWinner && <span style={{ marginLeft: 6, fontSize: 11, color: '#c9a84c' }}>· Digu!</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: s.netScore >= 0 ? '#4caf88' : '#e05252',
                        fontFamily: "'Playfair Display', serif",
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
                    {s.meldPoints > 0 && (
                      <span style={{ color: '#4caf88' }}>+{s.meldPoints} melds</span>
                    )}
                    {s.nonMeldPoints > 0 && (
                      <span style={{ color: '#e05252' }}>-{s.nonMeldPoints} deadwood</span>
                    )}
                    {s.bonus > 0 && (
                      <span style={{ color: '#c9a84c' }}>+{s.bonus} digu bonus</span>
                    )}
                  </div>

                  {/* Show cards for digu winner */}
                  {isWinner && s.melds && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ color: '#8a9bb5', fontSize: 11, marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Winning hand</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {s.melds.map((meld, mi) => (
                          <div key={mi} style={{ display: 'flex', gap: 3, padding: '4px 6px', background: 'rgba(201,168,76,0.08)', borderRadius: 8, border: '1px solid rgba(201,168,76,0.2)' }}>
                            {meld.map(card => (
                              <Card key={card.id} card={card} small />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Total scores */}
        <div style={{
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 24,
        }}>
          <p style={{ color: '#8a9bb5', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
            Cumulative Scores
          </p>
          {scores
            .slice()
            .sort((a, b) => b.totalScore - a.totalScore)
            .map(s => (
              <div key={s.playerId} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '7px 0',
                borderBottom: '1px solid #1a2235',
              }}>
                <span style={{ color: s.playerId === playerId ? '#4caf88' : '#e8e0d4', fontSize: 14 }}>
                  {s.playerName}
                </span>
                <span style={{ fontWeight: 700, color: s.totalScore >= 0 ? '#e8e0d4' : '#e05252', fontFamily: "'Playfair Display', serif" }}>
                  {s.totalScore}
                </span>
              </div>
            ))}
        </div>

        {isHost ? (
          <button
            onClick={handleNextRound}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
              color: '#0a0f1e',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 10,
              letterSpacing: '0.03em',
            }}
          >
            Next Round
          </button>
        ) : (
          <p style={{ textAlign: 'center', color: '#3a4a65', fontSize: 13 }}>
            Waiting for host to start next round...
          </p>
        )}
      </div>
    </div>
  );
}
