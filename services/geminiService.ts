
import { BossData, Item, ItemCategory, ItemStats, Rarity } from "../types";

// --- CONSTANTS & DATA POOLS ---

const BOSS_TITLES = [
  "苇名流", "内府军", "孤影众", "乱波", "赤备", "仙峰寺", "淤加美", "罗伯特", "野盗", "剑圣", "修罗"
];

const BOSS_NAMES = [
  "佐濑", "山内", "鬼刑部", "弦一郎", "义父", "一心", "破戒僧", "狮子猿", "怨恨", "蝴蝶", "枭", "道玄", "丈", "巴"
];

const BOSS_MOVES = ["下段斩", "突刺", "跳劈", "飞渡浮舟", "巨型忍者突刺", "不死斩", "一文字", "龙闪"];

const BEAD_VARIANTS = [
  { name: '苇名佛珠碎片', desc: '残留苇名武人的祈愿。', vitality: 12, posture: 6 },
  { name: '仙峰寺佛珠碎片', desc: '被香火熏染的碎片。', vitality: 14, posture: 5 },
  { name: '修罗佛珠碎片', desc: '染血而燃烧，触之灼痛。', vitality: 16, posture: 7 }
];

const MEMORY_SCHOOLS = [
  { name: '苇名流战记', effect: '精进基本剑技。', baseAttack: 1.5 },
  { name: '孤影众密传', effect: '提高突刺与翻腾的锐度。', baseAttack: 1.7 },
  { name: '乱波残影', effect: '刺杀经验加深，提升出血伤害。', baseAttack: 1.9 }
];

const MATERIAL_POOL = [
  { name: '铁屑', effect: '强化手里剑与伞具骨架。', stat: 'posture' },
  { name: '黑火药', effect: '用于爆竹、火焰喷筒的燃料。', stat: 'attack' },
  { name: '雷汞', effect: '导雷器与飞渡浮舟升级必备。', stat: 'postureRecovery' }
];

const TALISMAN_POOL = [
  { name: '苇名护符', effect: '稳固身形，提升体力与架势恢复。' },
  { name: '金刚护符', effect: '稍减受击架势损耗。' },
  { name: '修罗护符', effect: '拼死搏杀时攻击更猛烈。' }
];

const ENGRAVING_POOL = [
  { name: '铭刻·雷反', effect: '空中雷返伤害提升。', attack: 0.3, posture: 4 },
  { name: '铭刻·忍杀', effect: '忍杀后恢复少量体力。', vitality: 6 },
  { name: '铭刻·浮空', effect: '浮空时架势恢复速度提升。', postureRecovery: 0.02 }
];

const SUGAR_POOL = [
  { name: '刚干糖', effect: '短时间提升防御。', stat: 'posture' },
  { name: '亚干糖', effect: '增强隐蔽与架势恢复。', stat: 'postureRecovery' },
  { name: '八雲糖', effect: '提升攻击并让武器灼热。', stat: 'attack' }
];

const RELIC_POOL = [
  { name: '龙胤遗灰', effect: '稀有遗物，蕴含龙胤之力。', attack: 0.4, vitality: 5 },
  { name: '竹叶念珠', effect: '念诵加护，提升架势上限。', posture: 8 }
];

const RARITY_PREFIX: Record<Rarity, string> = {
  [Rarity.COMMON]: '普通',
  [Rarity.RARE]: '稀有',
  [Rarity.EPIC]: '史诗',
  [Rarity.LEGENDARY]: '传说'
};

const GOURD_SEEDS = [
  { name: '伤药葫芦种子', effect: '交予艾玛即可增添葫芦容量。' },
  { name: '仙峰山葫芦芽', effect: '带有仙峰寺药水香气的种子。' }
];

const EMBLEM_POUCHES = [
  { name: '纸人囊', effect: '装载十数张纸人，补充忍义手之力。', amount: 5 },
  { name: '乌鸦忍的纸包', effect: '忍军常备的纸人包。', amount: 8 }
];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.BEAD_FRAGMENT]: '佛珠碎片',
  [ItemCategory.BATTLE_MEMORY]: '战斗记忆',
  [ItemCategory.NINJA_TOOL_MATERIAL]: '忍具素材',
  [ItemCategory.TALISMAN]: '护符',
  [ItemCategory.ENGRAVING]: '铭刻',
  [ItemCategory.SUGAR]: '药糖',
  [ItemCategory.RELIC]: '遗物',
  [ItemCategory.GOURD_SEED]: '葫芦种子',
  [ItemCategory.EMBLEM_POUCH]: '纸人囊'
};

