import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { canDeclareDigu } from '../utils/meldCheck';

function getArcTransform(index, total, selected, containerWidth) {
  if (total === 0) return {};
  const cardW = 72;
  const cardH = 102;
  const cardDiag = Math.sqrt(cardW * cardW + cardH * cardH) / 2;
  const maxAngle = Math.min(28, total * 2.5);
  const edgeAngle = maxAngle * Math.PI / 180;
  const edgeHalf = cardDiag * Math.abs(Math.sin(edgeAngle + Math.PI / 4));
  const usable = (containerWidth || window.innerWidth) - 32 - edgeHalf * 2;
  const maxSpacing = total > 1 ? usable / (total - 1) : 0;
  const cardSpacing = Math.min(72, Math.max(18, maxSpacing));
  const totalWidth = cardSpacing * (total - 1);
  const xCenter = index * cardSpacing - totalWidth / 2;
  const angleStep = total > 1 ? (maxAngle * 2) / (total - 1) : 0;
  const angle = -maxAngle + index * angleStep;
  const arcDip = Math.pow((index - (total - 1) / 2) / Math.max(total / 2, 1), 2) * 14;
  const liftY = selected ? -22 : 0;
  return {
    transform: `translateX(${xCenter}px) translateY(${arcDip + liftY}px) rotate(${angle}deg)`,
    zIndex: selected ? total + 10 : index,
  };
}

// Scaled card face-down
function FaceDownCard({ width }) {
  const h = Math.round(width * 1.4);
  return (
    <div style={{
      width, height: h, borderRadius: Math.round(width * 0.13),
      background: 'linear-gradient(135deg, #1a2a4a 0%, #0d1b33 100%)',
      border: `2px solid #2a3f6a`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(width * 0.35), color: '#2a3f6a',
      flexShrink: 0,
    }}>✦</div>
  );
}

