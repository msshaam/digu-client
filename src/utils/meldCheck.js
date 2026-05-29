const RANK_ORDER = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

function isRun(cards) {
  if (cards.length < 3) return false;
  const suit = cards[0].suit;
  if (!cards.every(c => c.suit === suit)) return false;
  const sorted = [...cards].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  for (let i = 1; i < sorted.length; i++) {
    if (RANK_ORDER[sorted[i].rank] !== RANK_ORDER[sorted[i - 1].rank] + 1) return false;
  }
  return true;
}

function isSet(cards) {
  if (cards.length < 3) return false;
  const rank = cards[0].rank;
  if (!cards.every(c => c.rank === rank)) return false;
  const suits = cards.map(c => c.suit);
  return new Set(suits).size === suits.length;
}

function isMeld(cards) {
  return isRun(cards) || isSet(cards);
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
