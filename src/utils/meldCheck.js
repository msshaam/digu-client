const RANK_ORDER = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

function hasAce(cards) {
  return cards.some(card => card.rank === 'A');
}

function isRun(cards) {
  if (cards.length < 3) return false;
  if (hasAce(cards)) return false;
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  for (let i = 1; i < sorted.length; i++) {
    if (RANK_ORDER[sorted[i].rank] !== RANK_ORDER[sorted[i - 1].rank] + 1) return false;
  }
  return true;
}

function isOrderedRun(cards) {
  if (cards.length < 3) return false;
  if (hasAce(cards)) return false;
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  const step = RANK_ORDER[cards[1].rank] - RANK_ORDER[cards[0].rank];
  if (Math.abs(step) !== 1) return false;
  for (let i = 1; i < cards.length; i++) {
    if (RANK_ORDER[cards[i].rank] !== RANK_ORDER[cards[i - 1].rank] + step) return false;
  }
  return true;
}

function cardValue(card) {
  if (card.rank === 'A') return 15;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function meldValue(cards) {
  return cards.reduce((sum, card) => sum + cardValue(card), 0);
}

function isSet(cards) {
  if (cards.length < 3) return false;
  const rank = cards[0].rank;
  if (!cards.every(c => c.rank === rank)) return false;
  const suits = cards.map(c => c.suit);
  return new Set(suits).size === suits.length;
}

export function isMeld(cards) {
  return isRun(cards) || isSet(cards);
}

export function isOrderedMeld(cards) {
  return isOrderedRun(cards) || isSet(cards);
}

export function canDeclareDigu(hand) {
  if (hand.length !== 10) return false;

  function combinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [first, ...rest] = arr;
    return [
      ...combinations(rest, k - 1).map(c => [first, ...c]),
      ...combinations(rest, k)
    ];
  }

  const indices = hand.map((_, i) => i);
  const threes1 = combinations(indices, 3);

  for (const g1 of threes1) {
    if (!isMeld(g1.map(i => hand[i]))) continue;
    const remaining1 = indices.filter(i => !g1.includes(i));
    const threes2 = combinations(remaining1, 3);
    for (const g2 of threes2) {
      if (!isMeld(g2.map(i => hand[i]))) continue;
      const g3 = remaining1.filter(i => !g2.includes(i));
      if (g3.length === 4 && isMeld(g3.map(i => hand[i]))) return true;
    }
  }
  return false;
}

export function findArrangedDiguGroups(hand) {
  if (hand.length !== 10) return null;

  const layouts = [
    [3, 3, 4],
    [3, 4, 3],
    [4, 3, 3],
  ];

  let best = null;

  for (const layout of layouts) {
    let offset = 0;
    const groups = layout.map(size => {
      const group = hand.slice(offset, offset + size);
      offset += size;
      return group;
    });

    if (groups.every(group => isOrderedMeld(group))) {
      const meldPoints = groups.reduce((sum, group) => sum + meldValue(group), 0);
      if (!best || meldPoints > best.meldPoints) {
        best = { groups, layout, meldPoints };
      }
    }
  }

  return best;
}

export function findArrangedDiguDiscard(hand) {
  if (hand.length !== 11) return null;

  let best = null;

  for (let discardIndex = 0; discardIndex < hand.length; discardIndex++) {
    const candidate = hand.filter((_, index) => index !== discardIndex);
    const arrangedDigu = findArrangedDiguGroups(candidate);

    if (arrangedDigu) {
      const result = {
        discardCard: hand[discardIndex],
        discardIndex,
        groups: arrangedDigu.groups,
        layout: arrangedDigu.layout,
        meldPoints: arrangedDigu.meldPoints,
      };
      if (!best || result.meldPoints > best.meldPoints) best = result;
    }
  }

  return best;
}

export function findContiguousMeldGroups(hand) {
  const groups = [];
  const used = new Set();

  for (const size of [4, 3]) {
    for (let start = 0; start <= hand.length - size; start++) {
      const indices = Array.from({ length: size }, (_, offset) => start + offset);
      if (indices.some(index => used.has(index))) continue;
      const cards = indices.map(index => hand[index]);
      if (isOrderedMeld(cards)) {
        groups.push({ start, end: start + size - 1, size, cards });
        indices.forEach(index => used.add(index));
      }
    }
  }

  return groups.sort((a, b) => a.start - b.start);
}
