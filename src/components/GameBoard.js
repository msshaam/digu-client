import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { canDeclareDigu } from '../utils/meldCheck';

// Arc layout: spread cards in a fan/arc with proper horizontal spacing
function getArcTransform(index, total, selected) {
  if (total === 0) return {};
  const cardSpacing = Math.min(72, Math.max(44, 600 / total)); // px between card centers
  const totalWidth = cardSpacing * (total - 1);
  const xCenter = index * cardSpacing - totalWidth / 2;
  const maxAngle = Math.min(35, total * 3.5);
  const angleStep = total > 1 ? (maxAngle * 2) / (total - 1) : 0;
  const angle = -maxAngle + index * angleStep;
  // Arc curve: cards at edges dip down slightly
  const arcDip = Math.pow((index - (total - 1) / 2) / Math.max(total / 2, 1), 2) * 18;
  const liftY = selected ? -20 : 0;
  return {
    transform: `translateX(${xCenter}px) translateY(${arcDip + liftY}px) rotate(${angle}deg)`,
    zIndex: selected ? total + 10 : index,
  };
}

export default function GameBoard({ gameState, socket, roomCode, playerId }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [handOrder, setHandOrder] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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

  // Real-time drag preview
  const displayHand = (() => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) return handOrder;
    const reordered = [...handOrder];
    const dragged = reordered[dragIndex];
    reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, dragged);
    return reordered;
  })();

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

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0f1f3d 0%, #0a0f1e 60%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 16px 0',
      gap: 10,
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#c9a84c' }}>Digu</h1>
        <div style={{ fontSize: 12, color: '#8a9bb5', textAlign: 'right' }}>
          <div>Dealer: <span style={{ color: '#e8e0d4' }}>{dealerName}</span></div>
          <div style={{ color: '#3a4a65', fontSize: 11 }}>Room: {roomCode}</div>
        </div>
      </div>

      {/* Other players */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, flexShrink: 0 }}>
        {otherPlayers.map((p) => {
          const isActive = p.playerId === currentPlayer?.playerId;
          return (
            <div key={p.playerId} style={{
              background: isActive ? 'rgba(201,168,76,0.1)' : '#111827',
              border: `1.5px solid ${isActive ? 'rgba(201,168,76,0.5)' : '#1e2d45'}`,
              borderRadius: 12, padding: '8px 12px', minWidth: 90, flexShrink: 0,
              animation: isActive ? 'glow 2s infinite' : undefined,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? '#c9a84c' : '#8a9bb5', marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name} {!p.connected && '⚠️'}{isActive && ' ●'}
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {Array.from({ length: Math.min(p.cardCount, 11) }).map((_, ci) => (
                  <div key={ci} style={{ width: 14, height: 22, borderRadius: 3, background: 'linear-gradient(135deg, #1a2a4a, #0d1b33)', border: '1px solid #2a3f6a', flexShrink: 0 }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: '#3a4a65', marginTop: 4 }}>Score: {p.score}</div>
            </div>
          );
        })}
      </div>

      {/* Center table */}
      <div style={{
        background: 'linear-gradient(145deg, #0d1b33 0%, #0a1525 100%)',
        border: '1px solid #1e2d45', borderRadius: 16, padding: '16px 20px',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, flexShrink: 0,
      }}>
        {/* Deck */}
        <div style={{ textAlign: 'center' }}>
          <div onClick={isMyTurn && turnPhase === 'draw' ? handleDrawDeck : undefined}
            style={{ cursor: isMyTurn && turnPhase === 'draw' ? 'pointer' : 'default', opacity: gameState?.deckCount === 0 ? 0.3 : 1, transition: 'transform 0.15s', transform: isMyTurn && turnPhase === 'draw' ? 'scale(1.05)' : 'scale(1)' }}>
            <Card faceDown />
          </div>
          <div style={{ fontSize: 11, color: '#8a9bb5', marginTop: 5 }}>{gameState?.deckCount} left</div>
          {isMyTurn && turnPhase === 'draw' && gameState?.deckCount > 0 && (
            <div style={{ fontSize: 10, color: '#c9a84c', marginTop: 2, animation: 'pulse 1.5s infinite' }}>Draw</div>
          )}
        </div>

        <div style={{ color: '#2a3f6a', fontSize: 16, fontWeight: 700 }}>or</div>

        {/* Discard */}
        <div style={{ textAlign: 'center' }}>
          <div onClick={isMyTurn && turnPhase === 'draw' && topDiscard ? handleDrawDiscard : undefined}
            style={{ cursor: isMyTurn && turnPhase === 'draw' && topDiscard ? 'pointer' : 'default', transition: 'transform 0.15s', transform: isMyTurn && turnPhase === 'draw' && topDiscard ? 'scale(1.05)' : 'scale(1)' }}>
            {topDiscard
              ? <Card card={topDiscard} />
              : <div style={{ width: 64, height: 90, borderRadius: 8, border: '2px dashed #1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3f6a', fontSize: 22 }}>+</div>
            }
          </div>
          <div style={{ fontSize: 11, color: '#8a9bb5', marginTop: 5 }}>Discard</div>
          {isMyTurn && turnPhase === 'draw' && topDiscard && (
            <div style={{ fontSize: 10, color: '#c9a84c', marginTop: 2, animation: 'pulse 1.5s infinite' }}>Take</div>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', padding: '7px 16px', flexShrink: 0,
        background: isMyTurn ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderRadius: 10, border: isMyTurn ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
      }}>
        {isMyTurn
          ? <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: 13 }}>{turnPhase === 'draw' ? 'Your turn — draw a card' : 'Tap a card to select, then Discard or Digu'}</span>
          : <span style={{ color: '#8a9bb5', fontSize: 13 }}>{currentPlayer?.name}'s turn...</span>
        }
      </div>

      {error && <div style={{ color: '#e05252', fontSize: 13, textAlign: 'center', flexShrink: 0 }}>{error}</div>}

      {/* Arc hand area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, paddingBottom: 2, flexShrink: 0 }}>
          <span style={{ color: '#8a9bb5', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Your Hand ({total})
          </span>
          <span style={{ fontSize: 10, color: '#3a4a65' }}>drag to reorder · tap to select</span>
        </div>

        {/* Arc container */}
        <div style={{
          position: 'relative',
          height: 180,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 20,
          overflowX: 'visible',
          flexShrink: 0,
        }}>
          {displayHand.map((card, i) => {
            const arcStyle = getArcTransform(i, total, selectedCard === card.id);
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
          <div style={{ display: 'flex', gap: 10, padding: '12px 0 20px', flexShrink: 0 }} className="slide-up">
            <button
              onClick={handleDiscard}
              disabled={!selectedCard || loading}
              style={{
                flex: 1, padding: '13px',
                background: selectedCard ? '#1a2235' : '#0d1520',
                border: `1.5px solid ${selectedCard ? '#4caf88' : '#1e2d45'}`,
                color: selectedCard ? '#4caf88' : '#3a4a65',
                fontWeight: 600, fontSize: 14, borderRadius: 10, transition: 'all 0.2s',
              }}
            >
              Discard
            </button>
            {diguPossible && (
              <button
                onClick={handleDigu}
                disabled={loading}
                style={{
                  flex: 1, padding: '13px',
                  background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
                  border: 'none', color: '#0a0f1e',
                  fontWeight: 700, fontSize: 14, borderRadius: 10,
                  letterSpacing: '0.05em', animation: 'glow 1.5s infinite',
                }}
              >
                🎴 Digu!
              </button>
            )}
          </div>
        )}
        {(!isMyTurn || turnPhase === 'draw') && <div style={{ height: 20 }} />}
      </div>
    </div>
  );
}
