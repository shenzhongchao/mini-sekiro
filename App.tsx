
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, BossData, PlayerStats, Item, Rarity, ItemCategory, ItemStats } from './types';
import { generateBossForLevel, generateLoot } from './services/geminiService';
import CombatCanvas from './components/CombatCanvas';
import UIOverlay from './components/UIOverlay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { initAudio } from './utils/audio';

const BEAD_FRAGMENT_THRESHOLD = 3;
const BEAD_HP_BONUS = 35;
const BEAD_POSTURE_BONUS = 15;
const PLAYER_STATS_STORAGE_KEY = 'sekiro-lite-player-stats';

const createDefaultPlayerStats = (): PlayerStats => ({
  hp: 200,
  maxHp: 200,
  posture: 0,
  maxPosture: 100,
  attackPower: 10,
  equipment: [],
  beadFragments: 0,
  beadFragmentQueue: [],
  battleMemories: [],
  talismans: [],
  engravings: [],
  postureRecoveryBonus: 0,
  maxGourds: 3,
  maxSpiritEmblems: 15,
  gold: 0,
  currentLevel: 1,
  gourds: 3,
  spiritEmblems: 15
});

const sanitizeStatsForSave = (stats: PlayerStats): PlayerStats => ({
  ...stats,
  hp: stats.maxHp,
  posture: 0,
  gourds: stats.maxGourds,
  spiritEmblems: stats.maxSpiritEmblems,
  beadFragments: stats.beadFragmentQueue.length
});

const hydratePlayerStats = (): PlayerStats => {
  const base = createDefaultPlayerStats();
  if (typeof window === 'undefined') return base;
  try {
    const stored = window.localStorage.getItem(PLAYER_STATS_STORAGE_KEY);
    if (!stored) return base;
    const parsed = JSON.parse(stored);
    let beadQueue: ItemStats[];
    if (Array.isArray(parsed.beadFragmentQueue)) {
      beadQueue = parsed.beadFragmentQueue;
    } else {
      const fallbackCount = typeof parsed.beadFragments === 'number' ? parsed.beadFragments : base.beadFragments;
      beadQueue = Array.from({ length: fallbackCount }, () => ({ vitality: BEAD_HP_BONUS, posture: BEAD_POSTURE_BONUS }));
    }
    return {
      ...base,
      ...parsed,
      equipment: parsed.equipment || base.equipment,
      battleMemories: parsed.battleMemories || base.battleMemories,
      talismans: parsed.talismans || base.talismans,
      engravings: parsed.engravings || base.engravings,
      beadFragmentQueue: beadQueue,
      beadFragments: beadQueue.length
    } as PlayerStats;
  } catch (err) {
    console.warn('Failed to load saved player stats', err);
    return base;
  }
};

const clamp = (value: number, minValue: number) => Math.max(value, minValue);

const applyStatDelta = (player: PlayerStats, stats: ItemStats, factor = 1): PlayerStats => {
  if (!stats) return player;
  let next: PlayerStats = { ...player };
  if (stats.attack) {
    next.attackPower = clamp(next.attackPower + factor * stats.attack, 1);
  }
  if (stats.vitality) {
    next.maxHp = clamp(next.maxHp + factor * stats.vitality, 1);
    if (factor > 0) {
      next.hp = Math.min(next.maxHp, next.hp + stats.vitality * factor);
    } else {
      next.hp = Math.min(next.hp, next.maxHp);
    }
  }
  if (stats.posture) {
    next.maxPosture = clamp(next.maxPosture + factor * stats.posture, 10);
    next.posture = Math.min(next.posture, next.maxPosture);
  }
  if (stats.postureRecovery) {
    const newBonus = next.postureRecoveryBonus + factor * stats.postureRecovery;
    next.postureRecoveryBonus = parseFloat(newBonus.toFixed(3));
  }
  return next;
};

