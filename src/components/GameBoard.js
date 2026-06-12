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

function playerScoreLabel(player, isYou = false) {
  return `${playerLabel(player?.name, isYou)} - ${player?.score || 0}`;
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
  const pad = Math.round(width * 0.08);
  const navy = '#17256c';
  const cream = '#f8f4ec';
  return (
    <div style={{
      width, height: h, borderRadius: Math.round(width * 0.13),
      background: cream,
      border: `2px solid ${navy}`,
      boxShadow: '0 8px 22px rgba(0,0,0,0.34)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      padding: pad,
    }}>
      <div style={{
        position: 'absolute',
        inset: pad,
        border: `${Math.max(1, Math.round(width * 0.025))}px solid ${navy}`,
        borderRadius: Math.round(width * 0.08),
        background: `
          linear-gradient(45deg, transparent 42%, ${cream} 43%, ${cream} 57%, transparent 58%) 0 0 / ${Math.round(width * 0.18)}px ${Math.round(width * 0.18)}px,
          linear-gradient(-45deg, transparent 42%, ${cream} 43%, ${cream} 57%, transparent 58%) 0 0 / ${Math.round(width * 0.18)}px ${Math.round(width * 0.18)}px,
          ${navy}
        `,
      }} />
      <div style={{
        position: 'absolute',
        inset: Math.round(width * 0.17),
        background: cream,
        borderRadius: Math.round(width * 0.05),
        border: `${Math.max(1, Math.round(width * 0.018))}px solid ${navy}`,
      }} />
      <svg
        viewBox="0 0 100 140"
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', inset: pad + Math.round(width * 0.08), width: `calc(100% - ${2 * (pad + Math.round(width * 0.08))}px)`, height: `calc(100% - ${2 * (pad + Math.round(width * 0.08))}px)` }}
      >
        <rect x="6" y="6" width="88" height="128" rx="5" fill={navy} />
        <rect x="12" y="12" width="76" height="116" rx="3" fill={cream} />
        <g fill={navy}>
          <path d="M50 30 C35 12 18 22 22 42 C24 54 36 60 50 72 C64 60 76 54 78 42 C82 22 65 12 50 30Z" />
          <path d="M50 110 C35 128 18 118 22 98 C24 86 36 80 50 68 C64 80 76 86 78 98 C82 118 65 128 50 110Z" />
          <path d="M28 70 C16 56 18 38 36 30 C29 43 34 56 50 70 C34 84 29 97 36 110 C18 102 16 84 28 70Z" />
          <path d="M72 70 C84 56 82 38 64 30 C71 43 66 56 50 70 C66 84 71 97 64 110 C82 102 84 84 72 70Z" />
          <path d="M50 44 C56 55 66 62 79 65 C66 68 56 75 50 96 C44 75 34 68 21 65 C34 62 44 55 50 44Z" />
          <circle cx="50" cy="70" r="9" fill={cream} />
          <circle cx="50" cy="70" r="5" fill={navy} />
          <circle cx="50" cy="70" r="2" fill={cream} />
          <path d="M18 18 H82 V24 H18Z M18 116 H82 V122 H18Z" />
          <path d="M18 28 H24 V112 H18Z M76 28 H82 V112 H76Z" />
        </g>
      </svg>
    </div>
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
  const highestTotal = Math.max(...players.map(p => p.score || 0), 0);
  const diguCounts = players.reduce((counts, player) => {
    counts[player.playerId] = rows.filter(row => row.winnerPlayerId === player.playerId).length;
    return counts;
  }, {});

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
                    {highestTotal > 0 && (p.score || 0) === highestTotal && (
                      <span style={{ marginLeft: 4 }}>👑</span>
                    )}
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
                      const calledDigu = row.winnerPlayerId === p.playerId;
                      return (
                        <td key={`${row.roundNumber}-${p.playerId}`} style={{ padding: '9px 6px', color: value >= 0 ? '#4caf88' : '#e05252', borderBottom: '1px solid #1a2235', textAlign: 'center', fontWeight: 700 }}>
                          {value === undefined ? '-' : `${value >= 0 ? '+' : ''}${value}`}
                          {calledDigu && <span style={{ marginLeft: 4, color: '#c9a84c' }}>⭐</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            )}
            <tfoot>
              <tr>
                <th style={{ color: '#8a9bb5', fontSize: 12, fontWeight: 900, padding: '11px 6px 6px', borderTop: '1px solid #1e2d45', textAlign: 'left', whiteSpace: 'nowrap' }}>
                  Total Digu
                </th>
                {players.map(p => (
                  <th key={`${p.playerId}-digu-total`} style={{ color: '#c9a84c', fontSize: 15, fontWeight: 900, padding: '11px 6px 6px', borderTop: '1px solid #1e2d45', textAlign: 'center' }}>
                    {diguCounts[p.playerId] || 0}
                  </th>
                ))}
              </tr>
            </tfoot>
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
  const [useTouchControls, setUseTouchControls] = useState(false);
  const [flyCard, setFlyCard] = useState(null);
  const arcRef = useRef(null);
  const deckRef = useRef(null);
  const discardRef = useRef(null);
  const dragSessionRef = useRef(null);
  const lastActionIdRef = useRef(null);
  const [arcWidth, setArcWidth] = useState(window.innerWidth);

  useEffect(() => {
    const media = window.matchMedia?.('(hover: none), (pointer: coarse)');
    const update = () => setUseTouchControls(Boolean(media?.matches));
    update();
    media?.addEventListener?.('change', update);
    return () => media?.removeEventListener?.('change', update);
  }, []);

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
  const isOpeningDiscard = drawnCardSource === 'opening';
  const disconnectVote = gameState?.disconnectVote;
  const serverCards = drawnCard ? [...myHand, drawnCard] : myHand;
  const handOrderStorageKey = `digu_hand_order_${roomCode}_${playerId}`;

  const getElementCenter = useCallback((ref, fallbackX, fallbackY) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return { x: fallbackX, y: fallbackY };
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const getHandCardCenter = useCallback((cardId, cards = handOrder) => {
    const rect = arcRef.current?.getBoundingClientRect();
    const index = cards.findIndex(card => card.id === cardId);
    if (!rect || index === -1) return { x: window.innerWidth / 2, y: window.innerHeight - 110 };

    const layout = getArcLayout(index, cards.length, false, rect.width);
    const xMatch = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(layout.positionTransform || '');
    const yMatch = /translateY\((-?\d+(?:\.\d+)?)px\)/.exec(layout.positionTransform || '');
    const xOffset = xMatch ? Number(xMatch[1]) : 0;
    const yOffset = yMatch ? Number(yMatch[1]) : 0;
    const cardW = 64;
    const cardH = 90;

    return {
      x: rect.left + rect.width / 2 + xOffset + cardW / 2,
      y: rect.bottom - 26 + yOffset - cardH / 2,
    };
  }, [handOrder]);

  const animateCardMotion = useCallback(({ card, faceDown = false, from, to, duration = 420 }) => {
    setFlyCard({ card, faceDown, from, to, createdAt: Date.now() });
    window.setTimeout(() => {
      setFlyCard(current => (current?.from === from && current?.to === to ? null : current));
    }, duration);
  }, []);

  const doAction = useCallback((emitEvent, payload, cb) => {
    setLoading(true);
    socket.emit(emitEvent, { roomCode, ...payload }, (res) => {
      setLoading(false);
      if (!res.success) setError(res.error);
      else { setError(''); if (cb) cb(res); }
    });
  }, [roomCode, socket]);

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

  useEffect(() => {
    const action = gameState?.lastAction;
    if (!action?.id || action.id === lastActionIdRef.current) return;
    lastActionIdRef.current = action.id;

    const tableCenter = { x: window.innerWidth / 2, y: Math.max(120, window.innerHeight * 0.32) };
    const deckCenter = getElementCenter(deckRef, window.innerWidth * 0.25, tableCenter.y);
    const discardCenter = getElementCenter(discardRef, window.innerWidth * 0.75, tableCenter.y);
    const sideTarget = action.source === 'discard'
      ? { x: window.innerWidth - 42, y: tableCenter.y }
      : { x: 42, y: tableCenter.y };

    if (action.type === 'draw') {
      const isActor = action.playerId === playerId;
      const from = action.source === 'discard' ? discardCenter : deckCenter;
      const drawTargetHand = isActor && drawnCard && !displayHand.some(card => card.id === drawnCard.id)
        ? [...displayHand, drawnCard]
        : displayHand;
      const to = isActor && drawnCard
        ? getHandCardCenter(drawnCard.id, drawTargetHand)
        : sideTarget;
      animateCardMotion({
        card: isActor ? drawnCard : action.card,
        faceDown: action.source === 'deck' || !action.card,
        from,
        to,
      });
    }

    if (action.type === 'discard' || action.type === 'putBack') {
      const from = action.playerId === playerId && action.card
        ? getHandCardCenter(action.card.id, [...displayHand, action.card])
        : sideTarget;
      const discardTarget = action.destination === 'deck' ? deckCenter : discardCenter;
      animateCardMotion({
        card: action.card,
        faceDown: action.destination === 'deck',
        from,
        to: discardTarget,
      });
    }
  }, [animateCardMotion, displayHand, drawnCard, gameState?.lastAction, getElementCenter, getHandCardCenter, playerId]);

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
      const rect = arcRef.current?.getBoundingClientRect();
      const thrownTowardTable = Boolean(rect)
        && isMyTurn
        && turnPhase === 'discard'
        && (session.startY - event.clientY > 80 || event.clientY < rect.top + rect.height * 0.3);
      setActiveDragId(null);
      setDragOverId(null);
      setDragPointer(null);

      if (thrownTowardTable) {
        const from = { x: event.clientX, y: event.clientY };
        const shouldReturnToDeck = players.length === 5 && drawnCardSource === 'deck';
        const targetRef = shouldReturnToDeck ? deckRef : discardRef;
        const targetX = shouldReturnToDeck ? window.innerWidth * 0.25 : window.innerWidth * 0.75;
        const to = getElementCenter(targetRef, targetX, Math.max(120, window.innerHeight * 0.32));
        const thrownCard = handOrder.find(card => card.id === activeId);

        if (drawnCardSource === 'discard' && drawnCard?.id === activeId) {
          animateCardMotion({ card: thrownCard || drawnCard, from, to, faceDown: false });
          doAction('putBackDiscard', {});
        } else {
          animateCardMotion({ card: thrownCard, from, to, faceDown: shouldReturnToDeck });
          doAction('discardCard', { cardId: activeId, isDiguDiscard: false });
        }
        return;
      }

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
  }, [animateCardMotion, doAction, dragOverId, drawnCard, drawnCardSource, getElementCenter, handOrder, isMyTurn, players.length, turnPhase, updateDragPreview]);

  useEffect(() => {
    if (arcRef.current) setArcWidth(arcRef.current.offsetWidth);
  }, [displayHand.length]); // eslint-disable-line

  const diguPossible = (() => {
    if (!isMyTurn || turnPhase !== 'discard') return false;
    if (isOpeningDiscard) return false;
    if (selectedCard) {
      return Boolean(findArrangedDiguGroups(displayHand.filter(c => c.id !== selectedCard)));
    }
    return Boolean(arrangedDigu?.discardCard);
  })();

  useEffect(() => { setSelectedCard(null); setError(''); }, [gameState?.currentTurn, turnPhase]);

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
                    {playerScoreLabel(p, isYou)}
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
          ref={deckRef}
          className="tap-clean"
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
          ref={discardRef}
          className="tap-clean"
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
        animation: isMyTurn ? 'glow 2s infinite' : undefined,
      }}>
        {isMyTurn
          ? <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: 12 }}>
              {turnPhase === 'draw'
                ? 'Your Turn - Draw A Card'
                : isOpeningDiscard
                  ? 'Your Turn - Discard The Extra Card'
                  : useTouchControls
                    ? 'Your Turn - Throw A Card Or Digu'
                    : 'Tap A Card To Select, Then Discard Or Digu'}
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
          marginTop: 8,
          flexShrink: 0,
        }}>
          <div style={{ color: '#e8e0d4', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            {disconnectVote.disconnectedPlayers.map(p => playerLabel(p.name)).join(', ')} HAS BEEN DISCONNECTED FOR MORE THAN 5 MINUTES.
          </div>
          <div style={{ color: '#8a9bb5', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
            DO YOU WANT TO END THE GAME? {disconnectVote.mode === 'vote' ? `${disconnectVote.votedCount || 0}/${disconnectVote.totalVoters || disconnectVote.connectedCount || 0} VOTED` : ''}
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
                boxShadow: disconnectVote.myVote === 'yes' ? '0 0 0 2px rgba(232,224,212,0.35) inset' : undefined,
              }}>
                YES ({disconnectVote.yesVotes || 0})
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
                boxShadow: disconnectVote.myVote === 'no' ? '0 0 0 2px rgba(232,224,212,0.28) inset' : undefined,
              }}>
                NO ({disconnectVote.noVotes || 0})
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
              END AND GO BACK TO HOME
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
          marginBottom: !useTouchControls && isMyTurn && turnPhase === 'discard' ? 14 : 0,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: useTouchControls && isMyTurn && turnPhase === 'discard' && diguPossible ? 46 : 26,
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
        {useTouchControls && isMyTurn && turnPhase === 'discard' && diguPossible && (
          <div style={{ paddingBottom: 8, flexShrink: 0 }} className="slide-up">
            <button onClick={handleDigu} disabled={loading} style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #c9a84c, #e8c96a)',
              border: 'none',
              color: '#0a0f1e',
              fontWeight: 800,
              fontSize: 14,
              ...pillButton,
              letterSpacing: '0.05em',
              animation: 'glow 1.5s infinite',
            }}>DIGU!</button>
          </div>
        )}
        {!useTouchControls && isMyTurn && turnPhase === 'discard' && (
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
              }}>DIGU!</button>
            )}
          </div>
        )}
        {(!isMyTurn || turnPhase === 'draw') && <div style={{ height: 8 }} />}
      </div>

      {flyCard && (
        <div style={{
          position: 'fixed',
          left: flyCard.from.x,
          top: flyCard.from.y,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 5000,
          animation: 'flyCard 0.42s cubic-bezier(0.22, 0.78, 0.28, 1) forwards',
          '--fly-x': `${flyCard.to.x - flyCard.from.x}px`,
          '--fly-y': `${flyCard.to.y - flyCard.from.y}px`,
        }}>
          {flyCard.faceDown
            ? <FaceDownCard width={54} />
            : flyCard.card && <Card card={flyCard.card} />
          }
        </div>
      )}

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
