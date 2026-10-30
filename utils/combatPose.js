/**
 * Combat animation poses are render-only. Positions and hitboxes remain owned
 * by CombatCanvas's simulation, whose attack timers determine hit frames.
 *
 * All player points are right-facing local sprite coordinates with feet at y=0.
 * The Canvas renderer mirrors x by the actor's facing direction.
 */
const ATTACK_IMPACT_AT = 8 / 18; // player deals damage when attackTimer === 10
const PLAYER_KEYS = Object.freeze([
  { at: 0,    lean: 0,     sink: 0, lunge: 0, backFoot: 0, frontFoot: 0, handX: -15, handY: -45, tipX: -28, tipY: -65, offX: 15, offY: -45 },
  { at: 0.22, lean: -0.15, sink: 9, lunge: -4, backFoot: -7, frontFoot: -3, handX: -23, handY: -77, tipX: -40, tipY: -112, offX: -9, offY: -55 },
  { at: 0.34, lean: 0.06,  sink: 2, lunge: 2, backFoot: -12, frontFoot: 8, handX: 8, handY: -70, tipX: 22, tipY: -123, offX: 7, offY: -56 },
  { at: ATTACK_IMPACT_AT, lean: 0.26, sink: -3, lunge: 7, backFoot: -17, frontFoot: 20, handX: 36, handY: -56, tipX: 112, tipY: -24, offX: 22, offY: -51 },
  { at: 0.65, lean: 0.17, sink: 0, lunge: 6, backFoot: -13, frontFoot: 16, handX: 42, handY: -45, tipX: 116, tipY: -3, offX: 18, offY: -47 },
  { at: 0.84, lean: 0.05, sink: 4, lunge: 2, backFoot: -4, frontFoot: 7, handX: 22, handY: -54, tipX: 78, tipY: -45, offX: 12, offY: -48 },
  { at: 1,    lean: 0,     sink: 0, lunge: 0, backFoot: 0, frontFoot: 0, handX: -15, handY: -45, tipX: -28, tipY: -65, offX: 15, offY: -45 }
]);

const BOSS_TYPE_MULTIPLIERS = Object.freeze({
  LIGHT: Object.freeze({ power: 0.72, lunge: 0.75, weaponY: 0, bladeRotation: 0.8 }),
  COMBO: Object.freeze({ power: 0.67, lunge: 0.7, weaponY: 0, bladeRotation: 0.95 }),
  HEAVY: Object.freeze({ power: 1.28, lunge: 0.75, weaponY: -12, bladeRotation: 1.15 }),
  THRUST: Object.freeze({ power: 1.00, lunge: 1.55, weaponY: -3, bladeRotation: 0.16 }),
  SWEEP: Object.freeze({ power: 1.15, lunge: 1.0, weaponY: 13, bladeRotation: -0.65 })
});

export const PLAYER_ATTACK_FRAMES = 18;
export const PLAYER_HIT_FRAME = 10;
export const PLAYER_IMPACT_PROGRESS = ATTACK_IMPACT_AT;
export const POSE_STAGE_NAMES = Object.freeze(['ANTICIPATION', 'STRIKE', 'FOLLOW_THROUGH', 'RECOVERY']);

