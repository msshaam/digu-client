import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import { canDeclareDigu } from '../utils/meldCheck';

export default function GameBoard({ gameState, socket, roomCode, playerId }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [handOrder, setHandOrder] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const players = gameState?.players || [];
  const myPlayerData = players.find(p => p.id === playerId);
  const myHand = myPlayerData?.hand || [];
  const currentPlayer = players[gameState?.currentTurn];
  const isMyTurn = currentPlayer?.id === playerId;
  const turnPhase = gameState?.turnPhase;
  const topDiscard = gameState?.discardPile?.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;
  const drawnCard = gameState?.drawnCard;

  // Build the canonical server card list (hand + drawn card if present)
  const serverCards = drawnCard ? [...myHand, drawnCard] : myHand;

  // Sync handOrder:
  // - On initial load or after a round resets, replace entirely
  // - During play, preserve local order and only append new cards
  useEffect(() => {
    if (serverCards.length === 0) {
      setHandOrder([]);
      return;
    }
    setHandOrder(prev => {
      const prevIds = prev.map(c => c.id);
      const serverIds = serverCards.map(c => c.id);
      // If none of the server cards exist in prev, this is a fresh deal — reset order
      const overlap = serverIds.filter(id => prevIds.includes(id));
      if (overlap.length === 0) {
        return serverCards;
      }
      // Otherwise preserve local order, remove discarded cards, append new ones
      const kept = prev.filter(c => serverIds.includes(c.id));
      const added = serverCards.filter(c => !prevIds.includes(c.id));
      return [...kept, ...added];
    });
  }, [myHand, drawnCard]); // eslint-disable-line

  // Apply real-time drag reorder visually
  const displayHand = (() => {
    if (dragIndex === null || dragOverIndex === null || dragIndex === dragOverIndex) {
      return handOrder;
    }
    const reordered = [...handOrder];
    const dragged = reordered[dragIndex];
    reordered.splice(dragIndex, 1);
    reordered.splice(dragOverIndex, 0, dragged);
    return reordered;
  })();

  const diguPossible = (() => {
    if (!isMyTurn || turnPhase !== 'discard' || !selectedCard) return false;
    const handAfterDiscard = displayHand.filter(c => c.id !== selectedCard);
    return canDeclareDigu(handAfterDiscard);
  })();

  useEffect(() => {
    setSelectedCard(null);
    setError('');
  }, [gameState?.currentTurn, turnPhase]);

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

  // Drag handlers — update dragOverIndex in real time for live preview
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image so the card itself shows the movement
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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

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

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const otherPlayers = players.filter(p => p.id !== playerId);
  const dealerName = players[gameState?.dealerIndex]?.name;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #0f1f3d 0%, #0a0f1e 60%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 16px 24px',
      gap: 12,
      overflowY: 'auto',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#c9a84c' }}>Digu</h1>
        <div style={{ fontSize: 12, color: '#8a9bb5', textAlign: 'right' }}>
          <div>Dealer: <span style={{ color: '#e8e0d4' }}>{dealerName}</span></div>
          <div style={{ color: '#3a4a65', fontSize: 11 }}>Room: {roomCode}</div>
        </div>
      </div>

      {/* Other players */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {otherPlayers.map((p) => {
          const isActive = p.id === currentPlayer?.id;
          return (
            <div key={p.id} style={{
              background: isActive ? 'rgba(201,168,76,0.1)' : '#111827',
              border: `1.5px solid ${isActive ? 'rgba(201,168,76,0.5)' : '#1e2d45'}`,
              borderRadius: 12,
              padding: '10px 14px',
              minWidth: 100,
              flexShrink: 0,
              animation: isActive ? 'glow 2s infinite' : undefined,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#c9a84c' : '#8a9bb5', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name} {!p.connected && '(offline)'}
                {isActive && <span style={{ marginLeft: 4 }}>●</span>}
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: p.cardCount }).map((_, ci) => (
                  <Card key={ci} faceDown small style={{ width: 22, height: 32 }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#3a4a65', marginTop: 4 }}>Score: {p.score}</div>
            </div>
          );
        })}
      </div>

      {/* Center table */}
      <div style={{
        background: 'linear-gradient(145deg, #0d1b33 0%, #0a1525 100%)',
        border: '1px solid #1e2d45',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div onClick={isMyTurn && turnPhase === 'draw' ? handleDrawDeck : undefined}
            style={{ cursor: isMyTurn && turnPhase === 'draw' ? 'pointer' : 'default', opacity: gameState?.deckCount === 0 ? 0.3 : 1 }}>
            <Card faceDown />
          </div>
          <div style={{ fontSize: 11, color: '#8a9bb5', marginTop: 6 }}>{gameState?.deckCount} cards</div>
          {isMyTurn && turnPhase === 'draw' && gameState?.deckCount > 0 && (
            <div style={{ fontSize: 10, color: '#c9a84c', marginTop: 2, animation: 'pulse 1.5s infinite' }}>Tap to draw</div>
          )}
        </div>

        <div style={{ color: '#2a3f6a', fontSize: 18, fontWeight: 700 }}>or</div>

        <div style={{ textAlign: 'center' }}>
          <div onClick={isMyTurn && turnPhase === 'draw' && topDiscard ? handleDrawDiscard : undefined}
            style={{ cursor: isMyTurn && turnPhase === 'draw' && topDiscard ? 'pointer' : 'default' }}>
            {topDiscard
              ? <Card card={topDiscard} />
              : <div style={{ width: 64, height: 90, borderRadius: 8, border: '2px dashed #1e2d45', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a3f6a', fontSize: 22 }}>+</div>
            }
          </div>
          <div style={{ fontSize: 11, color: '#8a9bb5', marginTop: 6 }}>Discard</div>
          {isMyTurn && turnPhase === 'draw' && topDiscard && (
            <div style={{ fontSize: 10, color: '#c9a84c', marginTop: 2, animation: 'pulse 1.5s infinite' }}>Tap to take</div>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', padding: '8px 16px',
        background: isMyTurn ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderRadius: 10,
        border: isMyTurn ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
      }}>
        {isMyTurn
          ? <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: 14 }}>{turnPhase === 'draw' ? 'Your turn — draw a card' : 'Select a card to discard'}</span>
          : <span style={{ color: '#8a9bb5', fontSize: 13 }}>{currentPlayer?.name}'s turn...</span>
        }
      </div>

      {error && <div style={{ color: '#e05252', fontSize: 13, textAlign: 'center', padding: '4px 0' }}>{error}</div>}

      {/* My hand */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ color: '#8a9bb5', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Your Hand ({displayHand.length} cards)
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#3a4a65' }}>drag to reorder</span>
            <span style={{ fontSize: 11, color: '#3a4a65' }}>Score: {myPlayerData?.score || 0}</span>
          </div>
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px',
          background: '#0d1520', borderRadius: 14, border: '1px solid #1e2d45', minHeight: 110,
        }}>
          {displayHand.map((card, i) => {
            const isDrawn = drawnCard && card.id === drawnCard.id;
            const isDragging = dragIndex === i;
            const isOver = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
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
                  position: 'relative',
                  cursor: 'grab',
                  opacity: isDragging ? 0.3 : 1,
                  transform: isOver ? 'translateX(6px)' : 'translateX(0)',
                  transition: 'transform 0.1s ease, opacity 0.1s ease',
                }}
              >
                <Card
                  card={card}
                  selected={selectedCard === card.id}
                  onClick={isMyTurn && turnPhase === 'discard' ? () => handleCardClick(card.id) : undefined}
                />
                {isDrawn && (
                  <div style={{
                    position: 'absolute', top: -6, right: -4,
                    background: '#c9a84c', color: '#0a0f1e',
                    fontSize: 9, fontWeight: 700, padding: '1px 5px',
                    borderRadius: 4, letterSpacing: '0.05em', pointerEvents: 'none',
                  }}>NEW</div>
                )}
              </div>
            );
          })}
          {displayHand.length === 0 && (
            <div style={{ color: '#3a4a65', fontSize: 13, margin: 'auto' }}>No cards</div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isMyTurn && turnPhase === 'discard' && (
        <div style={{ display: 'flex', gap: 10 }} className="slide-up">
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
    </div>
  );
}