const LOOT_WEIGHT_TABLE = [
  {
    min: 1,
    max: 5,
    weights: {
      [ItemCategory.BEAD_FRAGMENT]: 0.4,
      [ItemCategory.TALISMAN]: 0.3,
      [ItemCategory.BATTLE_MEMORY]: 0.2,
      [ItemCategory.SUGAR]: 0.05,
      [ItemCategory.GOURD_SEED]: 0.05
    }
  },
  {
    min: 6,
    max: 10,
    weights: {
      [ItemCategory.NINJA_TOOL_MATERIAL]: 0.4,
      [ItemCategory.BATTLE_MEMORY]: 0.25,
      [ItemCategory.BEAD_FRAGMENT]: 0.2,
      [ItemCategory.ENGRAVING]: 0.1,
      [ItemCategory.SUGAR]: 0.03,
      [ItemCategory.GOURD_SEED]: 0.07,
      [ItemCategory.EMBLEM_POUCH]: 0.05
    }
  },
  {
    min: 11,
    max: 15,
    weights: {
      [ItemCategory.BATTLE_MEMORY]: 0.35,
      [ItemCategory.ENGRAVING]: 0.25,
      [ItemCategory.NINJA_TOOL_MATERIAL]: 0.2,
      [ItemCategory.BEAD_FRAGMENT]: 0.1,
      [ItemCategory.SUGAR]: 0.05,
      [ItemCategory.EMBLEM_POUCH]: 0.05
    }
  },
  {
    min: 16,
    max: 30,
    weights: {
      [ItemCategory.ENGRAVING]: 0.4,
      [ItemCategory.BATTLE_MEMORY]: 0.3,
      [ItemCategory.NINJA_TOOL_MATERIAL]: 0.15,
      [ItemCategory.BEAD_FRAGMENT]: 0.05,
      [ItemCategory.SUGAR]: 0.03,
      [ItemCategory.RELIC]: 0.04,
      [ItemCategory.EMBLEM_POUCH]: 0.03
    }
  }
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

const getRarityMultiplier = (rarity: Rarity) => {
  if (rarity === Rarity.LEGENDARY) return 4.2;
  if (rarity === Rarity.EPIC) return 2.6;
  if (rarity === Rarity.RARE) return 1.6;
  return 1.0;
};

const getWeightConfigForLevel = (level: number) => {
  const tier = LOOT_WEIGHT_TABLE.find(t => level >= t.min && level <= t.max);
  return tier ? tier.weights : LOOT_WEIGHT_TABLE[LOOT_WEIGHT_TABLE.length - 1].weights;
};

const pickCategoryForLevel = (level: number): ItemCategory => {
  const weights = getWeightConfigForLevel(level);
  const totalWeight = Object.values(weights).reduce((acc, n) => acc + n, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  for (const [key, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll <= cumulative) {
      return key as ItemCategory;
    }
  }
  return ItemCategory.BEAD_FRAGMENT;
};

const toFixedStat = (value: number, digits = 3) => parseFloat(value.toFixed(digits));

const buildBeadFragment = (level: number, rarity: Rarity): Item => {
  const variant = getRandomElement(BEAD_VARIANTS);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {
    vitality: Math.ceil((variant.vitality + level * 2.2) * 0.7 * rarityMult),
    posture: Math.ceil((variant.posture + level * 1.2) * 0.6 * rarityMult)
  };
  return {
    id: `bead_${Date.now()}_${Math.random()}`,
    name: variant.name,
    description: `${variant.desc} (${rarity})` ,
    rarity,
    category: ItemCategory.BEAD_FRAGMENT,
    quantity: 1,
    stats,
    effectSummary: '收集三枚可凝成佛珠，永久提升体力与架势。'
  };
};

const buildBattleMemory = (level: number, rarity: Rarity): Item => {
  const school = getRandomElement(MEMORY_SCHOOLS);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {
    attack: Math.max(2, Math.ceil((school.baseAttack + level * 0.45) * rarityMult))
  };
  return {
    id: `memory_${Date.now()}_${Math.random()}`,
    name: school.name,
    description: `战场残影化为力量。 (${rarity})`,
    rarity,
    category: ItemCategory.BATTLE_MEMORY,
    stats,
    effectSummary: school.effect
  };
};

const buildMaterial = (level: number, rarity: Rarity): Item => {
  const material = getRandomElement(MATERIAL_POOL);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {};
  if (material.stat === 'attack') {
    stats.attack = Math.max(1, Math.ceil(level * 0.3 * rarityMult));
  } else if (material.stat === 'posture') {
    stats.posture = Math.ceil((8 + level * 1.2) * 0.6 * rarityMult);
  } else if (material.stat === 'postureRecovery') {
    stats.postureRecovery = toFixedStat((0.03 + level * 0.003) * rarityMult);
  }
  return {
    id: `material_${Date.now()}_${Math.random()}`,
    name: material.name,
    description: `${material.effect} (${rarity})`,
    rarity,
    category: ItemCategory.NINJA_TOOL_MATERIAL,
    stats,
    effectSummary: '可在忍义手面板中用于强化忍具。'
  };
};

const buildTalisman = (level: number, rarity: Rarity): Item => {
  const talisman = getRandomElement(TALISMAN_POOL);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {
    vitality: Math.ceil((10 + level * 1.8) * rarityMult * 0.7),
    postureRecovery: toFixedStat((0.025 + level * 0.002) * rarityMult)
  };
  const prefix = RARITY_PREFIX[rarity] || '';
  const itemName = `${prefix}${talisman.name}`;
  return {
    id: `talisman_${Date.now()}_${Math.random()}`,
    name: itemName,
    description: `${talisman.effect} (${rarity})`,
    rarity,
    category: ItemCategory.TALISMAN,
    stats,
    effectSummary: '装备后提升生存能力。'
  };
};

const buildEngraving = (level: number, rarity: Rarity): Item => {
  const seal = getRandomElement(ENGRAVING_POOL);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {
    attack: seal.attack ? Math.ceil(seal.attack * level * 1.2 * rarityMult) : undefined,
    vitality: seal.vitality ? Math.ceil(seal.vitality * 1.2 * rarityMult) : undefined,
    posture: seal.posture ? Math.ceil(seal.posture * 1.4 * rarityMult) : undefined,
    postureRecovery: seal.postureRecovery ? toFixedStat(seal.postureRecovery * 1.5 * rarityMult) : undefined
  };
  return {
    id: `engraving_${Date.now()}_${Math.random()}`,
    name: seal.name,
    description: `${seal.effect} (${rarity})`,
    rarity,
    category: ItemCategory.ENGRAVING,
    stats,
    effectSummary: '铭刻于武器之上，赋予额外被动效果。'
  };
};

const buildSugar = (level: number, rarity: Rarity): Item => {
  const sugar = getRandomElement(SUGAR_POOL);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {};
  if (sugar.stat === 'attack') {
    stats.attack = Math.ceil(Math.max(1, level * 0.25 * rarityMult));
  } else if (sugar.stat === 'posture') {
    stats.posture = Math.ceil((6 + level * 0.5) * 0.4 * rarityMult);
  } else {
    stats.postureRecovery = toFixedStat((0.035 + level * 0.0015) * rarityMult);
  }
  return {
    id: `sugar_${Date.now()}_${Math.random()}`,
    name: sugar.name,
    description: `${sugar.effect} (${rarity})`,
    rarity,
    category: ItemCategory.SUGAR,
    stats,
    effectSummary: '战斗中消耗可获得短时增益。'
  };
};

const buildRelic = (level: number, rarity: Rarity): Item => {
  const relic = getRandomElement(RELIC_POOL);
  const rarityMult = getRarityMultiplier(rarity);
  const stats: ItemStats = {
    attack: relic.attack ? Math.ceil(relic.attack * 1.5 * rarityMult) : undefined,
    vitality: relic.vitality ? Math.ceil(relic.vitality * 1.5 * rarityMult) : undefined,
    posture: relic.posture ? Math.ceil(relic.posture * 1.5 * rarityMult) : undefined,
    postureRecovery: toFixedStat(0.01 * rarityMult)
  };
  return {
    id: `relic_${Date.now()}_${Math.random()}`,
    name: relic.name,
    description: `${relic.effect} (${rarity})`,
    rarity,
    category: ItemCategory.RELIC,
    stats,
    effectSummary: '稀有遗物，可用于未来的交换或解锁内容。'
  };
};

const buildGourdSeed = (rarity: Rarity): Item => {
  const seed = getRandomElement(GOURD_SEEDS);
  return {
    id: `gourd_${Date.now()}_${Math.random()}`,
    name: seed.name,
    description: `${seed.effect} (${rarity})`,
    rarity,
    category: ItemCategory.GOURD_SEED,
    stats: {},
    quantity: 1,
    effectSummary: '永久增加伤药葫芦携带上限。'
  };
};

const buildEmblemPouch = (level: number, rarity: Rarity): Item => {
  const pouch = getRandomElement(EMBLEM_POUCHES);
  const amount = pouch.amount + Math.floor(level / 6);
  return {
    id: `pouch_${Date.now()}_${Math.random()}`,
    name: pouch.name,
    description: `${pouch.effect} (${rarity})`,
    rarity,
    category: ItemCategory.EMBLEM_POUCH,
    quantity: amount,
    stats: {},
    effectSummary: `立即 +${amount} 张纸人，并提升上限。`
  };
};

export const getLootHintsForLevel = (level: number, limit = 3): string[] => {
  const weights = getWeightConfigForLevel(level);
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => CATEGORY_LABELS[key as ItemCategory] || key);
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
  const category = pickCategoryForLevel(level);

  switch (category) {
    case ItemCategory.BEAD_FRAGMENT:
      return buildBeadFragment(level, rarity);
    case ItemCategory.BATTLE_MEMORY:
      return buildBattleMemory(level, rarity);
    case ItemCategory.NINJA_TOOL_MATERIAL:
      return buildMaterial(level, rarity);
    case ItemCategory.TALISMAN:
      return buildTalisman(level, rarity);
    case ItemCategory.ENGRAVING:
      return buildEngraving(level, rarity);
    case ItemCategory.SUGAR:
      return buildSugar(level, rarity);
    case ItemCategory.RELIC:
      return buildRelic(level, rarity);
    case ItemCategory.GOURD_SEED:
      return buildGourdSeed(rarity);
    case ItemCategory.EMBLEM_POUCH:
      return buildEmblemPouch(level, rarity);
    default:
      return buildBeadFragment(level, rarity);
  }
};
