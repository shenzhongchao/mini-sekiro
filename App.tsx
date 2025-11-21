
import React, { useState, useEffect } from 'react';
import { GameState, BossData, PlayerStats, Item, Rarity } from './types';
import { generateBossForLevel, generateLoot } from './services/geminiService';
import CombatCanvas from './components/CombatCanvas';
import UIOverlay from './components/UIOverlay';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { initAudio } from './utils/audio';

const App: React.FC = () => {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    hp: 200, 
    maxHp: 200,
    posture: 0,
    maxPosture: 100, // Adjusted base posture for tighter gameplay
    attackPower: 10, // Slightly lowered base attack to make loot more meaningful
    equipment: [],
    gold: 0,
    currentLevel: 1,
    gourds: 3, 
    spiritEmblems: 15 
  });

  const [currentBoss, setCurrentBoss] = useState<BossData | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("正在磨刀...");
  const [combatLog, setCombatLog] = useState("");
  
  // Combat UI State (synced from canvas)
  const [hudState, setHudState] = useState({
    pHp: 200, pMaxHp: 200, pPost: 0, pMaxPost: 100,
    bHp: 100, bMaxHp: 100, bPost: 0, bMaxPost: 100
  });

  const [droppedItem, setDroppedItem] = useState<Item | null>(null);

  // --- Actions ---

  const startLevel = async (level: number) => {
    initAudio(); // Initialize audio context on user gesture
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
      setPlayerStats(prev => ({...prev, hp: prev.maxHp, posture: 0, gourds: 3, spiritEmblems: 15}));
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
      
      setPlayerStats(prev => ({
        ...prev,
        currentLevel: newMaxLevel,
        equipment: [...prev.equipment, loot],
        attackPower: prev.attackPower + (loot.stats.attack || 0),
        maxHp: prev.maxHp + (loot.stats.vitality || 0),
        maxPosture: prev.maxPosture + (loot.stats.posture || 0)
      }));
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

  // --- Renderers ---

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 text-zinc-100 p-8">
      <h1 className="text-6xl font-bold mb-2 text-amber-600 tracking-tighter uppercase drop-shadow-lg font-serif">只狼：影之网</h1>
      <p className="text-zinc-500 mb-8 font-mono">Sekiro Web: Shadows Die Twice</p>
      
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
      <div className="min-h-screen bg-zinc-900 p-8 text-zinc-100">
        <button onClick={() => setGameState(GameState.MENU)} className="mb-6 text-amber-500 hover:underline">← 返回 (Back)</button>
        <h2 className="text-3xl font-serif text-zinc-200 mb-6 border-b border-zinc-700 pb-2">属性与背包</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="bg-zinc-800 p-6 rounded shadow-lg max-h-[60vh] overflow-y-auto">
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
                        }`}>{item.name}</span>
                        <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500">{item.rarity}</span>
                     </div>
                     <p className="text-xs text-zinc-500 italic mt-1">{item.description}</p>
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
          />
          <UIOverlay 
            bossName={currentBoss.name}
            bossHp={hudState.bHp} bossMaxHp={hudState.bMaxHp} bossPosture={hudState.bPost} bossMaxPosture={hudState.bMaxPost}
            playerHp={hudState.pHp} playerMaxHp={hudState.pMaxHp} playerPosture={hudState.pPost} playerMaxPosture={hudState.pMaxPost}
            combatLog={combatLog}
            gourds={playerStats.gourds}
            spiritEmblems={playerStats.spiritEmblems}
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