// All gameplay timers advance at a fixed 60 Hz, independent of display refresh rate.
export const FIXED_STEP_MS = 1000 / 60;
export const PARRY_ACTIVE_FRAMES = 10;
export const PARRY_INPUT_BUFFER_FRAMES = 6;
const MAX_ELAPSED_MS = 100;
const MAX_STEPS = 5;

/**
 * Plan fixed simulation ticks while dropping excess time after tab stalls.
 * @param {number} accumulatorMs
 * @param {number} elapsedMs
 * @returns {{ steps: number, accumulatorMs: number }}
 */
export function advanceCombatClock(accumulatorMs, elapsedMs) {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(MAX_ELAPSED_MS, elapsedMs)) : 0;
  const total = Math.max(0, accumulatorMs) + safeElapsed;
  const steps = Math.min(MAX_STEPS, Math.floor((total + 1e-7) / FIXED_STEP_MS));
  const remaining = Math.max(0, total - steps * FIXED_STEP_MS);
  return { steps, accumulatorMs: remaining >= FIXED_STEP_MS ? 0 : remaining };
}

/**
 * A click starts exactly one parry window, not a fresh window on every buffered tick.
 * @param {number} bufferedFrames
 * @param {number} activeFrames
 * @param {boolean} canStart
 * @returns {{ bufferedFrames: number, activeFrames: number }}
 */
export function advanceParryFrame(bufferedFrames, activeFrames, canStart) {
  if (bufferedFrames > 0 && canStart) {
    return { bufferedFrames: 0, activeFrames: PARRY_ACTIVE_FRAMES };
  }
  return {
    bufferedFrames: Math.max(0, bufferedFrames - 1),
    activeFrames: Math.max(0, activeFrames - 1)
  };
}
