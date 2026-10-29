import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMBAT_STAGE_WIDTH, COMBAT_STAGE_HEIGHT, COMBAT_STAGE_PADDING, fitCombatStage
} from '../utils/combatStageLayout.js';

test('combat stage has one unchanged logical coordinate system', () => {
  assert.equal(COMBAT_STAGE_WIDTH, 1000);
  assert.equal(COMBAT_STAGE_HEIGHT, 500);
  assert.equal(COMBAT_STAGE_WIDTH / COMBAT_STAGE_HEIGHT, 2);
});

test('standard desktop sizes maintain aspect and center the Canvas with its HUD', () => {
  const viewports = [
    [1920, 1080], [1366, 768], [1280, 800],
    [2560, 1440], [1440, 900], [1024, 768]
  ];
  for (const [vw, vh] of viewports) {
    const l = fitCombatStage(vw, vh);
    assert.ok(l.scale > 0, `scale must be positive for ${vw}x${vh}`);
    assert.ok(Math.abs(l.width / l.height - 2) < 1e-10);
    assert.ok(Math.abs(l.left * 2 + l.width - vw) < 1e-8);
    assert.ok(Math.abs(l.top * 2 + l.height - vh) < 1e-8);
    assert.ok(l.left >= COMBAT_STAGE_PADDING - 1e-8);
    assert.ok(l.top >= COMBAT_STAGE_PADDING - 1e-8);
    assert.ok(l.width <= vw && l.height <= vh);
    assert.ok(Math.abs(l.width - COMBAT_STAGE_WIDTH * l.scale) < 1e-8);
    assert.ok(Math.abs(l.height - COMBAT_STAGE_HEIGHT * l.scale) < 1e-8);
  }
});

test('portrait and compact windows letterbox without clipping or stretching', () => {
  for (const [vw, vh] of [[375, 812], [720, 420], [320, 240], [600, 300]]) {
    const l = fitCombatStage(vw, vh);
    assert.ok(l.scale > 0);
    assert.ok(l.left >= 0 && l.top >= 0);
    assert.ok(l.left + l.width <= vw + 1e-8);
    assert.ok(l.top + l.height <= vh + 1e-8);
    assert.ok(Math.abs(l.width / l.height - 2) < 1e-10);
  }
});

test('zero or non-finite dimensions are safe; identical measurements are stable', () => {
  for (const [vw, vh] of [[0, 0], [NaN, 768], [1366, Infinity], [-5, 200]]) {
    const l = fitCombatStage(vw, vh);
    assert.equal(l.scale, 0);
    for (const v of Object.values(l)) assert.ok(Number.isFinite(v));
  }
  assert.deepEqual(fitCombatStage(1366, 768), fitCombatStage(1366, 768));
});

test('resizing only changes stage presentation, never simulated coordinates', () => {
  const actionPoint = { x: 470, y: 350 };
  for (const [vw, vh] of [[1920,1080], [1366,768], [1280,800]]) {
    const l = fitCombatStage(vw, vh);
    const rendered = { x: l.left + actionPoint.x * l.scale, y: l.top + actionPoint.y * l.scale };
    assert.ok(Math.abs((rendered.x - l.left) / l.scale - actionPoint.x) < 1e-9);
    assert.ok(Math.abs((rendered.y - l.top) / l.scale - actionPoint.y) < 1e-9);
  }
});
