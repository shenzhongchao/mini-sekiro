
import { BossData, Item, Rarity } from "../types";

// --- CONSTANTS & DATA POOLS ---

const BOSS_TITLES = [
  "苇名流", "内府军", "孤影众", "乱波", "赤备", "仙峰寺", "淤加美", "罗伯特", "野盗", "剑圣", "修罗"
];

const BOSS_NAMES = [
  "佐濑", "山内", "鬼刑部", "弦一郎", "义父", "一心", "破戒僧", "狮子猿", "怨恨", "蝴蝶", "枭", "道玄", "丈", "巴"
];

const BOSS_MOVES = ["下段斩", "突刺", "跳劈", "飞渡浮舟", "巨型忍者突刺", "不死斩", "一文字", "龙闪"];

const LOOT_PREFIXES = {
  [Rarity.COMMON]: ["破旧的", "生锈的", "普通的", "轻盈的", "粗糙的"],
  [Rarity.RARE]: ["改良的", "沉重的", "锋利的", "坚固的", "赤备的", "忍者的"],
  [Rarity.EPIC]: ["精制的", "大将的", "雷汞的", "金刚的", "噬神的", "源之"],
  [Rarity.LEGENDARY]: ["龙之", "修罗的", "剑圣的", "不死的", "樱龙的", "巅峰的"]
};

const LOOT_TYPES = [
  { name: "佛珠", desc: "供奉于鬼佛，提升身体素质。", stat: "vitality" },
  { name: "战斗记忆", desc: "心中的残影，化为力量。", stat: "attack" },
  { name: "铁屑", desc: "用于强化忍义手的材料。", stat: "posture" },
  { name: "刚干糖", desc: "狩猎神隐之人所受的加护。", stat: "postureRecovery" },
  { name: "流派招式书", desc: "记载着失传的剑术奥义。", stat: "posture" },
  { name: "葫芦种子", desc: "提升伤药葫芦的效力。", stat: "vitality" }
];

// --- HELPER FUNCTIONS ---

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRarityForLevel = (level: number): Rarity => {
  const base = level * 0.04; // Slightly higher chance per level
  const roll = Math.random() + base;
  if (roll > 1.4) return Rarity.LEGENDARY; 
  if (roll > 1.0) return Rarity.EPIC;
  if (roll > 0.6) return Rarity.RARE;
  return Rarity.COMMON;
};

// --- MAIN EXPORTS ---

export const generateBossForLevel = async (level: number): Promise<BossData> => {
  // Simulate async delay to mimic "loading"
  await new Promise(resolve => setTimeout(resolve, 600));

  let name = "";
  let title = getRandomElement(BOSS_TITLES);
  let visualColor = "#a855f7"; // Purple default

  // Specific Overrides
  if (level === 1) {
    name = "低市晚苗";
    title = "内府大将";
    visualColor = "#d97706"; // Amber
  } else if (level === 2) {
    name = "压苗柱长";
    title = "希望之党";
    visualColor = "#16a34a"; // Green
  } else {
    // Random Name Generation
    const baseName = getRandomElement(BOSS_NAMES);
    // Add a random suffix letter or number to make it feel unique (e.g. "Genichiro B")
    const suffix = String.fromCharCode(65 + Math.floor(Math.random()*26)); 
    name = `${baseName} · ${suffix}`;

    // Color based on difficulty tier
    if (level <= 5) visualColor = "#d97706"; // Amber
    else if (level <= 15) visualColor = "#dc2626"; // Red
    else visualColor = "#000000"; // Black/Ultimate
  }

  // Stats Scaling
  // HP: Starts around 300, scales up to ~3000 at level 20
  const maxHp = Math.floor(200 + (level * 140));
  
  // Posture: Starts around 150, scales up to ~1200
  const maxPosture = Math.floor(100 + (level * 55));

  // Aggression: Caps at 0.95
  const aggression = Math.min(0.95, 0.25 + (level * 0.035));

  // Damage: Starts at ~30, scales to ~90 (Controlled so it doesn't one-shot 500hp player)
  const damage = Math.floor(25 + (level * 3.5));

  // Speed
  const speed = Math.min(8, 2 + (level * 0.25));

  // Moveset selection (Visual flavor only in this version)
  const moves = [];
  const numMoves = Math.min(4, 1 + Math.floor(level / 5));
  for(let i=0; i<numMoves; i++) {
      moves.push(getRandomElement(BOSS_MOVES));
  }

  return {
    name: name,
    title: title,
    description: `第 ${level} 关的守门人。`,
    visualColor: visualColor,
    stats: {
      maxHp,
      maxPosture,
      aggression,
      damage,
      speed
    },
    moves: moves
  };
};

