import { clamp01, getBossVisualTheme, IMPACT_STYLES, VISUAL_PALETTE, getImpactProgress } from './visualTheme';

export type ImpactKind = 'HIT' | 'BLOCK' | 'PARRY' | 'PERILOUS' | 'DEATHBLOW';
export interface ImpactCue {
  kind: ImpactKind;
  x: number;
  y: number;
  age: number;
  duration: number;
}

type VisualTheme = ReturnType<typeof getBossVisualTheme>;

const GROUND_LEVEL = 410;

// A quiet ink landscape: separate silhouettes, fog and small foreground details.
// All shapes are procedural and deterministic; no image download or shader needed.
export function drawBattlefield(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: number,
  focusX: number,
  theme: VisualTheme
) {
  ctx.save();
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#080d1a');
  sky.addColorStop(0.57, '#253040');
  sky.addColorStop(0.84, '#39343d');
  sky.addColorStop(1, VISUAL_PALETTE.ink);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Moon glow stays behind the distant mountains and never competes with attacks.
  const moonX = width * 0.79;
  const moonY = 105;
  const moonlight = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 175);
  moonlight.addColorStop(0, 'rgba(252,244,222,0.18)');
  moonlight.addColorStop(0.5, 'rgba(202,217,244,0.07)');
  moonlight.addColorStop(1, 'rgba(202,217,244,0)');
  ctx.fillStyle = moonlight;
  ctx.fillRect(moonX - 175, moonY - 175, 350, 350);
  ctx.fillStyle = '#e7e5e4';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 33, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 32; i++) {
    const x = (i * 193 + 71) % width;
    const y = 25 + (i * 67) % 170;
    ctx.globalAlpha = 0.1 + ((i * 11) % 8) / 38;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;

  // Ridgelines move less than the foreground, giving depth without moving hitboxes.
  const offset = (focusX - width * 0.5) * 0.028;
  const ridge = (base: number, heightAmp: number, parallax: number, fill: string, phase: number) => {
    ctx.save();
    ctx.translate(-offset * parallax, 0);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-110, height);
    for (let x = -110; x <= width + 130; x += 14) {
      const peak = Math.sin(x * 0.009 + phase) * heightAmp
        + Math.sin(x * 0.025 + phase * 2.3) * heightAmp * 0.27;
      ctx.lineTo(x, base + peak);
    }
    ctx.lineTo(width + 130, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  ridge(285, 37, 0.25, '#263443', 1.1);
  ridge(332, 31, 0.55, '#192735', 2.0);

  // A temple gate and paired pines give the arena a recognizable silhouette.
  ctx.save();
  ctx.translate(-offset * 0.75, 0);
  const gateX = width * 0.28;
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#0b1824';
  ctx.fillRect(gateX - 68, 283, 12, 125);
  ctx.fillRect(gateX + 56, 283, 12, 125);
  ctx.fillRect(gateX - 92, 292, 184, 11);
  ctx.fillRect(gateX - 78, 312, 156, 7);
  ctx.beginPath();
  ctx.moveTo(gateX - 113, 290);
  ctx.quadraticCurveTo(gateX, 266, gateX + 113, 290);
  ctx.lineTo(gateX + 86, 300);
  ctx.lineTo(gateX - 86, 300);
  ctx.closePath();
  ctx.fill();
  for (const treeX of [width * 0.1, width * 0.92]) {
    ctx.fillRect(treeX - 4, 285, 9, 126);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(treeX, 230 + i * 22);
      ctx.lineTo(treeX - 34 + i * 5, 315 + i * 15);
      ctx.lineTo(treeX + 36 - i * 5, 312 + i * 15);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  const fog = ctx.createLinearGradient(0, 290, 0, GROUND_LEVEL + 15);
  fog.addColorStop(0, 'rgba(183,198,214,0)');
  fog.addColorStop(0.7, 'rgba(183,198,214,0.12)');
  fog.addColorStop(1, 'rgba(183,198,214,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 290, width, GROUND_LEVEL - 275);

  const floor = ctx.createLinearGradient(0, GROUND_LEVEL, 0, height);
  floor.addColorStop(0, '#202934');
  floor.addColorStop(0.15, VISUAL_PALETTE.ground);
  floor.addColorStop(1, '#090e16');
  ctx.fillStyle = floor;
  ctx.fillRect(0, GROUND_LEVEL, width, Math.max(height - GROUND_LEVEL, 0));
  ctx.fillStyle = 'rgba(223,209,185,0.19)';
  ctx.fillRect(0, GROUND_LEVEL, width, 2);

  // Fine stone cracks and reeds repeat exactly across frames (no noise flicker).
  ctx.strokeStyle = 'rgba(124,143,156,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) {
    const x = (i * 137 + 31) % width;
    const y = GROUND_LEVEL + 12 + ((i * 29) % 67);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 13, y + (i % 3) - 1);
    ctx.lineTo(x + 23, y - 4);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(156,175,162,0.33)';
  for (let x = 5; x < width; x += 19) {
    const reedHeight = 10 + ((x * 7) % 21);
    ctx.beginPath();
    ctx.moveTo(x, GROUND_LEVEL);
    ctx.quadraticCurveTo(x - 5, GROUND_LEVEL - reedHeight * 0.5, x + ((x * 3) % 9) - 4, GROUND_LEVEL - reedHeight);
    ctx.stroke();
  }

  // Very restrained moving mist; animation is a function of simulation frames.
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = theme.primary;
  const drift = (frame * 0.16) % (width + 240);
  ctx.beginPath();
  ctx.ellipse(drift - 120, 365, 125, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGroundContact(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  width: number,
  airborne: boolean,
  color: string
) {
  ctx.save();
  ctx.globalAlpha = airborne ? 0.10 : 0.29;
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(centerX, GROUND_LEVEL + 2, width * (airborne ? 0.48 : 0.72), airborne ? 4 : 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!airborne) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(centerX, GROUND_LEVEL + 1, width * 0.71, 5, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBladeTrail(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: number,
  attackType: string,
  progress: number,
  color: string
) {
  const t = clamp01(progress);
  if (t <= 0.04 || t >= 0.94) return;
  const strength = Math.min(1, t * 4, (1 - t) * 5);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  ctx.globalAlpha = strength * 0.85;
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 11;
  ctx.lineCap = 'round';

  if (attackType === 'THRUST') {
    const length = 55 + t * 124;
    ctx.lineWidth = 4 * (1 - t * 0.4);
    ctx.beginPath();
    ctx.moveTo(4, 3);
    ctx.lineTo(length, -3);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.65;
    ctx.beginPath();
    ctx.moveTo(24, -7);
    ctx.lineTo(length - 7, -11);
    ctx.stroke();
  } else {
    const sweeping = attackType === 'SWEEP';
    const heavy = attackType === 'HEAVY';
    const radius = sweeping ? 95 : heavy ? 103 : 75;
    const start = sweeping ? 0.12 : -1.55;
    const extent = sweeping ? 1.58 : heavy ? 1.70 : 1.50;
    const end = start + extent * t;
    ctx.lineWidth = heavy ? 7 : sweeping ? 6 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, end);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.globalAlpha *= 0.60;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 9, Math.max(start, end - 0.50), end);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawImpactCues(ctx: CanvasRenderingContext2D, cues: ImpactCue[]) {
  for (const cue of cues) {
    const spec = IMPACT_STYLES[cue.kind] || IMPACT_STYLES.HIT;
    const t = getImpactProgress(cue);
    const visibility = Math.pow(1 - t, 1.6);
    ctx.save();
    ctx.translate(cue.x, cue.y);
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = spec.color;
    ctx.shadowColor = spec.color;
    ctx.shadowBlur = cue.kind === 'PARRY' || cue.kind === 'DEATHBLOW' ? 20 : 8;
    ctx.globalAlpha = visibility * 0.95;

    const ringRadius = 8 + t * spec.radius;
    ctx.lineWidth = Math.max(1, 4 * (1 - t));
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < spec.rays; i++) {
      const angle = (i / spec.rays) * Math.PI * 2 + i * 0.13;
      const inner = 7 + t * spec.radius * 0.2;
      const outer = 13 + t * spec.radius * (i % 3 === 0 ? 1.15 : 0.78);
      ctx.lineWidth = i % 3 === 0 ? 2.8 : 1.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    if (cue.kind === 'PARRY' || cue.kind === 'DEATHBLOW') {
      ctx.globalAlpha = visibility * 0.65;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-spec.radius * 0.5, 0);
      ctx.lineTo(spec.radius * 0.5, 0);
      ctx.moveTo(0, -spec.radius * 0.5);
      ctx.lineTo(0, spec.radius * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawScreenGrade(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phasePulse: number,
  flash: number
) {
  ctx.save();
  const shade = ctx.createRadialGradient(width * 0.5, height * 0.43, height * 0.15, width * 0.5, height * 0.5, width * 0.70);
  shade.addColorStop(0, 'rgba(2,6,23,0)');
  shade.addColorStop(1, 'rgba(2,6,23,0.53)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  if (phasePulse > 0) {
    ctx.fillStyle = `rgba(126,34,68,${0.16 * clamp01(phasePulse)})`;
    ctx.fillRect(0, 0, width, height);
  }
  // Keep scenery and silhouettes legible even on high-energy impacts.
  if (flash > 0) {
    ctx.fillStyle = `rgba(251,238,206,${0.22 * clamp01(flash)})`;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}