export function clampPoseProgress(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function smoothstep(x) {
  const t = clampPoseProgress(x);
  return t * t * (3 - 2 * t);
}

function interpolate(keys, progress) {
  const t = clampPoseProgress(progress);
  if (t <= keys[0].at) return { ...keys[0] };
  for (let i = 1; i < keys.length; i++) {
    if (t > keys[i].at) continue;
    const before = keys[i - 1];
    const after = keys[i];
    const w = smoothstep((t - before.at) / (after.at - before.at));
    const out = { at: t };
    for (const k of Object.keys(before)) {
      if (k === 'at') continue;
      out[k] = before[k] + (after[k] - before[k]) * w;
    }
    return out;
  }
  return { ...keys[keys.length - 1] };
}

export function getPlayerAttackPhase(progress) {
  const t = clampPoseProgress(progress);
  if (t < 0.34) return 'ANTICIPATION';
  if (t <= PLAYER_IMPACT_PROGRESS + 0.06) return 'STRIKE';
  if (t < 0.75) return 'FOLLOW_THROUGH';
  return 'RECOVERY';
}

export function samplePlayerAttackPose(progress) {
  const pose = interpolate(PLAYER_KEYS, progress);
  return { ...pose, phase: getPlayerAttackPhase(progress) };
}

/** A slash trail exists only during the active swing, never while winding up. */
export function getPlayerTrailProgress(progress) {
  const t = clampPoseProgress(progress);
  if (t <= 0.32 || t >= 0.73) return 0;
  return (t - 0.32) / 0.41;
}

/**
 * Boss takes its pose from the same existing WINDUP/ATTACK/RECOVER timers
 * that determine collision windows. The function never advances a timer.
 */
export function sampleBossActionPose(mode, attackType, progress = 0) {
  const t = clampPoseProgress(progress);
  const spec = BOSS_TYPE_MULTIPLIERS[attackType] || BOSS_TYPE_MULTIPLIERS.LIGHT;
  if (mode === 'WINDUP') {
    const buildup = smoothstep(t);
    return {
      phase: 'ANTICIPATION',
      lean: -0.10 * spec.power * buildup,
      sink: 7 * spec.power * buildup,
      lunge: -4 * spec.lunge * buildup,
      reach: -5 * spec.lunge * buildup,
      weaponY: spec.weaponY * buildup,
      bladeRotation: -0.17 * spec.bladeRotation * buildup
    };
  }

  if (mode === 'ATTACK') {
    // 0.5 is the actual boss collision frame (activeTicks / 2).
    const keys = [
      { at: 0, lean: -0.10, sink: 7, lunge: -4, reach: -5, bladeRotation: -0.17 },
      { at: 0.5, lean: 0.22, sink: -4, lunge: 12, reach: 10, bladeRotation: 0.22 },
      { at: 0.78, lean: 0.15, sink: 1, lunge: 8, reach: 8, bladeRotation: 0.28 },
      { at: 1, lean: 0.07, sink: 3, lunge: 2, reach: 3, bladeRotation: 0.08 }
    ];
    const base = interpolate(keys, t);
    return {
      phase: t < 0.32 ? 'ANTICIPATION' : t <= 0.56 ? 'STRIKE' : 'FOLLOW_THROUGH',
      lean: base.lean * spec.power,
      sink: base.sink * spec.power,
      lunge: base.lunge * spec.lunge,
      reach: base.reach * spec.lunge,
      weaponY: spec.weaponY * (1 - 0.8 * Math.sin(t * Math.PI)),
      bladeRotation: base.bladeRotation * spec.bladeRotation
    };
  }

  if (mode === 'RECOVER') {
    // Progress is 0 on entering recovery and approaches 1 as it ends.
    const fade = 1 - smoothstep(t);
    return {
      phase: 'RECOVERY',
      lean: 0.07 * spec.power * fade,
      sink: 3 * spec.power * fade,
      lunge: 2 * spec.lunge * fade,
      reach: 3 * spec.lunge * fade,
      weaponY: spec.weaponY * fade,
      bladeRotation: 0.08 * spec.bladeRotation * fade
    };
  }

  return {
    phase: 'IDLE', lean: 0, sink: 0, lunge: 0,
    reach: 0, weaponY: 0, bladeRotation: 0
  };
}

export function getPlayerProgress(remainingFrames, total = PLAYER_ATTACK_FRAMES) {
  const duration = Number.isFinite(total) && total > 0 ? total : PLAYER_ATTACK_FRAMES;
  return clampPoseProgress(1 - remainingFrames / duration);
}
