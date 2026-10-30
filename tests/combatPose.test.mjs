import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_ATTACK_FRAMES,
  PLAYER_HIT_FRAME,
  PLAYER_IMPACT_PROGRESS,
  getPlayerProgress,
  getPlayerAttackPhase,
  samplePlayerAttackPose,
  getPlayerTrailProgress,
  sampleBossActionPose
} from '../utils/combatPose.js';

const almost = (a, b, tolerance = 0.001) =>
  assert.ok(Math.abs(a - b) <= tolerance, `expected ${a} ≈ ${b}`);

test('player strike pose peaks at the SAME frame as the hit collision', () => {
  assert.equal(PLAYER_ATTACK_FRAMES, 18);
  assert.equal(PLAYER_HIT_FRAME, 10);
  almost(getPlayerProgress(PLAYER_HIT_FRAME), PLAYER_IMPACT_PROGRESS, 1e-12);
  const impact = samplePlayerAttackPose(getPlayerProgress(PLAYER_HIT_FRAME));
  assert.equal(impact.phase, 'STRIKE');
  assert.equal(impact.handX, 36);
  assert.equal(impact.tipX, 112);
  assert.ok(impact.lunge > 0 && impact.lean > 0);
  const windup = samplePlayerAttackPose(0.22);
  assert.ok(windup.lean < 0 && windup.sink > 0);
  assert.ok(windup.tipY < impact.tipY);
});

test('player blade, hand, torso, counterweight and feet interpolate smoothly', () => {
  const properties = ['lean','sink','lunge','backFoot','frontFoot','handX','handY','tipX','tipY','offX','offY'];
  for (const boundary of [0.22, 0.34, PLAYER_IMPACT_PROGRESS, 0.65, 0.84]) {
    const left = samplePlayerAttackPose(boundary - 0.00001);
    const right = samplePlayerAttackPose(boundary + 0.00001);
    for (const key of properties) almost(left[key], right[key], 0.025);
  }
  const atStart = samplePlayerAttackPose(0);
  const atEnd = samplePlayerAttackPose(1);
  for (const key of properties) almost(atStart[key], atEnd[key], 1e-12);
});

test('strike follows anticipation and completes with follow-through and recovery', () => {
  assert.deepEqual(
    [0, 0.25, 0.40, 0.60, 0.91].map(getPlayerAttackPhase),
    ['ANTICIPATION', 'ANTICIPATION', 'STRIKE', 'FOLLOW_THROUGH', 'RECOVERY']
  );
  assert.equal(getPlayerTrailProgress(0.1), 0);
  assert.equal(getPlayerTrailProgress(0.31), 0);
  assert.ok(getPlayerTrailProgress(PLAYER_IMPACT_PROGRESS) > 0);
  assert.equal(getPlayerTrailProgress(0.73), 0);
  assert.equal(getPlayerTrailProgress(0.95), 0);
});

test('each boss attack has continuous poses across windup, strike and recovery', () => {
  for (const type of ['LIGHT','COMBO','HEAVY','THRUST','SWEEP']) {
    const ready = sampleBossActionPose('WINDUP', type, 1);
    const first = sampleBossActionPose('ATTACK', type, 0);
    const final = sampleBossActionPose('ATTACK', type, 1);
    const recover = sampleBossActionPose('RECOVER', type, 0);
    const idle = sampleBossActionPose('IDLE', type, 0);
    const recovered = sampleBossActionPose('RECOVER', type, 1);
    for (const key of ['lean', 'sink', 'lunge', 'reach', 'weaponY', 'bladeRotation']) {
      almost(ready[key], first[key], 1e-10);
      almost(final[key], recover[key], 1e-10);
      almost(recovered[key], idle[key], 1e-10);
    }
    assert.equal(ready.phase, 'ANTICIPATION');
    assert.equal(sampleBossActionPose('ATTACK', type, 0.5).phase, 'STRIKE');
    assert.equal(recover.phase, 'RECOVERY');
  }
});

test('distinct boss techniques drive different readable silhouettes and weapon heights', () => {
  const heavy = sampleBossActionPose('WINDUP', 'HEAVY', 1);
  const thrust = sampleBossActionPose('ATTACK', 'THRUST', 0.5);
  const sweep = sampleBossActionPose('WINDUP', 'SWEEP', 1);
  const normal = sampleBossActionPose('ATTACK', 'LIGHT', 0.5);
  assert.ok(heavy.weaponY < 0, 'heavy blade is lifted');
  assert.ok(sweep.weaponY > 0, 'sweep blade is lowered');
  assert.ok(thrust.lunge > normal.lunge, 'thrust has a longer silhouette reach');
  assert.notEqual(thrust.bladeRotation, sweep.bladeRotation);
});

test('render poses are stable and have bounded finite outputs', () => {
  for (const input of [-Infinity, -5, 0, 0.1, 0.5, 1, 7, Infinity, NaN]) {
    const pose = samplePlayerAttackPose(input);
    assert.deepEqual(pose, samplePlayerAttackPose(input));
    for (const value of Object.values(pose)) {
      if (typeof value === 'number') assert.ok(Number.isFinite(value));
    }
    for (const mode of ['WINDUP', 'ATTACK', 'RECOVER', 'IDLE']) {
      const other = sampleBossActionPose(mode, 'LIGHT', input);
      assert.deepEqual(other, sampleBossActionPose(mode, 'LIGHT', input));
      for (const value of Object.values(other)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value));
      }
    }
  }
  assert.equal(getPlayerProgress(-100), 1);
  assert.equal(getPlayerProgress(100), 0);
  assert.equal(getPlayerProgress(5, 0), 1 - 5 / PLAYER_ATTACK_FRAMES);
});
