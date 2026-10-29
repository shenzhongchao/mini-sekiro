// Data-driven Boss Rush move patterns. Deliberately deterministic: each committed
// attack advances a sequence, instead of making a new random choice every frame.
export const BOSS_STYLES = Object.freeze({
  SWORDSMAN: 'SWORDSMAN',
  SHADOW: 'SHADOW',
  MONK: 'MONK'
});

const STYLE_NAMES = Object.freeze({
  SWORDSMAN: '苇名剑士',
  SHADOW: '孤影忍者',
  MONK: '破戒武僧'
});

const PATTERNS = Object.freeze({
  SWORDSMAN: [
    { id: 'sword-duel', name: '苇名·二连斩', attackType: 'LIGHT', windup: 36, perilous: false, minDistance: 0, maxDistance: 240, minPhase: 1, chain: ['COMBO'] },
    { id: 'sword-thrust', name: '苇名·踏前突刺', attackType: 'THRUST', windup: 50, perilous: true, minDistance: 65, maxDistance: 250, minPhase: 1, chain: [] },
    { id: 'sword-ichimonji', name: '苇名·一文字', attackType: 'HEAVY', windup: 72, perilous: false, minDistance: 0, maxDistance: 220, minPhase: 1, chain: [] },
    { id: 'sword-flurry', name: '苇名·追击三连', attackType: 'LIGHT', windup: 30, perilous: false, minDistance: 0, maxDistance: 240, minPhase: 2, chain: ['COMBO', 'COMBO'] }
  ],
  SHADOW: [
    { id: 'shadow-double', name: '孤影·回身斩', attackType: 'LIGHT', windup: 31, perilous: false, minDistance: 0, maxDistance: 235, minPhase: 1, chain: ['COMBO'] },
    { id: 'shadow-sweep', name: '孤影·扫堂腿', attackType: 'SWEEP', windup: 54, perilous: true, minDistance: 0, maxDistance: 225, minPhase: 1, chain: [] },
    { id: 'shadow-pierce', name: '孤影·破绽突刺', attackType: 'THRUST', windup: 44, perilous: true, minDistance: 75, maxDistance: 250, minPhase: 1, chain: [] },
    { id: 'shadow-feint', name: '孤影·三段追斩', attackType: 'LIGHT', windup: 26, perilous: false, minDistance: 0, maxDistance: 240, minPhase: 2, chain: ['COMBO', 'COMBO'] }
  ],
  MONK: [
    { id: 'monk-sweep', name: '破戒·长柄横扫', attackType: 'SWEEP', windup: 70, perilous: true, minDistance: 0, maxDistance: 245, minPhase: 1, chain: [] },
    { id: 'monk-pole', name: '破戒·蓄势重劈', attackType: 'HEAVY', windup: 82, perilous: false, minDistance: 0, maxDistance: 235, minPhase: 1, chain: [] },
    { id: 'monk-circle', name: '破戒·回旋双斩', attackType: 'LIGHT', windup: 46, perilous: false, minDistance: 0, maxDistance: 245, minPhase: 1, chain: ['COMBO'] },
    { id: 'monk-final', name: '破戒·流转三连', attackType: 'LIGHT', windup: 41, perilous: false, minDistance: 0, maxDistance: 245, minPhase: 2, chain: ['COMBO', 'COMBO'] }
  ]
});

export function getBossStyleForLevel(level) {
  return [BOSS_STYLES.SWORDSMAN, BOSS_STYLES.SHADOW, BOSS_STYLES.MONK][(Math.max(1, Math.floor(level)) - 1) % 3];
}

export function getBossStyleName(style) {
  return STYLE_NAMES[style] || STYLE_NAMES.SWORDSMAN;
}

export function listBossPatterns(style, phase = 1) {
  return (PATTERNS[style] || PATTERNS.SWORDSMAN).filter(p => p.minPhase <= phase);
}

// Make the newly introduced phase-two move the opening move of that phase.
export function chooseBossPattern(style, phase, distance, attackIndex, previousId = '') {
  const eligible = listBossPatterns(style, phase)
    .filter(p => distance >= p.minDistance && distance <= p.maxDistance);
  if (!eligible.length) return null;
  const phaseTwo = phase >= 2 && attackIndex === 0
    ? eligible.find(p => p.minPhase === 2) : null;
  if (phaseTwo && phaseTwo.id !== previousId) return phaseTwo;

  const index = Math.abs(Math.floor(attackIndex)) % eligible.length;
  const first = eligible[index];
  if (first.id !== previousId || eligible.length === 1) return first;
  return eligible[(index + 1) % eligible.length];
}

export function getFollowupCue(attackType) {
  switch (attackType) {
    case 'THRUST': return '危 · 追击突刺';
    case 'SWEEP': return '危 · 追击下段';
    case 'HEAVY': return '追击重斩';
    default: return '连续追斩';
  }
}

// One decision per new player attack, with a shared reaction cooldown.
// Allows players to read/punish the attack instead of seeing random frame-perfect dodges.
export function chooseBossReaction(style, playerAttackIndex, attackType, distance, cooldown) {
  if (distance >= 185 || cooldown > 0) return 'NONE';
  if (style === BOSS_STYLES.SHADOW) {
    return playerAttackIndex % 3 === 0 ? 'BLOCK' : 'DODGE';
  }
  if (style === BOSS_STYLES.MONK) {
    return playerAttackIndex % 3 === 0 ? 'BLOCK' : 'NONE';
  }
  return playerAttackIndex % 2 === 0 && attackType !== 'THRUST_RELEASE' ? 'BLOCK' : 'NONE';
}