// Scaled card face-up
function BigCard({ card, width }) {
  const h = Math.round(width * 1.4);
  const isRed = card.suit === '♥' || card.suit === '♦';
  const color = isRed ? '#c0392b' : '#1a1a2e';
  const fs = Math.round(width * 0.22);
  const suitFs = Math.round(width * 0.38);
  return (
    <div style={{
      width, height: h, borderRadius: Math.round(width * 0.13),
      background: '#f8f4ec', border: '1.5px solid #d4c9b0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: `${Math.round(width * 0.08)}px ${Math.round(width * 0.1)}px`,
      flexShrink: 0,
    }}>
      <div style={{ fontSize: fs, fontWeight: 700, color, lineHeight: 1, alignSelf: 'flex-start', fontFamily: "'Playfair Display', serif" }}>{card.rank}</div>
      <div style={{ fontSize: suitFs, color, lineHeight: 1 }}>{card.suit}</div>
      <div style={{ fontSize: fs, fontWeight: 700, color, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)', fontFamily: "'Playfair Display', serif" }}>{card.rank}</div>
    </div>
  );
}

export default function GameBoard({ gameState, socket, roomCode, playerId }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [handOrder, setHandOrder] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const arcRef = useRef(null);
  const [arcWidth, setArcWidth] = useState(window.innerWidth);

  useEffect(() => {
    const update = () => {
      if (arcRef.current) setArcWidth(arcRef.current.offsetWidth);
      else setArcWidth(window.innerWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const players = gameState?.players || [];
  const myPlayerData = players.find(p => p.playerId === playerId);
  const myHand = myPlayerData?.hand || [];
  const currentPlayer = players[gameState?.currentTurn];
  const isMyTurn = currentPlayer?.playerId === playerId;
  const turnPhase = gameState?.turnPhase;
  const topDiscard = gameState?.discardPile?.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1] : null;
  const drawnCard = gameState?.drawnCard;
  const serverCards = drawnCard ? [...myHand, drawnCard] : myHand;

  useEffect(() => {
    if (serverCards.length === 0) { setHandOrder([]); return; }
    setHandOrder(prev => {
      const prevIds = prev.map(c => c.id);
      const serverIds = serverCards.map(c => c.id);
      const overlap = serverIds.filter(id => prevIds.includes(id));
      if (overlap.length === 0) return serverCards;
      const kept = prev.filter(c => serverIds.includes(c.id));
      const added = serverCards.filter(c => !prevIds.includes(c.id));
      return [...kept, ...added];
    });
  }, [myHand, drawnCard]); // eslint-disable-line

  const displayHand = (() => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) return handOrder;
    const reordered = [...handOrder];
    const dragged = reordered[dragIndex];
    reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, dragged);
    return reordered;
  })();

  useEffect(() => {
    if (arcRef.current) setArcWidth(arcRef.current.offsetWidth);
  }, [displayHand.length]); // eslint-disable-line

  const diguPossible = (() => {
    if (!isMyTurn || turnPhase !== 'discard' || !selectedCard) return false;
    return canDeclareDigu(displayHand.filter(c => c.id !== selectedCard));
  })();

  useEffect(() => { setSelectedCard(null); setError(''); }, [gameState?.currentTurn, turnPhase]);

  const doAction = (emitEvent, payload, cb) => {
    setLoading(true);
    socket.emit(emitEvent, { roomCode, ...payload }, (res) => {
      setLoading(false);
      if (!res.success) setError(res.error);
      else { setError(''); if (cb) cb(res); }
    });
  };

  const handleDrawDeck = () => {
    if (!isMyTurn || turnPhase !== 'draw') return;
    doAction('drawFromDeck', {}, (res) => setSelectedCard(res.card?.id));
  };
  const handleDrawDiscard = () => {
    if (!isMyTurn || turnPhase !== 'draw' || !topDiscard) return;
    doAction('drawFromDiscard', {}, (res) => setSelectedCard(res.card?.id));
  };
  const handleCardClick = (cardId) => {
    if (!isMyTurn || turnPhase !== 'discard') return;
    setSelectedCard(cardId === selectedCard ? null : cardId);
  };
  const handleDiscard = () => {
    if (!selectedCard) return setError('Select a card to discard.');
    doAction('discardCard', { cardId: selectedCard, isDiguDiscard: false });
  };
  const handleDigu = () => {
    if (!selectedCard || !diguPossible) return;
    doAction('discardCard', { cardId: selectedCard, isDiguDiscard: true });
  };

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };
  const handleDragEnter = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex === null) return;
    const reordered = [...handOrder];
    const dragged = reordered[dragIndex];
    reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, dragged);
    setHandOrder(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const otherPlayers = players.filter(p => p.playerId !== playerId);
  const dealerName = players[gameState?.dealerIndex]?.name;
  const total = displayHand.length;

  // Responsive card size for center piles — based on screen width
  const tableCardW = Math.min(110, Math.max(70, Math.round(arcWidth * 0.18)));

  return (
    <div style={{
      height: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0f1f3d 0%, #0a0f1e 60%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 14px 8px',
      gap: 8,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#c9a84c', lineHeight: 1 }}>Digu</h1>
        <div style={{ fontSize: 11, color: '#8a9bb5', textAlign: 'right' }}>
          <div>Dealer: <span style={{ color: '#e8e0d4', fontWeight: 600 }}>{dealerName}</span></div>
          <div style={{ color: '#3a4a65', fontSize: 10 }}>Room: {roomCode}</div>
        </div>
      </div>

      {/* Other players */}
      {otherPlayers.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          {otherPlayers.map((p) => {
            const isActive = p.playerId === currentPlayer?.playerId;
            return (
              <div key={p.playerId} style={{
                background: isActive ? 'rgba(201,168,76,0.1)' : '#111827',
                border: `1.5px solid ${isActive ? 'rgba(201,168,76,0.5)' : '#1e2d45'}`,
                borderRadius: 10, padding: '6px 10px', minWidth: 80, flexShrink: 0,
                animation: isActive ? 'glow 2s infinite' : undefined,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#c9a84c' : '#8a9bb5', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                  {p.name}{!p.connected && ' ⚠️'}{isActive && ' ●'}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: Math.min(p.cardCount, 11) }).map((_, ci) => (
                    <div key={ci} style={{ width: 12, height: 18, borderRadius: 2, background: 'linear-gradient(135deg, #1a2a4a, #0d1b33)', border: '1px solid #2a3f6a', flexShrink: 0 }} />
                  ))}
                </div>
                <div style={{ fontSize: 9, color: '#3a4a65', marginTop: 3 }}>Score: {p.score}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Center table — fixed height, horizontally centered, cards properly sized */}
      <div style={{
        background: 'linear-gradient(145deg, #0d1b33 0%, #0a1525 100%)',
        border: '1px solid #1e2d45', borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, padding: '16px 12px', gap: 0,
      }}>
        {/* Deck */}
        <div
          onClick={isMyTurn && turnPhase === 'draw' ? handleDrawDeck : undefined}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: isMyTurn && turnPhase === 'draw' ? 'pointer' : 'default',
            opacity: gameState?.deckCount === 0 ? 0.3 : 1,
            padding: '4px 0',
          }}
        >
          <div style={{
            transform: isMyTurn && turnPhase === 'draw' ? 'translateY(-4px)' : 'none',
            transition: 'transform 0.15s',
          }}>
            <FaceDownCard width={tableCardW} />
          </div>
          <div style={{ fontSize: 12, color: '#8a9bb5' }}>{gameState?.deckCount} cards</div>
          {isMyTurn && turnPhase === 'draw' && gameState?.deckCount > 0 && (
            <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>Tap to draw</div>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', flexShrink: 0 }}>
          <div style={{ width: 1, height: 40, background: '#1e2d45' }} />
          <div style={{ color: '#3a4a65', fontSize: 12, fontWeight: 700, padding: '6px 0' }}>or</div>
          <div style={{ width: 1, height: 40, background: '#1e2d45' }} />
        </div>

        {/* Discard */}
        <div
          onClick={isMyTurn && turnPhase === 'draw' && topDiscard ? handleDrawDiscard : undefined}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: isMyTurn && turnPhase === 'draw' && topDiscard ? 'pointer' : 'default',
            padding: '4px 0',
          }}
        >
          <div style={{
            transform: isMyTurn && turnPhase === 'draw' && topDiscard ? 'translateY(-4px)' : 'none',
            transition: 'transform 0.15s',
          }}>
            {topDiscard
              ? <BigCard card={topDiscard} width={tableCardW} />
              : <div style={{
                  width: tableCardW, height: Math.round(tableCardW * 1.4),
                  borderRadius: Math.round(tableCardW * 0.13),
                  border: '2px dashed #1e2d45',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#2a3f6a', fontSize: 28,
                }}>+</div>
            }
          </div>
          <div style={{ fontSize: 12, color: '#8a9bb5' }}>Discard pile</div>
          {isMyTurn && turnPhase === 'draw' && topDiscard && (
            <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>Tap to take</div>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', padding: '6px 12px', flexShrink: 0,
        background: isMyTurn ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderRadius: 8, border: isMyTurn ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
      }}>
        {isMyTurn
          ? <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: 12 }}>
              {turnPhase === 'draw' ? 'Your turn — draw a card' : 'Tap a card to select, then Discard or Digu'}
            </span>
          : <span style={{ color: '#8a9bb5', fontSize: 12 }}>{currentPlayer?.name}'s turn...</span>
        }
      </div>

      {error && (
        <div style={{ color: '#e05252', fontSize: 12, textAlign: 'center', flexShrink: 0 }}>{error}</div>
      )}

      {/* Arc hand — takes remaining vertical space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2, flexShrink: 0 }}>
          <span style={{ color: '#8a9bb5', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Hand ({total})</span>
          <span style={{ fontSize: 9, color: '#3a4a65' }}>drag to reorder · tap to select</span>
        </div>

        <div ref={arcRef} style={{
          position: 'relative',
          height: 190,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 14,
          overflowX: 'hidden',
          flexShrink: 0,
          width: '100%',
        }}>
          {displayHand.map((card, i) => {
            const arcStyle = getArcTransform(i, total, selectedCard === card.id, arcWidth);
            const isDragging = dragIndex === i;
            const isNew = drawnCard && card.id === drawnCard.id;
            return (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnter={(e) => handleDragEnter(e, i)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
                style={{
                  position: 'absolute',
                  transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.15s ease',
                  opacity: isDragging ? 0.25 : 1,
                  cursor: isMyTurn && turnPhase === 'discard' ? 'pointer' : 'grab',
                  ...arcStyle,
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Card
                    card={card}
                    selected={selectedCard === card.id}
                    onClick={isMyTurn && turnPhase === 'discard' ? () => handleCardClick(card.id) : undefined}
                  />
                  {isNew && (
                    <div style={{
                      position: 'absolute', top: -8, right: -4,
                      background: '#c9a84c', color: '#0a0f1e',
                      fontSize: 8, fontWeight: 700, padding: '1px 4px',
                      borderRadius: 4, pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>NEW</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        {isMyTurn && turnPhase === 'discard' && (
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8, flexShrink: 0 }} className="slide-up">
            <button onClick={handleDiscard} disabled={!selectedCard || loading} style={{
              flex: 1, padding: '12px',
              background: selectedCard ? '#1a2235' : '#0d1520',
              border: `1.5px solid ${selectedCard ? '#4caf88' : '#1e2d45'}`,
              color: selectedCard ? '#4caf88' : '#3a4a65',
              fontWeight: 600, fontSize: 14, borderRadius: 10, transition: 'all 0.2s',
            }}>Discard</button>
            {diguPossible && (
              <button onClick={handleDigu} disabled={loading} style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
                border: 'none', color: '#0a0f1e',
                fontWeight: 700, fontSize: 14, borderRadius: 10,
                letterSpacing: '0.05em', animation: 'glow 1.5s infinite',
              }}>🎴 Digu!</button>
            )}
          </div>
        )}
        {(!isMyTurn || turnPhase === 'draw') && <div style={{ height: 8 }} />}
      </div>
    </div>
  );
}
