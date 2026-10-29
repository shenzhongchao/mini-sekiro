/**
 * A single logical coordinate system for combat graphics and HUD.
 *
 * The simulation and the canvas remain 1000×500 logical pixels. Only the
 * containing DOM stage is scaled; no physics or hitbox coordinates change.
 */
export const COMBAT_STAGE_WIDTH = 1000;
export const COMBAT_STAGE_HEIGHT = 500;
export const COMBAT_STAGE_PADDING = 16;

/**
 * Letterbox the 2:1 stage into any viewport without cropping or distortion.
 * Output coordinates are in CSS pixels relative to the viewport element.
 */
export function fitCombatStage(viewportWidth, viewportHeight) {
  const width = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
  const height = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
  const inset = Math.min(COMBAT_STAGE_PADDING, width / 4, height / 4);
  const availableWidth = Math.max(0, width - inset * 2);
  const availableHeight = Math.max(0, height - inset * 2);
  const scale = Math.max(0, Math.min(
    availableWidth / COMBAT_STAGE_WIDTH,
    availableHeight / COMBAT_STAGE_HEIGHT
  ));
  const stageWidth = COMBAT_STAGE_WIDTH * scale;
  const stageHeight = COMBAT_STAGE_HEIGHT * scale;

  return {
    scale,
    left: (width - stageWidth) / 2,
    top: (height - stageHeight) / 2,
    width: stageWidth,
    height: stageHeight
  };
}
