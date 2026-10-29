import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_STYLES,
  getBossStyleForLevel,
  getBossStyleName,
  listBossPatterns,
  chooseBossPattern,
  chooseBossReaction,
  getFollowupCue
} from '../utils/bossPatterns.js';

test('every three levels rotate through three readable combat styles', () => {
  assert.deepEqual(Array.from({ length: 9 }, (_, i) => getBossStyleForLevel(i + 1)), [
    'SWORDSMAN','SHADOW','MONK', 'SWORDSMAN','SHADOW','MONK', 'SWORDSMAN','SHADOW','MONK'
  ]);
  for (const style of Object.values(BOSS_STYLES)) assert.ok(getBossStyleName(style).length > 0);
});

test('each style has distinct named attack patterns', () => {
  const collections = Object.values(BOSS_STYLES).map(style => listBossPatterns(style, 1));
  for (const moves of collections) {
    assert.ok(moves.length >= 3);
    assert.ok(moves.every(move => move.windup >= 25 && move.name && move.id));
    assert.equal(new Set(moves.map(move => move.id)).size, moves.length);
  }
  assert.equal(new Set(collections.flat().map(move => move.id)).size, collections.flat().length);
});

test('all perilous patterns correspond to counterable thrusts or sweeps', () => {
  for (const style of Object.values(BOSS_STYLES)) {
    for (const move of listBossPatterns(style, 2)) {
      assert.equal(move.perilous, move.attackType === 'THRUST' || move.attackType === 'SWEEP');
      assert.ok(move.minDistance <= move.maxDistance);
      assert.ok(move.windup >= 25);
    }
  }
});

test('each style actually uses an exclusive phase-two opener', () => {
  for (const style of Object.values(BOSS_STYLES)) {
    const phase1Ids = new Set(listBossPatterns(style, 1).map(p => p.id));
    const newMove = chooseBossPattern(style, 2, 150, 0, '');
    assert.ok(newMove);
    assert.ok(!phase1Ids.has(newMove.id));
    assert.equal(newMove.minPhase, 2);
  }
});

test('normal attack rotations are reproducible and never repeat consecutively', () => {
  for (const style of Object.values(BOSS_STYLES)) {
    const sequence = [];
    let lastId = '';
    for (let i = 0; i < 12; i++) {
      const move = chooseBossPattern(style, 1, 160, i, lastId);
      assert.ok(move);
      assert.notEqual(move.id, lastId);
      sequence.push(move.id);
      lastId = move.id;
    }
    assert.ok(new Set(sequence).size >= 3);
    const replay = [];
    lastId = '';
    for (let i = 0; i < 12; i++) {
      const move = chooseBossPattern(style, 1, 160, i, lastId);
      replay.push(move.id);
      lastId = move.id;
    }
    assert.deepEqual(sequence, replay);
  }
});

test('out of range patterns are not invented and attacks respect distance', () => {
  assert.equal(chooseBossPattern('SHADOW', 1, 600, 2, ''), null);
  assert.notEqual(chooseBossPattern('SHADOW', 1, 50, 2, '').attackType, 'THRUST');
  assert.ok(chooseBossPattern('MONK', 1, 200, 1, ''));
});

test('reactions are distinct by style, rate limited, and never fire when far', () => {
  assert.equal(chooseBossReaction('SHADOW', 1, 'ATTACK', 100, 0), 'DODGE');
  assert.equal(chooseBossReaction('SWORDSMAN', 2, 'ATTACK', 100, 0), 'BLOCK');
  assert.equal(chooseBossReaction('MONK', 1, 'ATTACK', 100, 0), 'NONE');
  assert.equal(chooseBossReaction('SHADOW', 1, 'ATTACK', 100, 90), 'NONE');
  assert.equal(chooseBossReaction('SHADOW', 1, 'ATTACK', 400, 0), 'NONE');
});

test('every queued follow-up has a legible cue', () => {
  for (const style of Object.values(BOSS_STYLES)) {
    for (const pattern of listBossPatterns(style, 2)) {
      assert.ok(pattern.chain.every(type => getFollowupCue(type).length > 0));
      assert.ok(pattern.chain.length <= 2);
    }
  }
});
