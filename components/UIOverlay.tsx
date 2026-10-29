import React from 'react';
import { clamp01 } from '../utils/visualTheme';

interface UIOverlayProps {
  bossName: string;
  bossTitle: string;
  bossHp: number;
  bossMaxHp: number;
  bossPosture: number;
  bossMaxPosture: number;
  playerHp: number;
  playerMaxHp: number;
  playerPosture: number;
  playerMaxPosture: number;
  combatLog: string;
  gourds: number;
  spiritEmblems: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onResetLevel: () => void;
}

const percent = (value: number, max: number) =>
  Math.round(clamp01(max > 0 ? value / max : 0) * 100);

/**
 * All elements are positioned in the 1000×500 combat coordinate space.
 * The shared CombatStage scales the HUD and the Canvas as one surface.
 * Keep the main character corridor (roughly y=180–410) unobstructed.
 */
const UIOverlay: React.FC<UIOverlayProps> = ({
  bossName, bossTitle, bossHp, bossMaxHp, bossPosture, bossMaxPosture,
  playerHp, playerMaxHp, playerPosture, playerMaxPosture, combatLog, gourds, spiritEmblems,
  isPaused, onTogglePause, onResetLevel
}) => {
  const bossHealth = percent(bossHp, bossMaxHp);
  const bossStance = percent(bossPosture, bossMaxPosture);
  const playerHealth = percent(playerHp, playerMaxHp);
  const playerStance = percent(playerPosture, playerMaxPosture);
  const isPerilousMessage = combatLog.includes('危');
  const isParryMessage = combatLog.includes('弹反');
  const isDeathblowMessage = combatLog.includes('忍杀');

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none font-serif text-stone-100" data-combat-hud>
      {/* Left: player status. Kept above the playing field, not over the player. */}
      <section aria-label="玩家状态" className="absolute left-5 top-4 w-[232px]">
        <div className="border-l-2 border-amber-400/50 bg-gradient-to-r from-zinc-950/95 via-zinc-950/85 to-zinc-950/30 px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,.35)]">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold tracking-[0.23em] text-amber-100">只狼</span>
            <span className="font-mono text-[11px] tabular-nums text-stone-200">
              {Math.max(0, Math.ceil(playerHp))} <span className="text-stone-400">/ {playerMaxHp}</span>
            </span>
          </div>
          <div role="progressbar" aria-label="玩家生命" aria-valuemin={0} aria-valuemax={100} aria-valuenow={playerHealth} className="h-[9px] overflow-hidden border border-emerald-950 bg-zinc-950">
            <div className="h-full bg-gradient-to-r from-[#176e55] via-[#35a283] to-[#a7dfb6] transition-[width] duration-100" style={{ width: `${playerHealth}%` }} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] tracking-widest text-amber-200/75">架势</span>
            <div role="progressbar" aria-label="玩家架势" aria-valuemin={0} aria-valuemax={100} aria-valuenow={playerStance} className="h-[5px] flex-1 bg-black/80">
              <div className="h-full bg-gradient-to-r from-amber-800 to-amber-300 transition-[width] duration-75" style={{ width: `${playerStance}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Center: boss status; its width does not depend on browser vw. */}
      <section aria-label="首领状态" className="absolute left-[270px] top-3 w-[460px]">
        <div className="border-x border-amber-200/20 bg-gradient-to-b from-zinc-950/90 via-zinc-950/65 to-transparent px-4 pb-3 pt-2 shadow-[0_12px_34px_rgba(0,0,0,.3)]">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 truncate text-[10px] tracking-[0.23em] text-amber-200/75">{bossTitle}</p>
              <h2 className="truncate text-lg font-bold tracking-[0.16em] text-stone-100 drop-shadow-md">{bossName}</h2>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-stone-300/70">{bossHealth}%</span>
          </div>
          <div role="progressbar" aria-label="首领生命" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bossHealth} className="relative h-[9px] overflow-hidden border border-rose-950/90 bg-zinc-950 shadow-[inset_0_0_8px_rgba(0,0,0,.7)]">
            <div className="h-full bg-gradient-to-r from-[#621b29] via-[#b63342] to-[#e37867] shadow-[0_0_12px_rgba(220,38,38,.45)] transition-[width] duration-100" style={{ width: `${bossHealth}%` }} />
            <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
          </div>
          <div className="mt-[5px] flex items-center gap-2">
            <span className="text-[10px] tracking-widest text-amber-200/75">架势</span>
            <div role="progressbar" aria-label="首领架势" aria-valuemin={0} aria-valuemax={100} aria-valuenow={bossStance} className="h-[5px] flex-1 overflow-hidden bg-zinc-950/90">
              <div className="h-full bg-gradient-to-r from-amber-700 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,.6)] transition-[width] duration-75" style={{ width: `${bossStance}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Right: actual buttons remain clickable; backdrop does not intercept combat. */}
      <nav aria-label="战斗操作" className="pointer-events-auto absolute right-4 top-4 z-20 flex w-[122px] flex-col items-stretch gap-1.5">
        <button type="button" onClick={onTogglePause} className="border border-stone-400/30 bg-zinc-950/85 px-2 py-2 text-xs tracking-wider text-stone-100 shadow-lg transition hover:border-amber-300/70 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          {isPaused ? '▶ 继续 · P' : 'Ⅱ 暂停 · P'}
        </button>
        <button type="button" onClick={onResetLevel} className="border border-rose-800/40 bg-zinc-950/75 px-2 py-1.5 text-xs text-rose-200/85 transition hover:border-rose-400 hover:text-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300">
          重置关卡
        </button>
        <span className="text-center text-[10px] text-rose-200/70">清空本次积累</span>
      </nav>

      {/* Non-interactive combat messages stay away from attack telegraphs. */}
      {combatLog && (
        <div aria-live="polite" className="absolute left-[270px] top-[116px] w-[460px] text-center">
          <span className={`inline-block max-w-full border-y px-4 py-1 text-[16px] font-bold tracking-wider backdrop-blur-[2px] ${isPerilousMessage ? 'border-rose-500/50 bg-rose-950/55 text-rose-100' : isParryMessage ? 'border-amber-300/50 bg-amber-950/50 text-amber-200' : isDeathblowMessage ? 'border-rose-300/70 bg-black/60 text-rose-100' : 'border-white/15 bg-black/35 text-stone-100/90'}`}>
            {combatLog}
          </span>
        </div>
      )}

      {/* Consumables occupy the floor strip below the combatants' feet (y>410). */}
      <section aria-label="战斗资源" className="absolute bottom-3 left-5 flex items-center gap-2">
        <div className="flex items-center gap-2 border border-cyan-400/25 bg-zinc-950/85 px-3 py-1.5">
          <span aria-hidden="true" className="text-xl text-cyan-300">◆</span>
          <span className="font-mono text-lg tabular-nums text-cyan-100">{spiritEmblems}</span>
          <span className="text-[10px] text-stone-300">纸人 · Q/S</span>
        </div>
        <div className="flex items-center gap-2 border border-amber-400/25 bg-zinc-950/85 px-3 py-1.5">
          <span aria-hidden="true" className="text-xl text-amber-300">◈</span>
          <span className="font-mono text-lg tabular-nums text-amber-100">{gourds}</span>
          <span className="text-[10px] text-stone-300">葫芦 · R</span>
        </div>
      </section>

      <div className="absolute bottom-3 right-5 border-r border-stone-300/20 bg-gradient-to-l from-zinc-950/85 to-transparent py-1 pl-5 pr-3 text-right font-sans text-[10px] leading-4 text-stone-300/85">
        <p>WASD 移动 · 空格 跳跃 · 鼠标 攻防</p>
        <p>双击 A/D 闪避 · E 突刺 · P 暂停</p>
      </div>
    </div>
  );
};

export default UIOverlay;
