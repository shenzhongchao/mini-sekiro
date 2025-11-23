// Enums
export enum GameState {
  MENU = 'MENU',
  LOADING_BOSS = 'LOADING_BOSS',
  COMBAT = 'COMBAT',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  INVENTORY = 'INVENTORY'
}

export enum Rarity {
  COMMON = '普通',
  RARE = '稀有',
  EPIC = '史诗',
  LEGENDARY = '传说'
}

// Interfaces
export enum ItemCategory {
  BEAD_FRAGMENT = '佛珠碎片',
  BATTLE_MEMORY = '战斗记忆',
  NINJA_TOOL_MATERIAL = '忍具素材',
  TALISMAN = '护符',
  ENGRAVING = '铭刻',
  SUGAR = '药糖',
  RELIC = '遗物',
  GOURD_SEED = '葫芦种子',
  EMBLEM_POUCH = '纸人囊'
}

export interface ItemStats {
  attack?: number;
  vitality?: number;
  posture?: number;
  postureRecovery?: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: ItemCategory;
  stats: ItemStats;
  quantity?: number;
  effectSummary?: string;
  metadata?: Record<string, any>;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  posture: number;
  maxPosture: number;
  attackPower: number;
  equipment: Item[];
  beadFragments: number;
  battleMemories: Item[];
  talismans: Item[];
  engravings: Item[];
  activeTalismanId?: string;
  activeEngravingId?: string;
  postureRecoveryBonus: number;
  maxGourds: number;
  maxSpiritEmblems: number;
  gold: number;
  currentLevel: number; // Highest unlocked level
  gourds: number; // Healing charges
  spiritEmblems: number; // Resource for prosthetic tools
}

export interface BossData {
  name: string;
  title: string;
  description: string;
  visualColor: string; // Hex code
  stats: {
    maxHp: number;
    maxPosture: number;
    aggression: number; // 0.1 to 1.0 (attack frequency)
    damage: number;
    speed: number; // movement speed
  };
  moves: string[]; // Names of special moves
}

export interface CombatResult {
  victory: boolean;
  bossName: string;
}
