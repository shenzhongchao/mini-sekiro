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

const getPercent = (value: number, max: number) =>
  Math.round(clamp01(max > 0 ? value / max : 0) * 100);

const UIOverlay: React.FC<UIOverlayProps> = ({
  bossName, bossTitle, bossHp, bossMaxHp, bossPosture, bossMaxPosture,
  playerHp, playerMaxHp, playerPosture, playerMaxPosture, combatLog, gourds, spiritEmblems,
  isPaused, onTogglePause, onResetLevel
}) => {
  const bossHealth = getPercent(bossHp, bossMaxHp);
  const bossStance = getPercent(bossPosture, bossMaxPosture);
  const playerHealth = getPercent(playerHp, playerMaxHp);
  const playerStance = getPercent(playerPosture, playerMaxPosture);
  const isPerilousMessage = combatLog.includes('危');
  const isParryMessage = combatLog.includes('弹反');
  const isDeathblowMessage = combatLog.includes('忍杀');

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none font-serif text-stone-100">
      {/* Boss readout: thin framed bars, reserved contrast, no giant permanent slab. */}
      <div className="absolute left-1/2 top-4 w-[min(62vw,610px)] -translate-x-1/2">
        <div className="border-x border-amber-200/20 bg-gradient-to-b from-zinc-950/90 via-zinc-950/70 to-transparent px-5 pb-4 pt-2 shadow-[0_12px_34px_rgba(0,0,0,.3)]">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] uppercase tracking-[0.32em] text-amber-200/65">{bossTitle}</p>
              <h2 className="truncate text-lg font-bold tracking-[0.18em] text-stone-100 drop-shadow-md">{bossName}</h2>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-stone-300/65">{bossHealth}%</span>
          </div>
          <div className="relative h-[9px] overflow-hidden border border-rose-950/90 bg-zinc-950 shadow-[inset_0_0_8px_rgba(0,0,0,.7)]">
            <div className="h-full bg-gradient-to-r from-[#621b29] via-[#b63342] to-[#e37867] shadow-[0_0_12px_rgba(220,38,38,.45)] transition-[width] duration-100" style={{ width: `${bossHealth}%` }}/>
            <div className="absolute inset-x-0 top-0 h-px bg-white/15"/>
          </div>
          <div className="mt-[5px] flex items-center gap-3">
            <span className="text-[10px] tracking-[0.16em] text-amber-200/75">架势</span>
            <div className="h-[5px] flex-1 overflow-hidden bg-zinc-950/90">
              <div className="h-full bg-gradient-to-r from-amber-700 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,.6)] transition-[width] duration-75" style={{ width: `${bossStance}%` }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Real buttons remain clickable; overlays never consume combat mouse input. */}
      <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <button type="button" onClick={onTogglePause} className="border border-stone-400/30 bg-zinc-950/85 px-3 py-2 text-xs tracking-wider text-stone-100 shadow-lg transition hover:border-amber-300/70 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          {isPaused ? '▶ 继续 · P' : 'Ⅱ 暂停 · P'}
        </button>
        <button type="button" onClick={onResetLevel} className="border border-rose-800/40 bg-zinc-950/75 px-3 py-1.5 text-xs text-rose-200/85 transition hover:border-rose-400 hover:text-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300">
          重置关卡
        </button>
        <span className="text-right text-[10px] text-rose-200/70">将清空本次积累</span>
      </div>

      {/* Short combat callouts only; never pulse the entire HUD. */}
      {combatLog && (
        <div className="absolute left-1/2 top-[24%] w-max max-w-[60vw] -translate-x-1/2 text-center">
          <span className={`inline-block max-w-full border-y px-5 py-1.5 text-lg font-bold tracking-widest backdrop-blur-[2px] ${isPerilousMessage ? 'border-rose-500/50 bg-rose-950/55 text-rose-100' : isParryMessage ? 'border-amber-300/50 bg-amber-950/50 text-amber-200' : isDeathblowMessage ? 'border-rose-300/70 bg-black/60 text-rose-100' : 'border-white/15 bg-black/35 text-stone-100/90'}`}>
            {combatLog}
          </span>
        </div>
      )}

      {/* Low-profile player meter, with explicit number and stance feedback. */}
      <div className="absolute bottom-5 left-5 w-[min(43vw,400px)]">
        <div className="border-l-2 border-amber-400/45 bg-gradient-to-r from-zinc-950/95 via-zinc-950/75 to-transparent px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,.45)]">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold tracking-[0.3em] text-amber-100">只狼</span>
            <span className="font-mono text-xs tabular-nums text-stone-200/85">{Math.max(0, Math.ceil(playerHp))} <span className="text-stone-400">/ {playerMaxHp}</span></span>
          </div>
          <div className="h-[10px] overflow-hidden border border-emerald-950 bg-zinc-950">
            <div className="h-full bg-gradient-to-r from-[#176e55] via-[#35a283] to-[#a7dfb6] transition-[width] duration-100" style={{ width: `${playerHealth}%` }}/>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] tracking-widest text-amber-200/65">架势</span>
            <div className="h-1.5 flex-1 bg-black/70">
              <div className="h-full bg-gradient-to-r from-amber-800 to-amber-300 transition-[width] duration-75" style={{ width: `${playerStance}%` }}/>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-2 border border-cyan-400/25 bg-cyan-950/25 px-3 py-1.5">
              <span aria-hidden="true" className="text-xl text-cyan-300">◆</span>
              <span className="font-mono text-lg tabular-nums text-cyan-100">{spiritEmblems}</span>
              <span className="text-[10px] text-stone-400">纸人 · Q/S</span>
            </div>
            <div className="flex items-center gap-2 border border-amber-400/25 bg-amber-950/25 px-3 py-1.5">
              <span aria-hidden="true" className="text-xl text-amber-300">◈</span>
              <span className="font-mono text-lg tabular-nums text-amber-100">{gourds}</span>
              <span className="text-[10px] text-stone-400">葫芦 · R</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hints are small and placed away from the duel. */}
      <div className="absolute bottom-5 right-5 hidden max-w-[220px] border-r border-stone-300/20 bg-gradient-to-l from-zinc-950/85 to-transparent py-3 pl-6 pr-3 text-right font-sans text-[11px] leading-5 tracking-wide text-stone-300/75 lg:block">
        <p>WASD 移动 · 空格 跳跃</p>
        <p>左键 攻击 · 右键 弹反 / 格挡</p>
        <p>双击 A/D 闪避</p>
        <p>Q 手里剑 · S 飞渡浮舟</p>
        <p>E 蓄力突刺 · R 喝药</p>
      </div>
    </div>
  );
};

export default UIOverlay;