export const generateLoot = async (level: number): Promise<Item> => {
  // Simulate async delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const rarity = getRarityForLevel(level);
  const baseType = getRandomElement(LOOT_TYPES);
  const prefix = getRandomElement(LOOT_PREFIXES[rarity]);
  
  const itemName = `${prefix}${baseType.name}`;
  
  // Stat Multipliers based on rarity
  let rarityMult = 1.0;
  if (rarity === Rarity.RARE) rarityMult = 1.5;
  if (rarity === Rarity.EPIC) rarityMult = 2.5;
  if (rarity === Rarity.LEGENDARY) rarityMult = 4.0;

  const stats: any = {};

  // Primary Stat Calculation
  if (baseType.stat === 'vitality') {
      // 10 base + level scaling * rarity
      stats.vitality = Math.ceil((10 + level * 4) * (1 + (rarityMult-1)*0.2));
  } else if (baseType.stat === 'attack') {
      // Attack is strictly controlled
      const baseAtk = Math.ceil(level * 0.3);
      stats.attack = Math.max(1, Math.ceil(baseAtk * (1 + (rarityMult-1)*0.3)));
  } else if (baseType.stat === 'posture') {
      stats.posture = Math.ceil((5 + level * 2) * rarityMult);
  } else if (baseType.stat === 'postureRecovery') {
      // Range 0.03 - 0.15 based on level
      const baseRec = 0.03;
      const tierBonus = (level / 20) * 0.12;
      stats.postureRecovery = parseFloat(((baseRec + tierBonus) * (1 + (rarityMult-1)*0.1)).toFixed(3));
  }

  // Secondary Stats (Bonus Chance)
  // Higher rarity = higher chance of double stats
  const bonusChance = rarity === Rarity.LEGENDARY ? 0.8 : (rarity === Rarity.EPIC ? 0.5 : (rarity === Rarity.RARE ? 0.2 : 0));
  
  if (Math.random() < bonusChance) {
      // Add a secondary stat that isn't the main one
      const otherTypes = ['attack', 'vitality', 'posture'].filter(t => t !== baseType.stat);
      const bonusType = getRandomElement(otherTypes);
      
      if (bonusType === 'attack') stats.attack = Math.max(1, Math.ceil(level * 0.2));
      if (bonusType === 'vitality') stats.vitality = Math.ceil(level * 3);
      if (bonusType === 'posture') stats.posture = Math.ceil(level * 2);
  }

  // Safety fallback: Ensure every 3 levels or if Legendary, we definitely get some Attack power if not present
  if ((level % 3 === 0 || rarity === Rarity.LEGENDARY) && !stats.attack) {
       stats.attack = Math.ceil(level * 0.15) || 1;
  }

  // Flavor text generation
  const descStart = ["曾在古战场被发现。", "沾染了龙之血。", "供奉在荒废的寺庙。", "只有真正的忍者才能驾驭。", "似乎发着微弱的光。"];
  const description = `${getRandomElement(descStart)} (${rarity})`;

  return {
    id: `loot_${Date.now()}_${Math.random()}`,
    name: itemName,
    description: description,
    rarity: rarity,
    stats: stats
  };
};
