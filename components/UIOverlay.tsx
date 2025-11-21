
import React from 'react';

interface UIOverlayProps {
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  bossPosture: number;
  bossMaxPosture: number;
  playerHp: number;
  playerMaxHp: number;
  playerPosture: number;
  playerMaxPosture: number;
  combatLog: string;
  gourds: number; // Healing items count
  spiritEmblems: number; // Shuriken ammo
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  bossName, bossHp, bossMaxHp, bossPosture, bossMaxPosture,
  playerHp, playerMaxHp, playerPosture, playerMaxPosture, combatLog, gourds, spiritEmblems
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex flex-col justify-between">
      {/* TOP: BOSS INFO */}
      <div className="w-full max-w-2xl mx-auto mt-2">
        <h2 className="text-xl font-bold text-red-500 tracking-widest uppercase drop-shadow-md mb-1">{bossName}</h2>
        {/* Boss HP */}
        <div className="w-full h-4 bg-zinc-800 border border-zinc-600 relative rounded-sm overflow-hidden">
          <div 
            className="h-full bg-red-700 transition-all duration-100" 
            style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
          ></div>
        </div>
        {/* Boss Posture */}
        <div className="w-2/3 mx-auto mt-1 h-2 bg-zinc-800/50 relative rounded-sm">
          <div 
            className="h-full bg-orange-500 transition-all duration-75 shadow-[0_0_10px_rgba(249,115,22,0.8)]" 
            style={{ width: `${(bossPosture / bossMaxPosture) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* CENTER: LOG */}
      <div className="text-center mt-16">
        <p className="text-amber-300 font-serif text-2xl font-bold animate-pulse drop-shadow-md bg-black/40 inline-block px-4 py-1 rounded border border-amber-900/30">{combatLog}</p>
      </div>

      {/* BOTTOM: PLAYER INFO */}
      <div className="w-full max-w-lg mx-auto mb-4 flex items-end gap-4">
        
        {/* Spirit Emblems */}
        <div className="bg-zinc-800/80 border border-blue-700 p-2 rounded flex flex-col items-center">
            <div className="text-blue-400 font-bold text-2xl">{spiritEmblems}</div>
            <div className="text-xs text-zinc-400">纸人</div>
            <div className="text-[10px] text-zinc-500">(Q:手里剑 / S:大招)</div>
        </div>

        {/* Gourd Counter */}
        <div className="bg-zinc-800/80 border border-amber-700 p-2 rounded flex flex-col items-center">
            <div className="text-amber-500 font-bold text-2xl">{gourds}</div>
            <div className="text-xs text-zinc-400">伤药葫芦</div>
            <div className="text-[10px] text-zinc-500">(按 R)</div>
        </div>

        <div className="flex-grow">
            <div className="flex justify-between items-end mb-1">
              <span className="text-zinc-400 font-bold font-serif">只狼</span>
              <span className="text-xl text-zinc-100 font-mono">{Math.max(0, Math.ceil(playerHp))} / {playerMaxHp}</span>
            </div>
            {/* Player HP */}
            <div className="w-full h-5 bg-zinc-800 border border-zinc-500 relative rounded overflow-hidden">
              <div 
                className="h-full bg-emerald-600 transition-all duration-100" 
                style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
              ></div>
            </div>
            {/* Player Posture */}
            <div className="mt-2">
              <div className="text-center text-xs text-orange-400 uppercase tracking-widest mb-1">架势 (Posture)</div>
              <div className="w-full h-3 bg-zinc-900 border border-orange-900/50 relative rounded">
                 <div 
                    className="h-full bg-orange-400 transition-all duration-75" 
                    style={{ width: `${(playerPosture / playerMaxPosture) * 100}%` }}
                  ></div>
              </div>
            </div>
        </div>
      </div>
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 right-4 text-xs text-zinc-500 text-right bg-black/50 p-2 rounded border border-zinc-800">
        <p>WASD / 方向键 : 移动</p>
        <p>左键 : 攻击</p>
        <p>右键 (长按) : 防御</p>
        <p>右键 (点击) : 弹反</p>
        <p>R / 上键 : 喝药</p>
        <p>Q : 手里剑 (1纸人)</p>
        <p>S / 下键 : 飞渡浮舟 (3纸人)</p>
        <p>E (长按) : 蓄力突刺</p>
        <p>空格 : 跳跃</p>
      </div>
    </div>
  );
};

export default UIOverlay;
