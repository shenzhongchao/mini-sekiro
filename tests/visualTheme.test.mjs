import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VISUAL_PALETTE, BOSS_VISUAL_THEMES, IMPACT_STYLES,
  clamp01, getBossVisualTheme, makeImpact, getImpactProgress, shakeOffset
} from '../utils/visualTheme.js';

test('all three boss styles have distinct primary and blade-trail colors', () => {
  const styles = ['SWORDSMAN', 'SHADOW', 'MONK'].map(getBossVisualTheme);
  assert.equal(new Set(styles.map(s => s.primary)).size, 3);
  assert.equal(new Set(styles.map(s => s.trail)).size, 3);
  assert.equal(Object.keys(BOSS_VISUAL_THEMES).length, 3);
  assert.equal(getBossVisualTheme('UNKNOWN'), BOSS_VISUAL_THEMES.SWORDSMAN);
});

test('combat cues use differentiated semantic palettes and time-to-live', () => {
  const kinds = ['HIT', 'BLOCK', 'PARRY', 'PERILOUS', 'DEATHBLOW'];
  assert.equal(new Set(kinds.map(k => IMPACT_STYLES[k].color)).size, kinds.length);
  for (const kind of kinds) {
    const impact = makeImpact(kind, 32, 70);
    assert.deepEqual([impact.x, impact.y, impact.kind, impact.age], [32, 70, kind, 0]);
    assert.equal(impact.duration, IMPACT_STYLES[kind].duration);
    assert.equal(getImpactProgress({ ...impact, age: impact.duration }), 1);
    assert.equal(getImpactProgress({ ...impact, age: 0 }), 0);
  }
  assert.ok(IMPACT_STYLES.DEATHBLOW.radius > IMPACT_STYLES.PARRY.radius);
  assert.ok(IMPACT_STYLES.PARRY.radius > IMPACT_STYLES.BLOCK.radius);
  assert.equal(VISUAL_PALETTE.perilous, '#ef4444');
});

test('impact progress and accessibility values never escape zero-to-one', () => {
  for (const [input, expected] of [[-3,0],[0,0],[0.37,0.37],[2,1],[Infinity,0],[NaN,0]]) {
    assert.equal(clamp01(input), expected);
  }
  assert.equal(getImpactProgress({age: 17, duration: 0}), 1);
});

test('camera shake uses stable offsets and caps intensity', () => {
  for (const frame of [0,1,18,120]) {
    assert.deepEqual(shakeOffset(frame, 10), shakeOffset(frame, 10));
    assert.deepEqual(shakeOffset(frame, 400), shakeOffset(frame, 13));
    const offset = shakeOffset(frame, 400);
    assert.ok(Math.abs(offset.x) <= 6);
    assert.ok(Math.abs(offset.y) <= 4);
    assert.deepEqual(shakeOffset(frame, 0), {x: 0, y: 0});
  }
});
