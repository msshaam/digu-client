import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  arrayMove,
} from '@dnd-kit/sortable';
import Card from './Card';
import { findArrangedDiguDiscard, findArrangedDiguGroups, findContiguousMeldGroups } from '../utils/meldCheck';
import ModalShell from './ModalShell';
import ConfirmDialog from './ConfirmDialog';
import { OfflineIcon } from './Icons';

const MELD_HIGHLIGHTS = [
  { background: '#eaf3ff', border: '#4b8ee8', glow: 'rgba(75,142,232,0.3)' },
  { background: '#fff0f0', border: '#e05252', glow: 'rgba(224,82,82,0.28)' },
  { background: '#ecfff5', border: '#4caf88', glow: 'rgba(76,175,136,0.28)' },
  { background: '#fff8dd', border: '#c9a84c', glow: 'rgba(201,168,76,0.3)' },
];

const pillButton = { borderRadius: 999 };

function playerLabel(name, isYou = false) {
  return `${String(name || '').toUpperCase()}${isYou ? ' (YOU)' : ''}`;
}

function orderCardsByIds(cards, ids) {
  const cardMap = new Map(cards.map(card => [card.id, card]));
  const ordered = ids.map(id => cardMap.get(id)).filter(Boolean);
  const used = new Set(ordered.map(card => card.id));
  return [...ordered, ...cards.filter(card => !used.has(card.id))];
}

function getArcTransform(index, total, selected, containerWidth) {
  const layout = getArcLayout(index, total, selected, containerWidth);
  if (!layout.positionTransform && !layout.innerTransform) return {};
  return {
    transform: `${layout.positionTransform || ''} ${layout.innerTransform || ''}`.trim(),
    zIndex: layout.zIndex,
  };
}

function getArcLayout(index, total, selected, containerWidth) {
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
    positionTransform: `translateX(${xCenter}px) translateY(${arcDip}px)`,
    innerTransform: `translateY(${liftY}px) rotate(${angle}deg)`,
    zIndex: selected ? total + 10 : index,
  };
}

function getHandSlotIndex(pointerX, total, containerWidth, containerLeft = 0) {
  if (total <= 1) return 0;
  const cardW = 72;
  const cardH = 102;
  const cardDiag = Math.sqrt(cardW * cardW + cardH * cardH) / 2;
  const maxAngle = Math.min(28, total * 2.5);
  const edgeAngle = maxAngle * Math.PI / 180;
  const edgeHalf = cardDiag * Math.abs(Math.sin(edgeAngle + Math.PI / 4));
  const usable = (containerWidth || window.innerWidth) - 32 - edgeHalf * 2;
  const maxSpacing = usable / (total - 1);
  const cardSpacing = Math.min(72, Math.max(18, maxSpacing));
  const totalWidth = cardSpacing * (total - 1);
  const relativeX = pointerX - containerLeft - (containerWidth || window.innerWidth) / 2;
  const rawIndex = (relativeX + totalWidth / 2) / cardSpacing;
  return Math.max(0, Math.min(total - 1, Math.round(rawIndex)));
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
      <div style={{ fontSize: fs, fontWeight: 700, color, lineHeight: 1, alignSelf: 'flex-start', fontFamily: "'Manrope', sans-serif" }}>{card.rank}</div>
      <div style={{ fontSize: suitFs, color, lineHeight: 1 }}>{card.suit}</div>
      <div style={{ fontSize: fs, fontWeight: 700, color, lineHeight: 1, alignSelf: 'flex-end', transform: 'rotate(180deg)', fontFamily: "'Manrope', sans-serif" }}>{card.rank}</div>
    </div>
  );
}

