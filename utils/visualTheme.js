// Shared visual vocabulary for the battlefield, boss styles and impact effects.
// This module is intentionally free of browser dependencies for regression tests.
export const VISUAL_PALETTE = Object.freeze({
  player: '#e2e8f0',
  playerBlade: '#f8fafc',
  hit: '#f8fafc',
  block: '#cbd5e1',
  parry: '#fbbf24',
  perilous: '#ef4444',
  deathblow: '#fb7185',
  ground: '#101720',
  ink: '#070c14'
});

export const BOSS_VISUAL_THEMES = Object.freeze({
  SWORDSMAN: Object.freeze({ name: '苇名剑士', primary: '#f59e0b', trail: '#fde68a', ambient: '#a16207' }),
  SHADOW: Object.freeze({ name: '孤影忍者', primary: '#818cf8', trail: '#c7d2fe', ambient: '#4338ca' }),
  MONK: Object.freeze({ name: '破戒武僧', primary: '#c4b5fd', trail: '#e9d5ff', ambient: '#7c3aed' })
});

export const IMPACT_STYLES = Object.freeze({
  HIT: Object.freeze({ color: VISUAL_PALETTE.hit, duration: 14, rays: 7, radius: 32 }),
  BLOCK: Object.freeze({ color: VISUAL_PALETTE.block, duration: 11, rays: 6, radius: 23 }),
  PARRY: Object.freeze({ color: VISUAL_PALETTE.parry, duration: 22, rays: 12, radius: 58 }),
  PERILOUS: Object.freeze({ color: VISUAL_PALETTE.perilous, duration: 19, rays: 10, radius: 46 }),
  DEATHBLOW: Object.freeze({ color: VISUAL_PALETTE.deathblow, duration: 34, rays: 16, radius: 90 })
});

export function clamp01(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function getBossVisualTheme(style) {
  return BOSS_VISUAL_THEMES[style] || BOSS_VISUAL_THEMES.SWORDSMAN;
}

export function makeImpact(kind, x, y) {
  const style = IMPACT_STYLES[kind] || IMPACT_STYLES.HIT;
  return { kind: IMPACT_STYLES[kind] ? kind : 'HIT', x, y, age: 0, duration: style.duration };
}

export function getImpactProgress(impact) {
  return clamp01(impact.age / Math.max(1, impact.duration));
}

export function shakeOffset(frame, intensity) {
  const magnitude = Math.min(13, Math.max(0, intensity)) * 0.43;
  if (magnitude === 0) return { x: 0, y: 0 };
  return {
    x: Math.sin(frame * 13.72) * magnitude,
    y: Math.cos(frame * 9.61) * magnitude * 0.65
  };
}