const equipItemById = (
  player: PlayerStats,
  itemId: string | undefined,
  type: 'TALISMAN' | 'ENGRAVING'
): PlayerStats => {
  let next: PlayerStats = { ...player };
  const pool = type === 'TALISMAN' ? next.talismans : next.engravings;
  const currentActiveId = type === 'TALISMAN' ? player.activeTalismanId : player.activeEngravingId;

  if (currentActiveId) {
    const currentItem = pool.find(t => t.id === currentActiveId);
    if (currentItem) {
      next = applyStatDelta(next, currentItem.stats, -1);
    }
  }

  if (itemId) {
    const target = pool.find(t => t.id === itemId);
    if (target) {
      next = applyStatDelta(next, target.stats, 1);
      if (type === 'TALISMAN') {
        next.activeTalismanId = target.id;
      } else {
        next.activeEngravingId = target.id;
      }
    } else if (type === 'TALISMAN') {
      next.activeTalismanId = undefined;
    } else {
      next.activeEngravingId = undefined;
    }
  } else if (type === 'TALISMAN') {
    next.activeTalismanId = undefined;
  } else {
    next.activeEngravingId = undefined;
  }

  return next;
};

const integrateLoot = (player: PlayerStats, loot: Item): PlayerStats => {
  let next: PlayerStats = {
    ...player,
    equipment: [...player.equipment, loot]
  };

  switch (loot.category) {
    case ItemCategory.BEAD_FRAGMENT: {
      const qty = loot.quantity || 1;
      const queue = [...next.beadFragmentQueue];
      const fragmentStats = {
        vitality: loot.stats?.vitality ?? BEAD_HP_BONUS,
        posture: loot.stats?.posture ?? BEAD_POSTURE_BONUS
      };

      for (let i = 0; i < qty; i++) {
        queue.push({ ...fragmentStats });
      }

      while (queue.length >= BEAD_FRAGMENT_THRESHOLD) {
        const consumed = queue.splice(0, BEAD_FRAGMENT_THRESHOLD);
        const totalVitality = consumed.reduce((sum, frag) => sum + (frag.vitality ?? BEAD_HP_BONUS), 0);
        const totalPosture = consumed.reduce((sum, frag) => sum + (frag.posture ?? BEAD_POSTURE_BONUS), 0);
        next = applyStatDelta(next, { vitality: totalVitality, posture: totalPosture }, 1);
      }

      next.beadFragmentQueue = queue;
      next.beadFragments = queue.length;
      break;
    }
    case ItemCategory.BATTLE_MEMORY: {
      next.battleMemories = [...next.battleMemories, loot];
      next = applyStatDelta(next, loot.stats, 1);
      break;
    }
    case ItemCategory.TALISMAN: {
      next.talismans = [...next.talismans, loot];
      if (!next.activeTalismanId) {
        next = equipItemById(next, loot.id, 'TALISMAN');
      }
      break;
    }
    case ItemCategory.ENGRAVING: {
      next.engravings = [...next.engravings, loot];
      if (!next.activeEngravingId) {
        next = equipItemById(next, loot.id, 'ENGRAVING');
      }
      break;
    }
    case ItemCategory.NINJA_TOOL_MATERIAL:
    case ItemCategory.RELIC: {
      next = applyStatDelta(next, loot.stats, 1);
      break;
    }
    case ItemCategory.SUGAR: {
      // Consumables：暂存于背包，待未来实现使用逻辑
      break;
    }
    case ItemCategory.GOURD_SEED: {
      const newMax = Math.min(next.maxGourds + 1, 10);
      const delta = newMax - next.maxGourds;
      if (delta > 0) {
        next.maxGourds = newMax;
        next.gourds = newMax;
      }
      break;
    }
    case ItemCategory.EMBLEM_POUCH: {
      const amount = loot.quantity || 5;
      next.maxSpiritEmblems += Math.ceil(amount / 2);
      next.spiritEmblems = Math.min(next.maxSpiritEmblems, next.spiritEmblems + amount);
      break;
    }
    default:
      next = applyStatDelta(next, loot.stats, 1);
      break;
  }

  return next;
};

