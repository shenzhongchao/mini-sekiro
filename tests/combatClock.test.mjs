import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceCombatClock, advanceParryFrame, PARRY_ACTIVE_FRAMES, PARRY_INPUT_BUFFER_FRAMES } from '../utils/combatClock.js';

for (const hz of [60, 120, 144]) {
  test(`${hz}Hz display runs 60 gameplay ticks per second`, () => {
    let accumulatorMs = 0;
    let ticks = 0;
    for (let i = 0; i < hz; i++) {
      const next = advanceCombatClock(accumulatorMs, 1000 / hz);
      accumulatorMs = next.accumulatorMs;
      ticks += next.steps;
    }
    assert.equal(ticks, 60);
  });
}

test('large browser stall does not trigger an unbounded catch-up burst', () => {
  const next = advanceCombatClock(0, 10000);
  assert.equal(next.steps, 5);
  assert.ok(next.accumulatorMs < 1000 / 60);
});

test('parry input is consumed once, not refreshed for six frames', () => {
  let bufferedFrames = PARRY_INPUT_BUFFER_FRAMES;
  let activeFrames = 0;
  let successfulFrames = 0;
  for (let i = 0; i < 30; i++) {
    const next = advanceParryFrame(bufferedFrames, activeFrames, true);
    ({ bufferedFrames, activeFrames } = next);
    if (activeFrames > 0) successfulFrames++;
  }
  assert.equal(successfulFrames, PARRY_ACTIVE_FRAMES);
  assert.equal(bufferedFrames, 0);
});

test('parry input can wait briefly for a valid recovery state', () => {
  let result = { bufferedFrames: PARRY_INPUT_BUFFER_FRAMES, activeFrames: 0 };
  for (let i = 0; i < 3; i++) result = advanceParryFrame(result.bufferedFrames, result.activeFrames, false);
  assert.equal(result.bufferedFrames, 3);
  result = advanceParryFrame(result.bufferedFrames, result.activeFrames, true);
  assert.equal(result.activeFrames, PARRY_ACTIVE_FRAMES);
  assert.equal(result.bufferedFrames, 0);
});

test('parry buffer expires without an eligible state', () => {
  let result = { bufferedFrames: PARRY_INPUT_BUFFER_FRAMES, activeFrames: 0 };
  for (let i = 0; i < 10; i++) result = advanceParryFrame(result.bufferedFrames, result.activeFrames, false);
  assert.deepEqual(result, { bufferedFrames: 0, activeFrames: 0 });
});