function HandCardShell({ card, index, total, arcWidth, selected, isNew, highlight, isOverSlot, isActiveDrag, onPointerStart }) {
  const layout = getArcLayout(index, total, selected, arcWidth);
  const outerTransform = layout.positionTransform || undefined;

  return (
    <div
      onPointerDown={(event) => onPointerStart(event, card.id)}
      style={{
        position: 'absolute',
        transform: outerTransform,
        transition: isActiveDrag ? 'none' : 'transform 0.16s ease, opacity 0.1s ease',
        opacity: isActiveDrag ? 0 : 1,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        zIndex: isActiveDrag ? total + 30 : layout.zIndex,
      }}
    >
      <div style={{
        position: 'relative',
        transform: `${layout.innerTransform || ''} ${isOverSlot && !isActiveDrag ? 'translateY(-8px)' : ''}`.trim(),
        transition: isActiveDrag ? 'none' : 'transform 0.18s ease, opacity 0.15s ease',
        cursor: 'grab',
      }}>
        <Card
          card={card}
          selected={selected}
          highlight={highlight}
          onClick={undefined}
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
}

function ScoreTableModal({ players, scoreHistory, playerId, onClose }) {
  const rows = scoreHistory || [];

  return (
    <ModalShell onClose={onClose} maxWidth={520} panelStyle={{ borderRadius: 20, padding: 16 }}>
      <div style={{ textTransform: 'uppercase' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, color: '#c9a84c', fontWeight: 900 }}>Scores</h2>
          <button onClick={onClose} style={{
            background: '#1a2235',
            color: '#8a9bb5',
            border: '1px solid #1e2d45',
            borderRadius: 999,
            padding: '6px 10px',
            fontWeight: 700,
          }}>Close</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(320, 72 + players.length * 82) }}>
            <thead>
              <tr>
                <th style={{ color: '#8a9bb5', fontSize: 12, padding: '8px 6px', borderBottom: '1px solid #1e2d45', textAlign: 'left', width: 72 }} />
                {players.map(p => (
                  <th key={p.playerId} style={{ color: '#e8e0d4', fontSize: 12, padding: '8px 6px', borderBottom: '1px solid #1e2d45', textAlign: 'center' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90, margin: '0 auto' }}>
                      {playerLabel(p.name, p.playerId === playerId)}
                    </div>
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ color: '#c9a84c', fontSize: 13, fontWeight: 900, padding: '10px 6px', borderBottom: '1px solid #1e2d45', textAlign: 'left' }}>
                  Total
                </th>
                {players.map(p => (
                  <th key={`${p.playerId}-total`} style={{ color: '#c9a84c', fontSize: 18, fontWeight: 900, padding: '10px 6px', borderBottom: '1px solid #1e2d45', textAlign: 'center' }}>
                    {p.score || 0}
                  </th>
                ))}
              </tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map(row => (
                  <tr key={row.roundNumber}>
                    <td style={{ padding: '9px 6px', color: '#8a9bb5', borderBottom: '1px solid #1a2235', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      R{row.roundNumber}
                    </td>
                    {players.map(p => {
                      const score = row.scores?.find(s => s.playerId === p.playerId);
                      const value = score?.netScore;
                      return (
                        <td key={`${row.roundNumber}-${p.playerId}`} style={{ padding: '9px 6px', color: value >= 0 ? '#4caf88' : '#e05252', borderBottom: '1px solid #1a2235', textAlign: 'center', fontWeight: 700 }}>
                          {value === undefined ? '-' : `${value >= 0 ? '+' : ''}${value}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {rows.length === 0 && (
          <div style={{ color: '#3a4a65', textAlign: 'center', padding: '24px 8px', fontSize: 13 }}>
            No completed rounds yet.
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export default function GameBoard({ gameState, socket, roomCode, playerId, onLeaveConfirmed }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [handOrder, setHandOrder] = useState([]);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [confirmType, setConfirmType] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragPointer, setDragPointer] = useState(null);
  const arcRef = useRef(null);
  const dragSessionRef = useRef(null);
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
  const isHost = gameState?.hostPlayerId === playerId;
  const myPlayerData = players.find(p => p.playerId === playerId);
  const myHand = myPlayerData?.hand || [];
  const currentPlayer = players[gameState?.currentTurn];
  const isMyTurn = currentPlayer?.playerId === playerId;
  const turnPhase = gameState?.turnPhase;
  const topDiscard = gameState?.discardPile?.length > 0
    ? gameState.discardPile[gameState.discardPile.length - 1] : null;
  const canDrawDeck = isMyTurn
    && turnPhase === 'draw'
    && !loading
    && ((gameState?.deckCount || 0) > 0 || (gameState?.discardPile?.length || 0) > 0);
  const canDrawDiscard = isMyTurn && turnPhase === 'draw' && !loading && Boolean(topDiscard);
  const drawnCard = gameState?.drawnCard;
  const drawnCardSource = gameState?.drawnCardSource;
  const disconnectVote = gameState?.disconnectVote;
  const serverCards = drawnCard ? [...myHand, drawnCard] : myHand;
  const handOrderStorageKey = `digu_hand_order_${roomCode}_${playerId}`;

  useEffect(() => {
    if (serverCards.length === 0) { setHandOrder([]); return; }
    setHandOrder(prev => {
      const prevIds = prev.map(c => c.id);
      const serverIds = serverCards.map(c => c.id);
      const overlap = serverIds.filter(id => prevIds.includes(id));
      if (overlap.length > 0) return orderCardsByIds(serverCards, prevIds);

      try {
        const savedIds = JSON.parse(localStorage.getItem(handOrderStorageKey) || '[]');
        if (Array.isArray(savedIds) && savedIds.some(id => serverIds.includes(id))) {
          return orderCardsByIds(serverCards, savedIds);
        }
      } catch (e) {
        localStorage.removeItem(handOrderStorageKey);
      }

      return serverCards;
    });
  }, [myHand, drawnCard]); // eslint-disable-line

  useEffect(() => {
    if (handOrder.length === 0) return;
    localStorage.setItem(handOrderStorageKey, JSON.stringify(handOrder.map(card => card.id)));
  }, [handOrder, handOrderStorageKey]);

  const displayHand = (() => {
    if (!activeDragId || !dragOverId || activeDragId === dragOverId) return handOrder;
    const oldIndex = handOrder.findIndex(card => card.id === activeDragId);
    const newIndex = handOrder.findIndex(card => card.id === dragOverId);
    if (oldIndex === -1 || newIndex === -1) return handOrder;
    return arrayMove(handOrder, oldIndex, newIndex);
  })();
  const arrangedDigu = findArrangedDiguDiscard(displayHand);
  const cardHighlights = (() => {
    const highlights = {};
    findContiguousMeldGroups(displayHand).forEach((group, groupIndex) => {
      const style = MELD_HIGHLIGHTS[groupIndex % MELD_HIGHLIGHTS.length];
      group.cards.forEach(card => {
        highlights[card.id] = style;
      });
    });
    return highlights;
  })();

  const updateDragPreview = useCallback((clientX, clientY) => {
    if (!arcRef.current) return;
    const rect = arcRef.current.getBoundingClientRect();
    const index = getHandSlotIndex(clientX, handOrder.length, rect.width, rect.left);
    const card = handOrder[index];
    setDragPointer({ x: clientX, y: clientY });
    if (card) setDragOverId(card.id);
  }, [handOrder]);

  const handlePointerStart = useCallback((event, cardId) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    dragSessionRef.current = {
      cardId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  }, []);

  useEffect(() => {
    const handleMove = (event) => {
      const session = dragSessionRef.current;
      if (!session) return;
      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (!session.active && distance < 7) return;
      event.preventDefault();
      if (!session.active) {
        session.active = true;
        setActiveDragId(session.cardId);
        setDragOverId(session.cardId);
      }
      updateDragPreview(event.clientX, event.clientY);
    };

    const handleEnd = (event) => {
      const session = dragSessionRef.current;
      if (!session) return;
      dragSessionRef.current = null;

      if (!session.active) {
        if (isMyTurn && turnPhase === 'discard') {
          setSelectedCard(prev => session.cardId === prev ? null : session.cardId);
        }
        return;
      }

      event.preventDefault();
      const finalOverId = dragOverId;
      const activeId = session.cardId;
      setActiveDragId(null);
      setDragOverId(null);
      setDragPointer(null);

      if (!finalOverId || activeId === finalOverId) return;
      setHandOrder(prev => {
        const oldIndex = prev.findIndex(card => card.id === activeId);
        const newIndex = prev.findIndex(card => card.id === finalOverId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    };

    window.addEventListener('pointermove', handleMove, { passive: false });
    window.addEventListener('pointerup', handleEnd, { passive: false });
    window.addEventListener('pointercancel', handleEnd, { passive: false });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
      window.removeEventListener('pointercancel', handleEnd);
    };
  }, [dragOverId, isMyTurn, turnPhase, updateDragPreview]);

  useEffect(() => {
    if (arcRef.current) setArcWidth(arcRef.current.offsetWidth);
  }, [displayHand.length]); // eslint-disable-line

  const diguPossible = (() => {
    if (!isMyTurn || turnPhase !== 'discard') return false;
    if (selectedCard) {
      return Boolean(findArrangedDiguGroups(displayHand.filter(c => c.id !== selectedCard)));
    }
    return Boolean(arrangedDigu?.discardCard);
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

  const handleLeave = () => {
    setConfirmType('leave');
  };

  const handleLeaveConfirmed = () => {
    setConfirmType(null);
    socket.emit('leaveRoom', { roomCode }, (res) => {
      if (!res.success) setError(res.error);
      else if (onLeaveConfirmed) onLeaveConfirmed();
      else {
        localStorage.removeItem('digu_session');
        window.location.reload();
      }
    });
  };

  const handleEndGameConfirmed = () => {
    setConfirmType(null);
    doAction('endCurrentGame', {});
  };

  const handleDrawDeck = () => {
    if (!canDrawDeck) return;
    doAction('drawFromDeck', {}, (res) => setSelectedCard(res.card?.id));
  };
  const handleDrawDiscard = () => {
    if (!canDrawDiscard) return;
    doAction('drawFromDiscard', {}, (res) => setSelectedCard(res.card?.id));
  };
  const handleDiscard = () => {
    if (!selectedCard) return setError('Select a card to discard.');
    doAction('discardCard', { cardId: selectedCard, isDiguDiscard: false });
  };
  const handlePutBack = () => {
    doAction('putBackDiscard', {});
  };
  const handleDigu = () => {
    const cardId = arrangedDigu?.discardCard?.id || selectedCard;
    if (!cardId || !diguPossible) {
      setError('Arrange a winning hand or select the extra card.');
      return;
    }
    doAction('discardCard', { cardId, isDiguDiscard: true });
  };

  const dealerName = players[gameState?.dealerIndex]?.name;
  const total = displayHand.length;
  const activeDragCard = activeDragId ? handOrder.find(card => card.id === activeDragId) : null;

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
      textTransform: 'uppercase',
    }}>

      {/* Top bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#c9a84c', lineHeight: 1 }}>Digu</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setScoresOpen(true)} style={{
              padding: '6px 10px',
              background: '#1a2235',
              border: '1px solid #1e2d45',
              color: '#c9a84c',
              fontWeight: 700,
              fontSize: 11,
              ...pillButton,
            }}>Scores</button>
            <button onClick={handleLeave} disabled={loading} style={{
              padding: '6px 10px',
              background: 'transparent',
              border: '1px solid #1e2d45',
              color: '#8a9bb5',
              fontWeight: 600,
              fontSize: 11,
              ...pillButton,
            }}>Leave</button>
            {isHost && (
              <button onClick={() => setConfirmType('endGame')} disabled={loading} style={{
                padding: '6px 10px',
                background: 'transparent',
                border: '1px solid rgba(224,82,82,0.38)',
                color: '#e05252',
                fontWeight: 700,
                fontSize: 11,
                ...pillButton,
              }}>End Game</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11, color: '#8a9bb5', textAlign: 'left', lineHeight: 1.25 }}>
            Dealer: <span style={{ color: '#e8e0d4', fontWeight: 600 }}>{playerLabel(dealerName)}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8a9bb5', textAlign: 'right', lineHeight: 1.25 }}>
            Room: <span style={{ color: '#e8e0d4', fontWeight: 600 }}>{roomCode}</span>
          </div>
        </div>
      </div>

      {/* Players */}
      {players.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, marginTop: 4 }}>
          {players.map((p) => {
            const isActive = p.playerId === currentPlayer?.playerId;
            const isYou = p.playerId === playerId;
            return (
              <div key={p.playerId} style={{
                background: isActive ? 'rgba(201,168,76,0.1)' : '#111827',
                border: `1.5px solid ${isActive ? 'rgba(201,168,76,0.5)' : '#1e2d45'}`,
                borderRadius: 999,
                padding: '6px 10px',
                flex: '1 1 92px',
                minWidth: 0,
                animation: isActive ? 'glow 2s infinite' : undefined,
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isActive ? '#c9a84c' : '#8a9bb5',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {playerLabel(p.name, isYou)}
                  </span>
                  {!p.connected && <OfflineIcon />}
                </div>
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
          onClick={canDrawDeck ? handleDrawDeck : undefined}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: canDrawDeck ? 'pointer' : 'default',
            opacity: canDrawDeck ? 1 : 0.3,
            padding: '4px 0',
          }}
        >
          <div style={{
            transform: canDrawDeck ? 'translateY(-4px)' : 'none',
            transition: 'transform 0.15s',
          }}>
            <FaceDownCard width={tableCardW} />
          </div>
          <div style={{ fontSize: 12, color: '#8a9bb5' }}>{gameState?.deckCount} cards</div>
          {canDrawDeck && (
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
          onClick={canDrawDiscard ? handleDrawDiscard : undefined}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: canDrawDiscard ? 'pointer' : 'default',
            padding: '4px 0',
          }}
        >
          <div style={{
            transform: canDrawDiscard ? 'translateY(-4px)' : 'none',
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
          {canDrawDiscard && (
            <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>Tap to take</div>
          )}
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: 'center', padding: '6px 12px', flexShrink: 0,
        background: isMyTurn ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderRadius: 999, border: isMyTurn ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
      }}>
        {isMyTurn
          ? <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: 12 }}>
              {turnPhase === 'draw' ? 'Your turn — draw a card' : 'Tap a card to select, then Discard or Digu'}
            </span>
          : <span style={{ color: '#8a9bb5', fontSize: 12 }}>{playerLabel(currentPlayer?.name)}'s turn...</span>
        }
      </div>

      {error && (
        <div style={{ color: '#e05252', fontSize: 12, textAlign: 'center', flexShrink: 0 }}>{error}</div>
      )}

      {disconnectVote?.eligible && (
        <div style={{
          background: 'rgba(224,82,82,0.08)',
          border: '1px solid rgba(224,82,82,0.35)',
          borderRadius: 10,
          padding: 10,
          flexShrink: 0,
        }}>
          <div style={{ color: '#e8e0d4', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            {disconnectVote.disconnectedPlayers.map(p => playerLabel(p.name)).join(', ')} disconnected for 5+ minutes.
          </div>
          {disconnectVote.mode === 'vote' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => doAction('voteEndGame', { vote: 'yes' })} disabled={loading} style={{
                flex: 1,
                padding: 8,
                ...pillButton,
                border: 'none',
                background: '#4caf88',
                color: '#0a0f1e',
                fontWeight: 700,
                fontSize: 12,
              }}>
                End Game ({disconnectVote.yesVotes}/{disconnectVote.threshold})
              </button>
              <button onClick={() => doAction('voteEndGame', { vote: 'no' })} disabled={loading} style={{
                flex: 1,
                padding: 8,
                ...pillButton,
                border: '1px solid #1e2d45',
                background: '#1a2235',
                color: '#8a9bb5',
                fontWeight: 600,
                fontSize: 12,
              }}>
                Keep Waiting
              </button>
            </div>
          ) : (
            <button onClick={() => doAction('voteEndGame', { vote: 'yes' })} disabled={loading} style={{
              width: '100%',
              padding: 8,
              ...pillButton,
              border: 'none',
              background: '#e05252',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
            }}>
              End and go back to Home
            </button>
          )}
        </div>
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
          marginBottom: isMyTurn && turnPhase === 'discard' ? 14 : 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 26,
          overflowX: 'hidden',
          overflow: 'hidden',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'none',
          flexShrink: 0,
          width: '100%',
        }}>
          {displayHand.map((card, i) => (
            <HandCardShell
              key={card.id}
              card={card}
              index={i}
              total={total}
              arcWidth={arcWidth}
              selected={selectedCard === card.id}
              isNew={drawnCard && card.id === drawnCard.id}
              onPointerStart={handlePointerStart}
              highlight={cardHighlights[card.id]}
              isActiveDrag={activeDragId === card.id}
              isOverSlot={activeDragId && dragOverId === card.id && activeDragId !== card.id}
            />
          ))}
          {activeDragCard && dragPointer && (
            <div style={{
              position: 'fixed',
              left: dragPointer.x,
              top: dragPointer.y,
              transform: 'translate(-50%, -60%)',
              zIndex: 3000,
              pointerEvents: 'none',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              filter: 'drop-shadow(0 14px 24px rgba(0,0,0,0.45))',
            }}>
              <Card
                card={activeDragCard}
                selected={selectedCard === activeDragCard.id}
                highlight={cardHighlights[activeDragCard.id]}
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isMyTurn && turnPhase === 'discard' && (
          <div style={{ display: 'flex', gap: 8, paddingBottom: 8, flexShrink: 0 }} className="slide-up">
            <button onClick={handleDiscard} disabled={!selectedCard || loading} style={{
              flex: 1, padding: '12px',
              background: selectedCard ? '#1a2235' : '#0d1520',
              border: `1.5px solid ${selectedCard ? '#4caf88' : '#1e2d45'}`,
              color: selectedCard ? '#4caf88' : '#3a4a65',
              fontWeight: 600, fontSize: 14, ...pillButton, transition: 'all 0.2s',
            }}>Discard</button>
            {drawnCardSource === 'discard' && (
              <button onClick={handlePutBack} disabled={loading} style={{
                flex: 1,
                padding: '12px',
                background: '#1a2235',
                border: '1.5px solid #1e2d45',
                color: '#8a9bb5',
                fontWeight: 600,
                fontSize: 14,
                ...pillButton,
              }}>Put Back</button>
            )}
            {diguPossible && (
              <button onClick={handleDigu} disabled={loading} style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
                border: 'none', color: '#0a0f1e',
                fontWeight: 700, fontSize: 14, ...pillButton,
                letterSpacing: '0.05em', animation: 'glow 1.5s infinite',
              }}>🎴 Digu!</button>
            )}
          </div>
        )}
        {(!isMyTurn || turnPhase === 'draw') && <div style={{ height: 8 }} />}
      </div>

      {scoresOpen && (
        <ScoreTableModal
          players={players}
          scoreHistory={gameState?.scoreHistory || []}
          playerId={playerId}
          onClose={() => setScoresOpen(false)}
        />
      )}
      {confirmType === 'leave' && (
        <ConfirmDialog
          title="Leave this game?"
          message="This will forfeit the current game for you."
          confirmLabel="Leave Game"
          confirmTone="danger"
          onConfirm={handleLeaveConfirmed}
          onCancel={() => setConfirmType(null)}
        />
      )}
      {confirmType === 'endGame' && (
        <ConfirmDialog
          title="End the current game?"
          message="Are you sure you want to end the current game?"
          confirmLabel="End Game"
          confirmTone="danger"
          onConfirm={handleEndGameConfirmed}
          onCancel={() => setConfirmType(null)}
        />
      )}
    </div>
  );
}