const App: React.FC = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => hydratePlayerStats());

  const [currentBoss, setCurrentBoss] = useState<BossData | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("正在磨刀...");
  const [combatLog, setCombatLog] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  
  // Combat UI State (synced from canvas)
  const [hudState, setHudState] = useState({
    pHp: 200, pMaxHp: 200, pPost: 0, pMaxPost: 100,
    bHp: 100, bMaxHp: 100, bPost: 0, bMaxPost: 100
  });

  const [droppedItem, setDroppedItem] = useState<Item | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = sanitizeStatsForSave(playerStats);
    window.localStorage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify(payload));
  }, [playerStats]);

  // --- Actions ---

  const changeTalisman = (itemId: string) => {
    setPlayerStats(prev => equipItemById(prev, itemId || undefined, 'TALISMAN'));
  };

  const changeEngraving = (itemId: string) => {
    setPlayerStats(prev => equipItemById(prev, itemId || undefined, 'ENGRAVING'));
  };

  const startLevel = async (level: number) => {
    initAudio(); // Initialize audio context on user gesture
    setIsPaused(false);
    setGameState(GameState.LOADING_BOSS);
    setDroppedItem(null); // Reset dropped item so victory screen shows loading state
    setSelectedLevel(level);
    setLoadingMessage(`正在前往 第 ${level} 关...`);
    
    try {
      const boss = await generateBossForLevel(level);
      setCurrentBoss(boss);
      // Reset player temporary combat stats
      setHudState({
        pHp: playerStats.maxHp, pMaxHp: playerStats.maxHp, pPost: 0, pMaxPost: playerStats.maxPosture,
        bHp: boss.stats.maxHp, bMaxHp: boss.stats.maxHp, bPost: 0, bMaxPost: boss.stats.maxPosture
      });
      // Pass fresh stats to combat (ensure HP is full, gourds reset, emblems reset)
      setPlayerStats(prev => ({
        ...prev,
        hp: prev.maxHp,
        posture: 0,
        gourds: prev.maxGourds,
        spiritEmblems: prev.maxSpiritEmblems
      }));
      setGameState(GameState.COMBAT);
    } catch (e) {
      setLoadingMessage("召唤失败。迷雾太浓了。");
      setTimeout(() => setGameState(GameState.MENU), 2000);
    }
  };

  const consumeGourd = () => {
    if (playerStats.gourds > 0) {
      setPlayerStats(prev => ({...prev, gourds: prev.gourds - 1}));
      return true;
    }
    return false;
  };
  
  const consumeEmblem = (amount: number = 1) => {
      if (playerStats.spiritEmblems >= amount) {
          setPlayerStats(prev => ({...prev, spiritEmblems: prev.spiritEmblems - amount}));
          return true;
      }
      return false;
  };

  const handleCombatEnd = async (victory: boolean) => {
    if (victory) {
      setGameState(GameState.VICTORY);
      // Update progression
      const newMaxLevel = Math.max(playerStats.currentLevel, selectedLevel + 1);
      
      // Generate Loot
      const loot = await generateLoot(selectedLevel);
      setDroppedItem(loot);
      
      setPlayerStats(prev => {
        const withLevel = { ...prev, currentLevel: newMaxLevel };
        return integrateLoot(withLevel, loot);
      });
    } else {
      setGameState(GameState.DEFEAT);
    }
  };

  const updateHUD = (pHP: number, pMaxHP: number, pPost: number, pMaxPost: number, bHP: number, bMaxHP: number, bPost: number, bMaxPost: number) => {
    setHudState({
      pHp: pHP, pMaxHp: pMaxHP, pPost: pPost, pMaxPost: pMaxPost,
      bHp: bHP, bMaxHp: bMaxHP, bPost: bPost, bMaxPost: bMaxPost
    });
  };

  const setLog = (msg: string) => {
    setCombatLog(msg);
  };

  const togglePause = useCallback(() => {
    if (gameState !== GameState.COMBAT) return;
    setIsPaused(prev => {
      const next = !prev;
      setCombatLog(next ? '【暂停】战斗暂时停滞' : '战斗继续！');
      return next;
    });
  }, [gameState]);

  const handleResetLevel = () => {
    const confirmed = window.confirm('慎重提醒：重置会清空所有养成进度并返回鬼佛，确定吗？');
    if (!confirmed) return;
    setIsPaused(false);
    const resetStats = createDefaultPlayerStats();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PLAYER_STATS_STORAGE_KEY);
    }
    setPlayerStats(resetStats);
    setCombatLog('积累已清空，回到鬼佛。');
    setCurrentBoss(null);
    setDroppedItem(null);
    setHudState({
      pHp: resetStats.maxHp,
      pMaxHp: resetStats.maxHp,
      pPost: 0,
      pMaxPost: resetStats.maxPosture,
      bHp: 0,
      bMaxHp: 0,
      bPost: 0,
      bMaxPost: 0
    });
    setSelectedLevel(1);
    setGameState(GameState.MENU);
  };

  useEffect(() => {
    const handlePauseKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        if (gameState === GameState.COMBAT) {
          e.preventDefault();
          togglePause();
        }
      }
    };
    window.addEventListener('keydown', handlePauseKey);
    return () => window.removeEventListener('keydown', handlePauseKey);
  }, [togglePause, gameState]);

  useEffect(() => {
    if (gameState !== GameState.COMBAT && isPaused) {
      setIsPaused(false);
    }
  }, [gameState, isPaused]);

  // --- Renderers ---

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <h1 className="text-6xl font-bold mb-2 text-amber-600 tracking-tighter uppercase drop-shadow-lg font-serif">只狼：影之网</h1>
      <p className="text-zinc-500 mb-8 font-mono">Sekiro Lite: Shadow Web</p>
      
      <div className="grid grid-cols-5 gap-4 mb-8">
        {Array.from({ length: 20 }).map((_, i) => {
          const level = i + 1;
          const unlocked = level <= playerStats.currentLevel;
          return (
            <button
              key={level}
              disabled={!unlocked}
              onClick={() => startLevel(level)}
              className={`w-16 h-16 flex items-center justify-center text-xl font-bold border-2 rounded transition-all
                ${unlocked 
                  ? 'border-amber-600 bg-zinc-800 hover:bg-amber-900 hover:text-amber-200 hover:scale-105 cursor-pointer text-amber-500' 
                  : 'border-zinc-800 bg-zinc-950 text-zinc-700 cursor-not-allowed'}`}
            >
              {level}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => setGameState(GameState.INVENTORY)}
          className="px-6 py-2 border border-zinc-600 text-zinc-300 hover:bg-zinc-800 rounded font-serif"
        >
          属性与装备 (Inventory)
        </button>
      </div>
    </div>
  );

  const renderInventory = () => {
    const statData = [
      { name: '攻击力', value: playerStats.attackPower },
      { name: '体力', value: playerStats.maxHp },
      { name: '架势', value: playerStats.maxPosture },
    ];

    return (
      <div className="h-screen bg-zinc-900 p-8 text-zinc-100 overflow-y-auto">
        <button onClick={() => setGameState(GameState.MENU)} className="mb-6 text-amber-500 hover:underline">← 返回 (Back)</button>
        <h2 className="text-3xl font-serif text-zinc-200 mb-6 border-b border-zinc-700 pb-2">属性与背包</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 auto-rows-min pb-12">
          {/* Stats Chart */}
          <div className="bg-zinc-800 p-6 rounded shadow-lg">
            <h3 className="text-xl font-bold text-amber-500 mb-4">玩家属性</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip contentStyle={{backgroundColor: '#222', border: '1px solid #555'}} />
                  <Bar dataKey="value" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

         {/* Equipment List */}
          <div className="bg-zinc-800 p-6 rounded shadow-lg">
             <h3 className="text-xl font-bold text-amber-500 mb-4">已获得装备</h3>
             {playerStats.equipment.length === 0 ? (
               <p className="text-zinc-500 italic">暂无装备。击败Boss掉落。</p>
             ) : (
               <ul className="space-y-3">
                 {playerStats.equipment.map((item, idx) => (
                   <li key={idx} className="p-3 bg-zinc-900 rounded border border-zinc-700 flex flex-col">
                     <div className="flex justify-between items-center">
                        <span className={`font-bold ${
                          item.rarity === Rarity.LEGENDARY ? 'text-orange-500' :
                          item.rarity === Rarity.EPIC ? 'text-purple-400' :
                          item.rarity === Rarity.RARE ? 'text-blue-400' : 'text-zinc-400'
                        }`}>{item.name}{item.quantity ? ` x${item.quantity}` : ''}</span>
                        <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500">{item.category}</span>
                     </div>
                     <p className="text-xs text-zinc-500 italic mt-1">{item.description}</p>
                     {item.effectSummary && (
                        <p className="text-xs text-amber-400 mt-1">{item.effectSummary}</p>
                     )}
                     <div className="text-xs text-zinc-400 mt-2 grid grid-cols-2 gap-2">
                       {item.stats.attack && <span>攻击 +{item.stats.attack}</span>}
                       {item.stats.vitality && <span>体力 +{item.stats.vitality}</span>}
                       {item.stats.posture && <span>架势 +{item.stats.posture}</span>}
                       {item.stats.postureRecovery && <span>回架势 +{item.stats.postureRecovery.toFixed(2)}</span>}
                     </div>
                   </li>
                 ))}
               </ul>
             )}
          </div>

          <div className="bg-zinc-800 p-6 rounded shadow-lg">
            <h3 className="text-xl font-bold text-amber-500 mb-4">修行进度</h3>
            <p className="text-sm text-amber-300 mb-2">佛珠碎片：{playerStats.beadFragments}/{BEAD_FRAGMENT_THRESHOLD}</p>
            <p className="text-sm text-zinc-300 mb-2">葫芦容量：{playerStats.maxGourds}  瓶 &nbsp; (现有 {playerStats.gourds})</p>
            <p className="text-sm text-zinc-300 mb-4">纸人上限：{playerStats.maxSpiritEmblems}  (现有 {playerStats.spiritEmblems})</p>
            <div>
              <h4 className="text-sm text-zinc-300 mb-1">战斗记忆</h4>
              {playerStats.battleMemories.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">尚无战斗记忆。</p>
              ) : (
                <ul className="text-xs text-zinc-400 space-y-1">
                  {playerStats.battleMemories.map(memory => (
                    <li key={memory.id}>
                      <span className="text-amber-400">{memory.name}</span> · {memory.effectSummary || '永久增加攻击力'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-zinc-800 p-6 rounded shadow-lg lg:col-span-2">
            <h3 className="text-xl font-bold text-amber-500 mb-4">护符与铭刻</h3>
            <div className="mb-4">
              <h4 className="text-sm text-zinc-300 mb-1">护符槽</h4>
              {playerStats.talismans.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">暂无护符掉落。</p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={playerStats.activeTalismanId || ''}
                    onChange={e => changeTalisman(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-sm p-2 rounded"
                  >
                    <option value="">（无）</option>
                    {playerStats.talismans.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {playerStats.activeTalismanId ? (
                    <div className="text-xs text-zinc-400">
                      {playerStats.talismans.find(t => t.id === playerStats.activeTalismanId)?.effectSummary}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">请选择一个护符。</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-sm text-zinc-300 mb-1">铭刻槽</h4>
              {playerStats.engravings.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">暂无铭刻掉落。</p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={playerStats.activeEngravingId || ''}
                    onChange={e => changeEngraving(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-sm p-2 rounded"
                  >
                    <option value="">（无）</option>
                    {playerStats.engravings.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                  {playerStats.activeEngravingId ? (
                    <div className="text-xs text-zinc-400">
                      {playerStats.engravings.find(e => e.id === playerStats.activeEngravingId)?.effectSummary}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">请选择一个铭刻。</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCombat = () => (
    <div className="relative w-full h-screen bg-zinc-900 flex items-center justify-center overflow-hidden">
      {currentBoss && (
        <>
          <CombatCanvas 
            bossData={currentBoss} 
            playerStats={playerStats} 
            level={selectedLevel}
            onCombatEnd={handleCombatEnd}
            updateHUD={updateHUD}
            setLog={setLog}
            consumeGourd={consumeGourd}
            consumeEmblem={consumeEmblem}
            isPaused={isPaused}
          />
          <UIOverlay 
            bossName={currentBoss.name}
            bossHp={hudState.bHp} bossMaxHp={hudState.bMaxHp} bossPosture={hudState.bPost} bossMaxPosture={hudState.bMaxPost}
            playerHp={hudState.pHp} playerMaxHp={hudState.pMaxHp} playerPosture={hudState.pPost} playerMaxPosture={hudState.pMaxPost}
            combatLog={combatLog}
            gourds={playerStats.gourds}
            spiritEmblems={playerStats.spiritEmblems}
            isPaused={isPaused}
            onTogglePause={togglePause}
            onResetLevel={handleResetLevel}
          />
        </>
      )}
    </div>
  );

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mb-4"></div>
      <p className="text-xl font-serif animate-pulse text-zinc-400">{loadingMessage}</p>
    </div>
  );

  const renderVictory = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-black/90 absolute inset-0 z-50 text-center">
      <h1 className="text-8xl font-serif text-red-600 mb-4 tracking-widest uppercase drop-shadow-[0_5px_5px_rgba(200,0,0,0.5)]">忍杀 (VICTORY)</h1>
      <p className="text-2xl text-zinc-300 mb-8">击败 Boss</p>
      
      {!droppedItem ? (
        <div className="flex flex-col items-center p-8 bg-zinc-900/50 rounded border border-zinc-800 animate-pulse">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-600 mb-4"></div>
            <p className="text-amber-500 text-xl font-serif">正在解锁下一关...</p>
            <p className="text-zinc-500 text-sm mt-2">正在搜刮战场 (生成战利品)...</p>
        </div>
      ) : (
        <>
          <div className="bg-zinc-900 p-6 rounded border border-amber-600/50 max-w-md animate-bounce-in mb-8">
            <h3 className="text-amber-500 text-sm uppercase tracking-widest mb-2">获得物品</h3>
            <p className={`text-2xl font-bold mb-2 ${
               droppedItem.rarity === Rarity.LEGENDARY ? 'text-orange-500' :
               droppedItem.rarity === Rarity.EPIC ? 'text-purple-400' :
               droppedItem.rarity === Rarity.RARE ? 'text-blue-400' : 'text-zinc-300'
            }`}>{droppedItem.name}</p>
            <p className="text-zinc-500 text-sm">{droppedItem.description}</p>
             <div className="flex gap-2 justify-center mt-2 text-xs font-mono text-zinc-400">
                {droppedItem.stats.attack ? <span>ATK +{droppedItem.stats.attack}</span> : null}
                {droppedItem.stats.vitality ? <span>HP +{droppedItem.stats.vitality}</span> : null}
                {droppedItem.stats.posture ? <span>POST +{droppedItem.stats.posture}</span> : null}
                {droppedItem.stats.postureRecovery ? <span>回架势 +{droppedItem.stats.postureRecovery.toFixed(2)}</span> : null}
             </div>
          </div>

          <button 
            onClick={() => setGameState(GameState.MENU)}
            className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 font-serif text-xl"
          >
            返回鬼佛
          </button>
        </>
      )}
    </div>
  );

  const renderDefeat = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-black/90 absolute inset-0 z-50 text-center">
      <h1 className="text-9xl font-serif text-red-700 mb-8 tracking-widest uppercase">死</h1>
      <button 
        onClick={() => startLevel(selectedLevel)} // Retry
        className="px-8 py-3 bg-transparent hover:bg-red-900/30 text-zinc-300 border border-red-900 font-serif text-xl mb-4"
      >
        回生 (Retry)
      </button>
      <button 
        onClick={() => setGameState(GameState.MENU)}
        className="text-zinc-500 hover:text-zinc-300 font-serif text-sm"
      >
        接受死亡 (Menu)
      </button>
    </div>
  );

  return (
    <div className="bg-zinc-900 min-h-screen select-none">
      {gameState === GameState.MENU && renderMenu()}
      {gameState === GameState.INVENTORY && renderInventory()}
      {gameState === GameState.LOADING_BOSS && renderLoading()}
      {gameState === GameState.COMBAT && renderCombat()}
      {gameState === GameState.VICTORY && renderVictory()}
      {gameState === GameState.DEFEAT && renderDefeat()}
    </div>
  );
};

export default App;
