
import React, { useRef, useEffect, useMemo } from 'react';
import { BossData, PlayerStats } from '../types';
import { playCombatSound } from '../utils/audio';

interface CombatCanvasProps {
  bossData: BossData;
  playerStats: PlayerStats;
  level: number; // Added level for pattern complexity
  onCombatEnd: (victory: boolean) => void;
  updateHUD: (pHP: number, pMaxHP: number, pPost: number, pMaxPost: number, bHP: number, bMaxHP: number, bPost: number, bMaxPost: number) => void;
  setLog: (msg: string) => void;
  consumeGourd: () => boolean; // Function to consume a gourd from parent state
  consumeEmblem: (amount?: number) => boolean; // Function to consume emblem
}

// Game Constants
const FPS = 60;
const GRAVITY = 0.6;
const GROUND_Y = 350;
const ARENA_WIDTH = 1000;
const PARRY_WINDOW = 26; 
const HEAL_DURATION = 45; 

// Movement Constants
const WALK_SPEED = 2.8; 
const DASH_SPEED = 12.0; 
const DASH_DURATION = 15; 
const DOUBLE_TAP_WINDOW = 250; 
const MAX_CHARGE_FRAMES = 60; // 1 second max charge

// Physics Constants
const PLAYER_MASS = 1.0;
const BOSS_MASS = 10.0; 
const ELASTICITY = 0.3; 
const FRICTION = 0.85; 

// Attack Properties
const ATK_LIGHT = { windup: 35, active: 15, recover: 40, damageMult: 0.8, range: 130 };
const ATK_HEAVY = { windup: 80, active: 25, recover: 140, damageMult: 1.5, range: 160 };
const ATK_COMBO = { windup: 25, active: 12, recover: 30, damageMult: 0.7, range: 120 };
const ATK_THRUST = { windup: 45, active: 8, recover: 60, damageMult: 1.3, range: 200 }; // Fast lunge, long range, narrow hitbox
const ATK_SWEEP = { windup: 60, active: 18, recover: 90, damageMult: 1.1, range: 220 }; // Low horizontal sweep, unblockable

type BossVisualTier = 'ASHINA' | 'ONSLAUGHT' | 'SHURA';

interface BossVisualProfile {
  tier: BossVisualTier;
  baseColor: string;
  gradientFrom: string;
  gradientTo: string;
  trimColor: string;
  accentColor: string;
  auraColor?: string;
  scarfColor?: string;
  capeColor?: string;
  hornColor?: string;
  hasKabuto?: boolean;
  hasScarf?: boolean;
  hasCape?: boolean;
  hasHorns?: boolean;
  hasPrayerBeads?: boolean;
}

const LEVEL_VISUAL_PRESETS: BossVisualProfile[] = [
  {
    tier: 'ASHINA',
    baseColor: '#f59e0b',
    gradientFrom: '#fde047',
    gradientTo: '#b45309',
    trimColor: '#fcd34d',
    accentColor: '#b91c1c',
    auraColor: '#fef3c7',
    scarfColor: '#c2410c',
    capeColor: '#92400e',
    hasKabuto: true,
    hasScarf: false,
    hasCape: false,
    hasHorns: false,
    hasPrayerBeads: true
  },
  {
    tier: 'ASHINA',
    baseColor: '#f97316',
    gradientFrom: '#fdba74',
    gradientTo: '#c2410c',
    trimColor: '#fde047',
    accentColor: '#dc2626',
    auraColor: '#fed7aa',
    scarfColor: '#c2410c',
    capeColor: '#a16207',
    hasKabuto: true,
    hasScarf: true,
    hasCape: false,
    hasHorns: false,
    hasPrayerBeads: true
  },
  {
    tier: 'ASHINA',
    baseColor: '#fb923c',
    gradientFrom: '#fed7aa',
    gradientTo: '#b45309',
    trimColor: '#fcd34d',
    accentColor: '#d946ef',
    auraColor: '#fde68a',
    scarfColor: '#b45309',
    capeColor: '#78350f',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: true
  },
  {
    tier: 'ASHINA',
    baseColor: '#ea580c',
    gradientFrom: '#fdba74',
    gradientTo: '#9a3412',
    trimColor: '#f97316',
    accentColor: '#e11d48',
    auraColor: '#fca5a5',
    scarfColor: '#9a3412',
    capeColor: '#7c2d12',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ASHINA',
    baseColor: '#c2410c',
    gradientFrom: '#fb923c',
    gradientTo: '#7c2d12',
    trimColor: '#f59e0b',
    accentColor: '#ea580c',
    auraColor: '#fb923c',
    scarfColor: '#a16207',
    capeColor: '#78350f',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#b91c1c',
    gradientFrom: '#ef4444',
    gradientTo: '#7f1d1d',
    trimColor: '#f97316',
    accentColor: '#fde047',
    auraColor: '#f87171',
    scarfColor: '#991b1b',
    capeColor: '#7f1d1d',
    hasKabuto: false,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#dc2626',
    gradientFrom: '#f87171',
    gradientTo: '#991b1b',
    trimColor: '#fb923c',
    accentColor: '#fde047',
    auraColor: '#fb7185',
    scarfColor: '#7f1d1d',
    capeColor: '#991b1b',
    hasKabuto: false,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#f87171',
    gradientFrom: '#fecdd3',
    gradientTo: '#b91c1c',
    trimColor: '#f97316',
    accentColor: '#fde047',
    auraColor: '#fecdd3',
    scarfColor: '#b91c1c',
    capeColor: '#9f1239',
    hasKabuto: false,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#fb7185',
    gradientFrom: '#fecdd3',
    gradientTo: '#9f1239',
    trimColor: '#fb923c',
    accentColor: '#fde047',
    auraColor: '#f472b6',
    scarfColor: '#be123c',
    capeColor: '#9f1239',
    hasKabuto: false,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#f43f5e',
    gradientFrom: '#fecdd3',
    gradientTo: '#881337',
    trimColor: '#fb7185',
    accentColor: '#fef08a',
    auraColor: '#f472b6',
    scarfColor: '#e11d48',
    capeColor: '#9f1239',
    hasKabuto: false,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#e11d48',
    gradientFrom: '#fb7185',
    gradientTo: '#881337',
    trimColor: '#f97316',
    accentColor: '#fde047',
    auraColor: '#f472b6',
    scarfColor: '#9f1239',
    capeColor: '#7f1d1d',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#be123c',
    gradientFrom: '#fb7185',
    gradientTo: '#701a75',
    trimColor: '#f97316',
    accentColor: '#fde047',
    auraColor: '#f472b6',
    scarfColor: '#9d174d',
    capeColor: '#701a75',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: false,
    hasPrayerBeads: false
  },
  {
    tier: 'ONSLAUGHT',
    baseColor: '#9f1239',
    gradientFrom: '#fb7185',
    gradientTo: '#581c87',
    trimColor: '#ea580c',
    accentColor: '#fde047',
    auraColor: '#f472b6',
    scarfColor: '#701a75',
    capeColor: '#581c87',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#f472b6',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#7f1d1d',
    gradientFrom: '#fb7185',
    gradientTo: '#3f0f12',
    trimColor: '#fb923c',
    accentColor: '#fde047',
    auraColor: '#f43f5e',
    scarfColor: '#7f1d1d',
    capeColor: '#4c0519',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#fb7185',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#701a75',
    gradientFrom: '#a21caf',
    gradientTo: '#4c1d95',
    trimColor: '#e11d48',
    accentColor: '#fde047',
    auraColor: '#c084fc',
    scarfColor: '#86198f',
    capeColor: '#4c1d95',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#f472b6',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#581c87',
    gradientFrom: '#7c3aed',
    gradientTo: '#312e81',
    trimColor: '#fb7185',
    accentColor: '#fef08a',
    auraColor: '#a855f7',
    scarfColor: '#6d28d9',
    capeColor: '#312e81',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#f472b6',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#4c1d95',
    gradientFrom: '#6d28d9',
    gradientTo: '#1e1b4b',
    trimColor: '#f97316',
    accentColor: '#fde047',
    auraColor: '#c4b5fd',
    scarfColor: '#312e81',
    capeColor: '#1e1b4b',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#e879f9',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#2e1065',
    gradientFrom: '#4338ca',
    gradientTo: '#1e1b4b',
    trimColor: '#fb7185',
    accentColor: '#fde047',
    auraColor: '#a855f7',
    scarfColor: '#3b0764',
    capeColor: '#1e1b4b',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#fb7185',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#1e1b4b',
    gradientFrom: '#312e81',
    gradientTo: '#0f172a',
    trimColor: '#fb7185',
    accentColor: '#fde047',
    auraColor: '#f472b6',
    scarfColor: '#312e81',
    capeColor: '#0f172a',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#fb7185',
    hasPrayerBeads: false
  },
  {
    tier: 'SHURA',
    baseColor: '#0f172a',
    gradientFrom: '#1f2937',
    gradientTo: '#000000',
    trimColor: '#f87171',
    accentColor: '#fde047',
    auraColor: '#f43f5e',
    scarfColor: '#111827',
    capeColor: '#020617',
    hasKabuto: true,
    hasScarf: true,
    hasCape: true,
    hasHorns: true,
    hornColor: '#f87171',
    hasPrayerBeads: false
  }
];

const getBossVisualProfile = (level: number, fallbackColor: string): BossVisualProfile => {
  const idx = Math.min(Math.max(level, 1), LEVEL_VISUAL_PRESETS.length) - 1;
  const preset = LEVEL_VISUAL_PRESETS[idx] || LEVEL_VISUAL_PRESETS[LEVEL_VISUAL_PRESETS.length - 1];
  return {
    ...preset,
    baseColor: preset.baseColor || fallbackColor || '#a855f7'
  };
};

const CombatCanvas: React.FC<CombatCanvasProps> = ({ bossData, playerStats, level, onCombatEnd, updateHUD, setLog, consumeGourd, consumeEmblem }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const propsRef = useRef({ consumeGourd, consumeEmblem });

  useEffect(() => {
    propsRef.current = { consumeGourd, consumeEmblem };
  }, [consumeGourd, consumeEmblem]);
  
  // Game State Ref
  const gameState = useRef({
    frame: 0,
    gameOver: false,
    hitStop: 0,
    shake: 0,
    flashIntensity: 0,
    parrySuccessTimer: 0, // Timer for parry success visual effect
    inputBuffer: { parry: 0 },
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    shockwaves: [] as { x: number; y: number; radius: number; alpha: number }[],
    projectiles: [] as { x: number; y: number; vx: number; vy: number; life: number; rotation: number; owner: 'player' | 'boss' }[],
    sakura: [] as { x: number; y: number; vx: number; vy: number; size: number; swayOffset: number; color: string }[], 
    player: {
      x: 100,
      y: GROUND_Y,
      width: 30,
      height: 60,
      vx: 0,
      vy: 0,
      mass: PLAYER_MASS,
      hp: playerStats.hp,
      maxHp: playerStats.maxHp,
      posture: 0,
      maxPosture: playerStats.maxPosture,
      state: 'IDLE', // IDLE, RUN, ATTACK, FLOATING_PASSAGE, BLOCK, HIT, DASH, HEAL, THRUST_CHARGE, THRUST_RELEASE
      facingRight: true,
      parryTimer: 0,
      attackTimer: 0,
      dashTimer: 0,
      healTimer: 0,
      thrustCharge: 0, // Charge counter for thrust attack
      holdingBlock: false,
      toolCooldown: 0
    },
    boss: {
      x: 600,
      y: GROUND_Y,
      width: 50,
      height: 80,
      vx: 0,
      vy: 0,
      mass: BOSS_MASS,
      hp: bossData.stats.maxHp,
      maxHp: bossData.stats.maxHp,
      posture: 0,
      maxPosture: bossData.stats.maxPosture,
      state: 'IDLE',
      attackTimer: 60,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      maxWindup: 0,
      currentMove: '',
      attackType: 'LIGHT' as 'LIGHT' | 'HEAVY' | 'COMBO' | 'THRUST' | 'SWEEP',
      moveQueue: [] as string[],
      isPerilous: false,
      paceTimer: 0,
      faceRight: false,
      postureRecoveryTimer: 0,
      comboCounter: 0, // Tracks consecutive hits taken
      lastHitTime: 0 // Frame number of last hit
    }
  });

  // Controls Ref
  const controls = useRef({
    left: false,
    right: false,
    block: false,
    jump: false,
    heal: false,
    shuriken: false, // Q key
    floatingPassage: false, // S key
    thrust: false // E key
  });

  // Double Tap Tracking
  const lastKeyTime = useRef<{[key: string]: number}>({});

  const bossVisualProfile = useMemo(
    () => getBossVisualProfile(level, bossData.visualColor),
    [level, bossData.visualColor]
  );

  // --- VFX ---
  const spawnSparks = (x: number, y: number, count: number, color: string = '#fbbf24') => {
    for (let i = 0; i < count; i++) {
      gameState.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 25, 
        vy: (Math.random() - 0.5) * 25,
        life: 10 + Math.random() * 10,
        color
      });
    }
  };

  const spawnDashTrail = (entity: any) => {
     gameState.current.particles.push({
        x: entity.x,
        y: entity.y,
        vx: 0,
        vy: 0,
        life: 15,
        color: 'rgba(255, 255, 255, 0.2)' 
     });
  };

  const triggerShake = (intensity: number) => {
    gameState.current.shake = intensity;
  };

  const triggerHitStop = (frames: number) => {
    gameState.current.hitStop = frames;
  };

  const checkCollision = (r1: any, r2: any) => {
    return (r1.x < r2.x + r2.width &&
            r1.x + r1.width > r2.x &&
            r1.y < r2.y + r2.height &&
            r1.y + r1.height > r2.y);
  };

  // Check if boss is cornered (near edges of arena)
  const isBossCornered = (boss: any) => {
    const CORNER_THRESHOLD = 120;
    return boss.x < CORNER_THRESHOLD || boss.x > (ARENA_WIDTH - CORNER_THRESHOLD - boss.width);
  };

  // Boss counter-attack when being combo'd
  const triggerBossCounterAttack = () => {
    const { boss, player } = gameState.current;

    // Hyper armor during counter
    boss.state = 'WINDUP';
    boss.attackType = 'HEAVY';
    boss.isPerilous = Math.random() < 0.4; // 40% chance for perilous counter
    boss.attackTimer = 25; // Fast windup
    boss.maxWindup = 25;
    boss.comboCounter = 0; // Reset combo counter

    // Burst away from corner
    const isLeftCorner = boss.x < ARENA_WIDTH / 2;
    boss.vx = (isLeftCorner ? 1 : -1) * 12;
    boss.vy = -12;

    setLog(boss.isPerilous ? "BOSS: 危险反击！" : "BOSS: 愤怒反击！");
    playCombatSound('PERILOUS');
    spawnSparks(boss.x + boss.width/2, boss.y + 40, 30, '#dc2626');
    triggerShake(10);
  };

  const calculateBossThrustChance = (player: any, boss: any, distance: number, level: number, frame: number) => {
    if (level < 2) return 0;

    const idealRange = distance >= 120 && distance <= 200;
    const extendedRange = distance >= 90 && distance <= 240;
    const playerVulnerable = player.state === 'HEAL' || player.state === 'THRUST_CHARGE';

    if (!extendedRange && !playerVulnerable) return 0;

    let chance = 0.05 + Math.min(0.2, level * 0.01);
    if (idealRange) {
      chance += 0.35;
    } else if (extendedRange) {
      chance += 0.15;
    } else if (playerVulnerable) {
      chance += 0.1;
    }

    if (playerVulnerable) {
      chance += 0.35;
    }

    if (player.state === 'BLOCK') {
      chance += 0.1;
    }

    const movingAway = (player.x < boss.x && player.vx < -1.2) || (player.x > boss.x && player.vx > 1.2);
    if (movingAway) {
      chance += 0.1;
    }

    if (boss.posture > boss.maxPosture * 0.65) {
      chance -= 0.1;
    }

    if (boss.lastHitTime > 0 && frame - boss.lastHitTime < 45) {
      chance -= 0.05;
    }

    return Math.max(0, Math.min(0.55, chance));
  };

  // --- PHYSICS: RIGID BODY & ELASTIC COLLISION ---
  const resolveRigidBodyCollision = () => {
    const { player, boss } = gameState.current;

    if (player.x < boss.x + boss.width &&
        player.x + player.width > boss.x &&
        player.y < boss.y + boss.height &&
        player.y + player.height > boss.y) {

      if (boss.state === 'DODGE') return;

      const overlapX1 = (player.x + player.width) - boss.x;
      const overlapX2 = (boss.x + boss.width) - player.x;
      const overlapX = overlapX1 < overlapX2 ? -overlapX1 : overlapX2;

      const totalMass = player.mass + boss.mass;
      const pRatio = boss.mass / totalMass; 
      const bRatio = player.mass / totalMass;

      if (Math.abs(overlapX) < 50) { 
        player.x += overlapX * pRatio;
        boss.x -= overlapX * bRatio;
      }

      const rv = player.vx - boss.vx;
      const normalX = overlapX < 0 ? -1 : 1;
      const velAlongNormal = rv * normalX;

      if (velAlongNormal > 0) return;

      let j = -(1 + ELASTICITY) * velAlongNormal;
      j /= (1 / player.mass + 1 / boss.mass);

      const impulseX = j * normalX;
      
      player.vx += (impulseX / player.mass);
      boss.vx -= (impulseX / boss.mass);
    }
  };

  // --- LOGIC ---
  const update = () => {
    const state = gameState.current;
    
    if (state.hitStop > 0) {
      state.hitStop--;
      return; 
    }

    if (state.gameOver) return;

    if (state.inputBuffer.parry > 0) {
        state.player.parryTimer = PARRY_WINDOW;
        state.inputBuffer.parry--;
    }

    const { player, boss } = state;
    state.frame++;
    if (state.shake > 0) state.shake *= 0.9;
    if (state.flashIntensity > 0) state.flashIntensity -= 0.1;
    if (state.parrySuccessTimer > 0) state.parrySuccessTimer--;

    // Auto-reset combo counter if boss hasn't been hit recently
    const COMBO_RESET_WINDOW = 120; // 2 seconds
    if (boss.lastHitTime > 0 && state.frame - boss.lastHitTime > COMBO_RESET_WINDOW) {
      if (boss.comboCounter > 0) {
        boss.comboCounter = 0;
      }
    }

    // --- SAKURA SPAWN LOGIC ---
    if (state.frame % 8 === 0) { 
        state.sakura.push({
            x: Math.random() * ARENA_WIDTH,
            y: -20,
            vx: (Math.random() - 0.5) * 2, 
            vy: 1 + Math.random() * 1.5, 
            size: 2 + Math.random() * 3,
            swayOffset: Math.random() * Math.PI * 2,
            color: Math.random() > 0.3 ? '#fbcfe8' : '#f9a8d4' 
        });
    }
    for (let i = state.sakura.length - 1; i >= 0; i--) {
        const s = state.sakura[i];
        s.y += s.vy;
        s.x += s.vx + Math.sin(state.frame * 0.02 + s.swayOffset) * 0.5;
        if (s.y > 550) {
            state.sakura.splice(i, 1);
        }
    }

    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
        const sw = state.shockwaves[i];
        sw.radius += 12; 
        sw.alpha -= 0.08;
        if (sw.alpha <= 0) state.shockwaves.splice(i, 1);
    }

    // --- PLAYER MOVEMENT ---
    
    // DASH Logic
    if (player.state === 'DASH') {
        player.dashTimer--;
        if(state.frame % 3 === 0) spawnDashTrail(player);
        
        if (player.dashTimer <= 0) {
            player.state = 'IDLE';
            player.vx *= 0.5; 
        }
    } 
    // THRUST CHARGE LOGIC (Holding E)
    else if (player.state === 'THRUST_CHARGE') {
        player.vx *= 0.8; // Slow down rapidly
        
        if (!controls.current.thrust) {
            // Released -> Attack
            player.state = 'THRUST_RELEASE';
            player.attackTimer = 25; // Active frames
            playCombatSound('THRUST_ATTACK');
            // Burst forward based on charge
            const chargePercent = player.thrustCharge / MAX_CHARGE_FRAMES;
            const dir = player.facingRight ? 1 : -1;
            player.vx = dir * (15 + (chargePercent * 15)); // Huge lunge
            spawnDashTrail(player);
            setLog(chargePercent > 0.8 ? "蓄力突刺！" : "突刺");
        } else {
            // Charging
            if (player.thrustCharge < MAX_CHARGE_FRAMES) {
                player.thrustCharge++;
                if (player.thrustCharge % 20 === 0) {
                    spawnSparks(player.x + player.width/2, player.y + 20, 2, '#fff');
                }
            }
            // Sound loop simulation
            if (state.frame % 30 === 0) playCombatSound('CHARGE');
        }
    }
    // THRUST RELEASE LOGIC
    else if (player.state === 'THRUST_RELEASE') {
        player.attackTimer--;
        // Decelerate after initial burst
        player.vx *= 0.9;
        if (state.frame % 2 === 0) spawnDashTrail(player);

        if (player.attackTimer <= 0) {
            player.state = 'IDLE';
            player.thrustCharge = 0;
        }
    }
    else {
        // Normal Movement
        if (!controls.current.left && !controls.current.right && player.state !== 'HIT' && player.state !== 'FLOATING_PASSAGE') {
            player.vx *= FRICTION;
        }

        const canMove = player.state !== 'HIT' && player.state !== 'ATTACK' && player.state !== 'HEAL' && player.state !== 'FLOATING_PASSAGE' && player.state !== 'THRUST_CHARGE';

        if (canMove) {
            // Slower movement when blocking
            const moveSpeed = controls.current.block ? WALK_SPEED * 0.5 : WALK_SPEED;
            const accel = controls.current.block ? 0.5 : 0.8;

            if (controls.current.left) {
                player.vx -= accel;
                if (player.vx < -moveSpeed) player.vx = -moveSpeed;
                player.facingRight = false;
            }
            if (controls.current.right) {
                player.vx += accel;
                if (player.vx > moveSpeed) player.vx = moveSpeed;
                player.facingRight = true;
            }

            // Don't change state if blocking
            if (!controls.current.block) {
                if (Math.abs(player.vx) > 0.5) {
                    player.state = 'RUN';
                } else {
                    player.state = 'IDLE';
                }
            }

            if (controls.current.jump && player.y === GROUND_Y) {
                player.vy = -14;
            }
        }
    }

    // Check if Thrust should start
    if (controls.current.thrust && player.state === 'IDLE') {
        player.state = 'THRUST_CHARGE';
        player.thrustCharge = 0;
        playCombatSound('CHARGE');
    }

    player.x += player.vx;
    player.y += player.vy;
    player.vy += GRAVITY;
    
    if (player.y > GROUND_Y) { 
      player.y = GROUND_Y; 
      player.vy = 0; 
    }
    if (player.x < 0) { player.x = 0; player.vx = 0; }
    if (player.x > ARENA_WIDTH - player.width) { player.x = ARENA_WIDTH - player.width; player.vx = 0; }

    if (player.attackTimer > 0) player.attackTimer--;
    if (player.parryTimer > 0) player.parryTimer--;
    if (player.toolCooldown > 0) player.toolCooldown--;
    
    // --- HEALING LOGIC ---
    if (controls.current.heal && player.state !== 'DASH' && player.state !== 'ATTACK' && player.state !== 'FLOATING_PASSAGE' && player.state !== 'HIT' && player.y === GROUND_Y) {
       if (propsRef.current.consumeGourd()) {
         player.state = 'HEAL';
         player.healTimer = HEAL_DURATION;
         setLog("喝下伤药葫芦...");
         playCombatSound('HEAL');
         controls.current.heal = false; 
       } else {
         setLog("伤药葫芦空了！");
         controls.current.heal = false;
       }
    }

    if (player.state === 'HEAL') {
      player.vx *= 0.9; 
      player.healTimer--;
      if (state.frame % 5 === 0) {
         spawnSparks(player.x + player.width/2, player.y + player.height/2, 2, '#22c55e');
      }
      if (player.healTimer <= 0) {
        const healAmount = player.maxHp * 0.5;
        player.hp = Math.min(player.maxHp, player.hp + healAmount);
        player.state = 'IDLE';
        setLog(`体力恢复！(${Math.floor(healAmount)})`);
      }
    }

    // --- SHURIKEN TOOL LOGIC (Q Key) ---
    if (controls.current.shuriken && player.toolCooldown <= 0 && player.state !== 'HIT' && player.state !== 'HEAL' && player.state !== 'FLOATING_PASSAGE' && player.state !== 'THRUST_CHARGE') {
        if (propsRef.current.consumeEmblem(1)) {
            setLog("义手忍具：手里剑");
            playCombatSound('THROW');
            player.toolCooldown = 30;
            const dir = player.facingRight ? 1 : -1;
            state.projectiles.push({
                x: player.x + player.width/2 + (20*dir),
                y: player.y + 20,
                vx: dir * 15,
                vy: 0,
                life: 60,
                rotation: 0,
                owner: 'player'
            });
            controls.current.shuriken = false;
        } else {
            if (player.toolCooldown <= 0) {
                setLog("纸人不足！");
                controls.current.shuriken = false;
            }
        }
    }

    // --- FLOATING PASSAGE SKILL LOGIC (S Key) ---
    if (controls.current.floatingPassage && player.toolCooldown <= 0 && player.state !== 'HIT' && player.state !== 'HEAL' && player.state !== 'THRUST_CHARGE') {
       if (propsRef.current.consumeEmblem(3)) {
           setLog("绝技：飞渡浮舟");
           player.state = 'FLOATING_PASSAGE';
           player.attackTimer = 60; 
           player.toolCooldown = 100; 
           controls.current.floatingPassage = false;
           playCombatSound('SWING');
       } else {
           if (player.toolCooldown <= 0) {
             setLog("纸人不足！(需要3个)");
             controls.current.floatingPassage = false;
           }
       }
    }

    // --- FLOATING PASSAGE EXECUTION ---
    if (player.state === 'FLOATING_PASSAGE') {
       const t = 60 - player.attackTimer; 
       const dir = player.facingRight ? 1 : -1;
       player.vx = dir * 2;
       const isHitFrame = t === 0 || t === 10 || t === 20 || t === 30 || t === 50;
       
       if (isHitFrame) {
           playCombatSound('FLURRY');
           const attackBox = {
               x: player.x + (player.facingRight ? 10 : -80),
               y: player.y - 20,
               width: 100,
               height: 80
           };
           spawnSparks(attackBox.x + 40, attackBox.y + 40, 5, '#fff'); 

           if (checkCollision(attackBox, boss)) {
               let dmg = playerStats.attackPower * 0.3; 
               let postureDmg = 1.5 + (playerStats.attackPower * 0.05);
               
               if (boss.state === 'BLOCK') {
                   playCombatSound('BLOCK');
                   spawnSparks(boss.x + 25, boss.y + 40, 5, '#a1a1aa');
                   boss.hp -= Math.max(1, dmg * 0.2); 
                   boss.posture += postureDmg * 0.8; 
               } else {
                   playCombatSound('HIT');
                   spawnSparks(boss.x + 25, boss.y + 40, 8, '#fca5a5');
                   boss.hp -= dmg;
                   boss.posture += postureDmg;
                   boss.state = 'HIT';
                   boss.attackTimer = 8;
                   boss.postureRecoveryTimer = 60;

                   // Track combo only on last hit of Floating Passage (t === 50)
                   if (t === 50) {
                     const COMBO_WINDOW = 90;
                     if (state.frame - boss.lastHitTime < COMBO_WINDOW) {
                       boss.comboCounter++;
                     } else {
                       boss.comboCounter = 1;
                     }
                     boss.lastHitTime = state.frame;
                   }
               }
           }
       }

       if (player.attackTimer <= 0) {
           player.state = 'IDLE';
           player.vx = 0;
       }
    }
    
    // Update Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity effect on shuriken
        p.rotation += 0.5;
        p.life--;

        const pRect = { x: p.x - 5, y: p.y - 5, width: 10, height: 10 };

        // Player's shuriken hitting boss
        if (p.owner === 'player' && checkCollision(pRect, boss)) {
            const canBlock = boss.state === 'IDLE' || boss.state === 'PACE' || boss.state === 'BLOCK' || boss.state === 'RECOVER';
            const blockChance = Math.min(0.95, 0.2 + (level * 0.05));

            if (canBlock && Math.random() < blockChance) {
                playCombatSound('BLOCK');
                spawnSparks(p.x, p.y, 5, '#a1a1aa');
                setLog("BOSS: 格挡手里剑");
                boss.state = 'BLOCK';
                boss.attackTimer = 20;
                boss.vx = 0;
                boss.posture += 0.5;
            } else {
                playCombatSound('CLINK');
                spawnSparks(p.x, p.y, 5, '#60a5fa');
                boss.hp -= Math.max(1, playerStats.attackPower * 0.3);
                boss.posture += 0.5;
                boss.postureRecoveryTimer = 120;
                if (boss.state === 'PACE') {
                    boss.state = 'IDLE';
                    boss.attackTimer = 10;
                    boss.vx = 0;
                }
            }
            state.projectiles.splice(i, 1);
            continue;
        }

        // Boss's shuriken hitting player
        if (p.owner === 'boss' && checkCollision(pRect, player)) {
            // Player can block, parry, or dodge boss shuriken
            let dodged = player.state === 'DASH';

            if (dodged) {
                setLog("闪避手里剑！");
                spawnDashTrail(player);
            } else if (player.parryTimer > 0) {
                // Perfect parry deflects shuriken
                setLog("弹反手里剑！");
                playCombatSound('PARRY');
                spawnSparks(p.x, p.y, 15, '#fcd34d');
                state.parrySuccessTimer = 20;
                // Deflect back
                p.vx = -p.vx * 1.2;
                p.owner = 'player'; // Now it's player's projectile
                continue;
            } else if (controls.current.block) {
                // Block shuriken
                setLog("格挡手里剑");
                playCombatSound('BLOCK');
                spawnSparks(p.x, p.y, 8, '#a1a1aa');
                player.posture += 10;
            } else {
                // Hit by shuriken
                playCombatSound('HIT');
                spawnSparks(player.x, player.y, 10, '#ef4444');
                const dmg = bossData.stats.damage * 0.4;
                player.hp -= dmg;
                player.posture += 5;
                setLog("被手里剑命中！");
            }
            state.projectiles.splice(i, 1);
            continue;
        }

    if (p.life <= 0 || p.x < 0 || p.x > ARENA_WIDTH || p.y > GROUND_Y + 100) {
            state.projectiles.splice(i, 1);
        }
    }

    // --- PLAYER POSTURE RECOVERY ---
    const equipRecovery = playerStats.equipment.reduce((acc, item) => acc + (item.stats.postureRecovery || 0), 0);
    const playerHpPercent = player.hp / player.maxHp;
    let pRecovery = 0.02 + (0.06 * playerHpPercent) + equipRecovery; 
    if (controls.current.block && player.state !== 'HIT' && player.state !== 'ATTACK') {
      pRecovery *= 2.0; 
    }
    if (player.posture > 0) {
      player.posture = Math.max(0, player.posture - pRecovery);
    }

    if (player.state === 'ATTACK' && player.attackTimer === 0) player.state = 'IDLE';
    if (player.state === 'HIT' && player.attackTimer === 0) player.state = 'IDLE';
    if (player.posture > player.maxPosture) player.posture = player.maxPosture;

    if (player.hp <= 0) {
      state.gameOver = true;
      playCombatSound('DEATHBLOW');
      onCombatEnd(false);
    }

    // --- BOSS LOGIC & PHYSICS ---
    const dist = Math.abs(player.x - boss.x);
    boss.faceRight = player.x > boss.x;

    boss.vy += GRAVITY;
    boss.x += boss.vx;
    boss.y += boss.vy;
    boss.vx *= FRICTION; 
    if (boss.dodgeCooldown > 0) boss.dodgeCooldown--;
    if (boss.postureRecoveryTimer > 0) boss.postureRecoveryTimer--;

    if (boss.y > GROUND_Y) {
      boss.y = GROUND_Y;
      boss.vy = 0;
    }
    if (boss.x < 0) { boss.x = 0; boss.vx = 0; }
    if (boss.x > ARENA_WIDTH - boss.width) { boss.x = ARENA_WIDTH - boss.width; boss.vx = 0; }
    
    // *** REACTIVE LOGIC ***
    const playerIsThreat = (player.state === 'ATTACK' || player.state === 'FLOATING_PASSAGE' || player.state === 'THRUST_RELEASE') && player.attackTimer > 5;
    
    if ((boss.state === 'IDLE' || boss.state === 'PACE' || boss.state === 'BLOCK' || boss.state === 'RECOVER') && 
        playerIsThreat) {
        
        const dodgeBaseChance = 0.02 + (level * 0.004);
        const dodgeBoost = (boss.state === 'RECOVER' || boss.state === 'BLOCK') ? 0.15 : 0;
        
        if (boss.dodgeCooldown <= 0 && dist < 180 && Math.random() < (dodgeBaseChance + dodgeBoost)) {
             boss.state = 'DODGE';
             boss.dodgeTimer = 15;
             boss.dodgeCooldown = 120; 
             boss.vx = (boss.faceRight ? -1 : 1) * 15; 
             setLog("BOSS: 迅捷闪避");
             playCombatSound('DASH');
             spawnDashTrail(boss);
        }
        else if (boss.state !== 'BLOCK' && boss.state !== 'DODGE' && dist < 170) {
            // Reaction to Thrust: Try to Mikiri/Block
            let blockChance = 0.01 + (level * 0.003); 
            if (player.state === 'THRUST_RELEASE') {
                // Reward Max Charge: Lower block chance
                if (player.thrustCharge >= MAX_CHARGE_FRAMES) {
                    blockChance = 0.005; // 0.5% chance per frame
                } else {
                    blockChance = 0.02; // 2% chance per frame
                }
            }

            if (Math.random() < blockChance) {
                boss.state = 'BLOCK';
                boss.attackTimer = 45; 
                boss.vx = 0;
                setLog("BOSS: 铁壁防御");
                playCombatSound('BLOCK'); 
            }
        }
    }

    // Boss State Machine
    if (boss.state === 'IDLE') {
      if (boss.attackTimer > 0) boss.attackTimer--;
      if (boss.attackTimer <= 0) {
         // Shuriken attack - mid range (150-350 pixels)
         const shurikenChance = 0.05 + Math.min(0.15, level * 0.005);
         if (dist >= 150 && dist <= 350 && Math.random() < shurikenChance) {
             setLog("BOSS: 手里剑！");
             playCombatSound('THROW');
             const dir = boss.faceRight ? 1 : -1;
             // Boss throws 1-3 shuriken based on level
             const shurikenCount = level > 10 ? 3 : (level > 5 ? 2 : 1);
             for (let i = 0; i < shurikenCount; i++) {
                 setTimeout(() => {
                     state.projectiles.push({
                         x: boss.x + boss.width/2 + (25*dir),
                         y: boss.y + 30,
                         vx: dir * (13 + Math.random() * 4),
                         vy: (Math.random() - 0.5) * 2, // Slight vertical variation
                         life: 80,
                         rotation: 0,
                         owner: 'boss'
                     });
                 }, i * 150); // Stagger throws
             }
             const cooldown = Math.max(70, 110 - level * 2);
             boss.attackTimer = cooldown; // Longer cooldown to prevent spam
             return;
         }

         if (dist > 350 && Math.random() < 0.4) {
             boss.state = 'WINDUP';
             boss.attackType = 'HEAVY';
             boss.maxWindup = 45;
             boss.attackTimer = 45;
             boss.vy = -14;
             boss.vx = (boss.faceRight ? 1 : -1) * 10;
             setLog("BOSS: 飞身跃入");
             spawnDashTrail(boss);
             return;
         }

         if (dist < 300 && dist > 80 && Math.random() < 0.35 && boss.paceTimer <= 0) {
            boss.state = 'PACE';
            boss.paceTimer = 40 + Math.random() * 40;
         }
         else if (dist < 250 && Math.random() < bossData.stats.aggression) {
           boss.state = 'WINDUP';
           const attackRng = Math.random();
           const thrustChance = calculateBossThrustChance(player, boss, dist, level, state.frame);
           const preferSweep = dist < 140;
           let sweepChance = 0;
           if (level > 5) {
             const base = preferSweep ? 0.12 : 0.04;
             const scaling = Math.min(0.12, (level - 5) * 0.01);
             sweepChance = base + scaling;
           }

           if (attackRng < thrustChance) {
             boss.attackType = 'THRUST';
             const playerVulnerable = player.state === 'HEAL' || player.state === 'THRUST_CHARGE';
             const perilousChance = Math.min(0.85, 0.3 + level * 0.03 + (playerVulnerable ? 0.2 : 0));
             boss.isPerilous = Math.random() < perilousChance;
             if (boss.isPerilous) {
               setLog("危！突刺攻击！");
               playCombatSound('PERILOUS');
             } else {
               setLog("BOSS: 突刺！");
             }
           } else if (sweepChance > 0 && attackRng < thrustChance + sweepChance) {
             boss.attackType = 'SWEEP';
             boss.isPerilous = true;
             setLog("危！横扫！跳起或后退！");
             playCombatSound('PERILOUS');
           } else if (attackRng < thrustChance + sweepChance + 0.25) {
             boss.attackType = 'HEAVY';
             boss.isPerilous = false;
             setLog("BOSS 蓄力重击！");
            } else if (attackRng < thrustChance + sweepChance + 0.35) {
              boss.attackType = 'HEAVY';
              boss.isPerilous = true;
              setLog("危！下段攻击！");
              playCombatSound('PERILOUS');
            } else {
              boss.attackType = 'LIGHT';
              boss.isPerilous = false;
              if (level > 3 && Math.random() > 0.5) {
                 boss.moveQueue.push('COMBO');
                 if (level > 10) boss.moveQueue.push('COMBO');
              }
            }
            const props = boss.attackType === 'THRUST' ? ATK_THRUST :
                          (boss.attackType === 'HEAVY' ? ATK_HEAVY :
                          (boss.attackType === 'COMBO' ? ATK_COMBO :
                          (boss.attackType === 'SWEEP' ? ATK_SWEEP : ATK_LIGHT)));
            const speedMod = Math.max(0, (level * 1.5));
            boss.maxWindup = Math.max(20, props.windup - speedMod);
            boss.attackTimer = boss.maxWindup; 
         } else {
            const speed = bossData.stats.speed * (boss.state === 'PACE' ? 0.5 : 1);
            const direction = boss.faceRight ? 1 : -1;
            
            if (dist > 80) {
               boss.vx += direction * (speed * 0.2); 
               if (Math.abs(boss.vx) > speed) boss.vx = direction * speed;
            } else {
               if (Math.random() < 0.05) {
                 boss.state = 'PACE';
                 boss.paceTimer = 20;
                 boss.vy = -7;
                 boss.vx = (boss.faceRight ? -1 : 1) * 8; 
               }
            }
         }
      }
    }
    else if (boss.state === 'DODGE') {
        boss.dodgeTimer--;
        if (state.frame % 3 === 0) spawnDashTrail(boss);
        if (boss.dodgeTimer <= 0) {
            boss.state = 'IDLE';
            boss.attackTimer = 10;
            boss.vx = 0;
        }
    }
    else if (boss.state === 'BLOCK') {
        boss.attackTimer--;
        boss.vx *= 0.5; 
        if (boss.attackTimer <= 0) {
            boss.state = 'IDLE';
            boss.attackTimer = 15; 
        }
    }
    else if (boss.state === 'PACE') {
      boss.paceTimer--;
      if (dist < 100) {
         boss.vx += (boss.faceRight ? -1 : 1) * 0.5; 
      }
      if (Math.random() < 0.02) {
          boss.state = 'WINDUP';
          boss.attackType = 'LIGHT';
          boss.attackTimer = 20;
      }
      if (boss.paceTimer <= 0) {
        boss.state = 'IDLE';
        boss.attackTimer = 10; 
      }
    }
    else if (boss.state === 'WINDUP') {
      boss.attackTimer--;
      boss.faceRight = player.x > boss.x;

      // If cornered during windup, reposition
      const isCornered = isBossCornered(boss);
      if (isCornered && boss.attackTimer > boss.maxWindup * 0.5) {
        const isLeftCorner = boss.x < ARENA_WIDTH / 2;
        // Slide toward center during windup
        boss.vx += (isLeftCorner ? 1 : -1) * 0.8;
      }

      if (boss.attackTimer <= 0) {
        boss.state = 'ATTACK';
        const props = boss.attackType === 'THRUST' ? ATK_THRUST :
                      (boss.attackType === 'HEAVY' ? ATK_HEAVY :
                      (boss.attackType === 'COMBO' ? ATK_COMBO :
                      (boss.attackType === 'SWEEP' ? ATK_SWEEP : ATK_LIGHT)));
        boss.attackTimer = props.active;
        playCombatSound('SWING');

        // Thrust has much faster lunge speed
        const lungeSpeed = boss.attackType === 'THRUST' ? 18 :
                          (boss.attackType === 'HEAVY' ? 9 :
                          (boss.attackType === 'SWEEP' ? 11 :
                          (boss.attackType === 'COMBO' ? 7 : 5)));
        const dir = boss.faceRight ? 1 : -1;
        if (boss.y === GROUND_Y) {
             boss.vx = dir * lungeSpeed;
             // Thrust stays grounded, heavy may jump
             const jumpChance = boss.attackType === 'THRUST' ? 0 :
                               (isCornered ? 0.6 : (boss.attackType === 'HEAVY' ? 0.3 : 0));
             if (Math.random() < jumpChance) {
                 boss.vy = -12;
             }
        }
      }
    } 
    else if (boss.state === 'ATTACK') {
      boss.attackTimer--;
      const props = boss.attackType === 'THRUST' ? ATK_THRUST :
                    (boss.attackType === 'HEAVY' ? ATK_HEAVY :
                    (boss.attackType === 'COMBO' ? ATK_COMBO :
                    (boss.attackType === 'SWEEP' ? ATK_SWEEP : ATK_LIGHT)));
      const hitFrame = Math.floor(props.active / 2);

      if (boss.attackTimer === hitFrame) {
        // Thrust has narrow but long hitbox
        const isThrust = boss.attackType === 'THRUST';
        const isSweep = boss.attackType === 'SWEEP';
        const attackBox = isSweep ? {
          x: boss.x + (boss.faceRight ? -20 : boss.width - props.range + 20),
          y: boss.y + boss.height - 35,
          width: props.range,
          height: 45
        } : {
          x: boss.x + (boss.faceRight ? 0 : -props.range + boss.width),
          y: boss.y + (isThrust ? 20 : -40), // Thrust targets body center
          width: props.range,
          height: isThrust ? 40 : 120 // Thrust is narrow
        };
        
        if (checkCollision(player, attackBox)) {
          let dodged = player.state === 'DASH' && !boss.isPerilous;
          
          if (dodged) {
             setLog("闪避！");
             spawnDashTrail(player);
          } else {
             let damageTaken = false;

             if (player.state === 'HIT' || player.state === 'HEAL' || (player.state === 'DASH' && boss.isPerilous) || player.state === 'THRUST_CHARGE') {
                damageTaken = true;
                if(player.state === 'HEAL' || player.state === 'THRUST_CHARGE') {
                  setLog("动作被打断！");
                  player.state = 'HIT';
                  player.thrustCharge = 0;
                }
             } else if (player.parryTimer > 0 && !isSweep) {
               setLog("完美弹反！");
               playCombatSound('PARRY');
               spawnSparks((player.x + boss.x)/2, player.y + 30, 50, '#fcd34d');
               triggerShake(20);
               triggerHitStop(12);
               state.flashIntensity = 0.8;
               state.parrySuccessTimer = 30; // Show golden aura for 30 frames (0.5 seconds)
               state.shockwaves.push({
                   x: (player.x + boss.x)/2,
                   y: player.y + 30,
                   radius: 10,
                   alpha: 1.0
               });
               
               player.vx = player.facingRight ? -3 : 3;
               boss.vx = boss.faceRight ? -2 : 2;

               // Perfect parry: Boss takes massive posture damage, player takes none
               const parryPostureDamage = (15 + (level * 1.0)) * (boss.attackType === 'HEAVY' ? 2.0 : 1.0);
               boss.posture += parryPostureDamage;

               // Player posture does not increase on perfect parry

               if (boss.attackType === 'HEAVY') {
                  boss.state = 'RECOVER';
                  boss.attackTimer = props.recover + 30; 
                  setLog("BOSS失去平衡！");
                  return; 
               }

             } else if (controls.current.block && !boss.isPerilous && !isSweep) {
               setLog("防御");
               playCombatSound('BLOCK');
               spawnSparks((player.x + boss.x)/2, player.y + 30, 10, '#a1a1aa');
               triggerShake(3);
               triggerHitStop(2);
               
               player.vx = player.facingRight ? -5 : 5;

               player.posture += 65 + (level * 2); 
               if (player.posture >= player.maxPosture) {
                 player.state = 'HIT';
                 player.attackTimer = 120; 
                 player.posture = 0; 
                 setLog("躯干崩坏！(昏厥)");
                 playCombatSound('BREAK');
                 triggerShake(15);
                 spawnSparks(player.x, player.y, 30, '#fff');
               }
             } else {
               damageTaken = true;
             }

             if (damageTaken) {
               const isPerilousHit = boss.isPerilous;
               if (isSweep) {
                 setLog("被横扫掀飞！");
               } else {
                 setLog(isPerilousHit ? "危技命中！(重伤)" : "受到伤害");
               }
               playCombatSound('HIT');
               spawnSparks(player.x, player.y, isPerilousHit ? 60 : 20, '#ef4444');
               triggerShake(isPerilousHit ? 30 : 10);
               triggerHitStop(isPerilousHit ? 12 : 5);
               
               player.vx = boss.faceRight ? (isPerilousHit ? 15 : 8) : (isPerilousHit ? -15 : -8);
               player.vy = isSweep ? -12 : (isPerilousHit ? -8 : -4); 

               let dmg = bossData.stats.damage * props.damageMult;
              if (isPerilousHit) dmg *= 2.35; 

               player.hp -= dmg;
               player.state = 'HIT';
               player.attackTimer = isPerilousHit ? 60 : 25; 
             }
          }
        }
      }

      if (boss.attackTimer <= 0) {
        if (boss.moveQueue.length > 0) {
           boss.state = 'WINDUP';
           boss.attackType = 'COMBO';
           const nextProps = ATK_COMBO;
           boss.maxWindup = nextProps.windup;
           boss.attackTimer = nextProps.windup;
           boss.moveQueue.pop();
        } else {
           boss.state = 'RECOVER';
           boss.attackTimer = props.recover; 
           if (Math.random() < 0.3) {
               boss.vy = -9;
               boss.vx = (boss.faceRight ? -1 : 1) * 8;
           }
        }
      }
    } 
    else if (boss.state === 'RECOVER') {
      boss.attackTimer--;
      boss.vx *= 0.9; 
      if (boss.attackTimer <= 0) {
         boss.state = 'IDLE';
         boss.attackTimer = 20; 
      }
    }
    else if (boss.state === 'HIT') {
      boss.attackTimer--;
      boss.vx *= 0.95;
      if (boss.attackTimer <= 0) {
         const dist = Math.abs(player.x - boss.x);
         const isCornered = isBossCornered(boss);

         // If cornered and player is close, try to escape with higher priority
         if (isCornered && dist < 250) {
            const escapeChance = 0.4 + (level * 0.03); // Higher levels escape more
            if (Math.random() < escapeChance) {
              // Quick escape dash
              boss.state = 'DODGE';
              boss.dodgeTimer = 18;
              boss.dodgeCooldown = 60;
        const isLeftCorner = boss.x < ARENA_WIDTH / 2;
              boss.vx = (isLeftCorner ? 1 : -1) * 18; // Fast escape
              boss.vy = -10; // Jump away
              setLog("BOSS: 脱困！");
              playCombatSound('DASH');
              spawnDashTrail(boss);
            } else {
              boss.state = 'BLOCK';
              boss.attackTimer = 45;
              setLog("BOSS: 强制防御");
            }
         } else if (dist < 200) {
            boss.state = 'BLOCK';
            boss.attackTimer = 45;
            setLog("BOSS: 强制防御");
         } else {
            boss.state = 'IDLE';
            boss.attackTimer = 20;
         }
      }
    }

    resolveRigidBodyCollision();

    if (boss.state !== 'ATTACK' && boss.state !== 'WINDUP' && boss.posture > 0) {
      if (boss.postureRecoveryTimer <= 0) {
          const hpPercent = boss.hp / boss.maxHp;
          const recoveryRate = 0.06 * hpPercent * hpPercent * hpPercent; 
          boss.posture -= Math.max(0.005, recoveryRate); 
      }
    }

    if (boss.posture >= boss.maxPosture) {
      setLog("忍杀！(DEATHBLOW)");
      playCombatSound('DEATHBLOW');
      boss.hp -= boss.maxHp * 0.5; 
      boss.posture = 0;
      spawnSparks(boss.x, boss.y, 80, '#ef4444');
      triggerShake(20);
      triggerHitStop(40);
      boss.state = 'HIT';
      boss.attackTimer = 120; 
      boss.vy = -7; 
    }
    if (boss.hp <= 0) {
      state.gameOver = true;
      playCombatSound('DEATHBLOW');
      onCombatEnd(true);
    }

    // --- PLAYER ATTACK & THRUST ---
    if ((player.state === 'ATTACK' && player.attackTimer === 10) || (player.state === 'THRUST_RELEASE' && player.attackTimer === 20)) { 
       const isThrust = player.state === 'THRUST_RELEASE';
       const thrustRange = 150 + (player.thrustCharge || 0); // Extended range for thrust
       
       const pAttackBox = {
         x: player.x + (player.facingRight ? 30 : -80), // Slightly adjusted x
         y: player.y + (isThrust ? 20 : 0), // Thrust hits lower/mid
         width: isThrust ? thrustRange : 90, // Increased range: Normal was 70 -> now 90, Thrust is huge
         height: isThrust ? 30 : 60
       };
       
       if (checkCollision(pAttackBox, boss)) {
         if (boss.state === 'BLOCK') {
            playCombatSound('BLOCK');
            spawnSparks(boss.x + 25, boss.y + 40, 10, '#a1a1aa'); 
            triggerHitStop(3);
            setLog("被格挡！");
            boss.posture += 5 + (playerStats.attackPower * 0.15);
            boss.vx += player.facingRight ? 5 : -5; 
            player.vx += player.facingRight ? -3 : 3; 
            if (isThrust) {
                player.vx = 0; // Stop thrust momentum on block
                boss.posture += 10; // Thrust does more posture dmg on block
            }
         } else if (boss.state === 'DODGE') {
            setLog("攻击落空！");
         } else {
            playCombatSound('HIT');
            spawnSparks(boss.x + 25, boss.y + 40, 10, '#fca5a5');
            triggerHitStop(4);

            let dmg = playerStats.attackPower;
            if (isThrust) {
                const chargeRatio = (player.thrustCharge || 0) / MAX_CHARGE_FRAMES;
                dmg *= 1.2 + (chargeRatio * 1.0); // Up to 2.2x damage
            }

            boss.hp -= dmg;
            boss.posture += 3 + (playerStats.attackPower * 0.1);
            boss.vx += player.facingRight ? 2 : -2;

            boss.state = 'HIT';
            boss.attackTimer = 12;
            boss.postureRecoveryTimer = 180;

            // Combo counter logic
            const COMBO_WINDOW = 90; // frames (~1.5 seconds)
            if (state.frame - boss.lastHitTime < COMBO_WINDOW) {
              boss.comboCounter++;
            } else {
              boss.comboCounter = 1;
            }
            boss.lastHitTime = state.frame;

            // Check if boss should counter-attack
            const isCornered = isBossCornered(boss);
            const comboThreshold = Math.max(2, 5 - Math.floor(level / 5)); // Easier to trigger at higher levels
            const shouldCounter = boss.comboCounter >= comboThreshold && (isCornered || boss.comboCounter >= comboThreshold + 2);

            if (shouldCounter) {
              // Delay counter by a frame to ensure hit animation plays
              setTimeout(() => triggerBossCounterAttack(), 16);
            }
         }
       } else {
         if (!isThrust) playCombatSound('SWING');
       }
    }

    updateHUD(player.hp, player.maxHp, player.posture, player.maxPosture, boss.hp, boss.maxHp, boss.posture, boss.maxPosture);
  };

  // --- RENDER FUNCTIONS ---
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#e4e4e7';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(width - 100, 100, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, GROUND_Y + 60, width, 200);
    
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 15) {
        const h = 20 + Math.random() * 30;
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y + 60);
        ctx.quadraticCurveTo(i + 5, GROUND_Y + 60 - h/2, i + (Math.random()-0.5)*10, GROUND_Y + 60 - h);
        ctx.stroke();
    }
  };

  const drawWolf = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, state: any, frame: number) => {
    ctx.save();
    ctx.translate(x + w/2, y + h);

    const isRun = state.state === 'RUN';
    const isAttack = state.state === 'ATTACK';
    const isBlock = state.state === 'BLOCK' || state.parryTimer > 0 || (controls.current.block && state.state !== 'HIT' && state.state !== 'ATTACK' && state.state !== 'HEAL' && state.state !== 'FLOATING_PASSAGE' && state.state !== 'THRUST_CHARGE' && state.state !== 'THRUST_RELEASE' && state.state !== 'DASH');
    const isThrust = state.state === 'THRUST_CHARGE' || state.state === 'THRUST_RELEASE';
    const dir = state.facingRight ? 1 : -1;

    // Attack animation phases (18 frames total)
    const attackProgress = isAttack ? (18 - state.attackTimer) / 18 : 0;
    const isWindup = attackProgress < 0.3; // First 30% is windup
    const isSwing = attackProgress >= 0.3 && attackProgress < 0.7; // Middle 40% is swing
    const isRecovery = attackProgress >= 0.7; // Last 30% is recovery

    // Body tilt during movement and attacks
    let bodyTilt = 0;
    if (isRun && !isBlock) {
      bodyTilt = Math.sin(frame * 0.4) * 0.05 * dir;
    }
    if (isAttack && isSwing) {
      // Lean forward during swing
      bodyTilt = dir * 0.1;
    }
    if (isBlock) {
      // Slight forward lean during defensive stance for better balance
      bodyTilt = dir * 0.05;
    }

    ctx.rotate(bodyTilt);

    if (isThrust) {
        // Rotate whole body for thrust lunge
        ctx.rotate(dir * Math.PI / 6);
        ctx.translate(dir * 10, 10);
    }

    // --- LEGS ---
    ctx.fillStyle = '#3f3f46';
    const legOffset = (isRun && !isBlock) ? Math.sin(frame * 0.4) * 12 : 0;
    const legSpeed = Math.abs(state.vx) * 2; // Leg animation speed based on velocity

    ctx.beginPath();
    if (isThrust) {
         // Deep Lunge Legs
        ctx.moveTo(-10, -35);
        ctx.lineTo(-30 * dir, 0);
        ctx.lineTo(-20 * dir, 0);
        ctx.lineTo(0, -35);

        ctx.moveTo(5, -35);
        ctx.lineTo(20 * dir, 0);
        ctx.lineTo(30 * dir, 0);
        ctx.lineTo(15, -35);
    } else if (isBlock) {
        // Defensive stance - one foot forward, lowered center of gravity
        // Back leg (stable)
        ctx.moveTo(-8, -30); // Body slightly lower
        ctx.lineTo(-18 * dir, 0);
        ctx.lineTo(-10 * dir, 0);
        ctx.lineTo(-2, -30);
        // Front leg (forward)
        ctx.moveTo(3, -30);
        ctx.lineTo(22 * dir, 0);
        ctx.lineTo(30 * dir, 0);
        ctx.lineTo(10, -30);
    } else if (isAttack) {
        // Attack stance - wide stable base
        const attackStance = isWindup ? 0 : (isSwing ? 8 : 4);
        ctx.moveTo(-8, -35);
        ctx.lineTo(-18 * dir - attackStance, 0);
        ctx.lineTo(-8 * dir - attackStance, 0);
        ctx.lineTo(2, -35);
        ctx.moveTo(2, -35);
        ctx.lineTo(12 * dir + attackStance, 0);
        ctx.lineTo(22 * dir + attackStance, 0);
        ctx.lineTo(12, -35);
    } else {
        // Normal/Running - smoother leg animation
        ctx.moveTo(-5, -35);
        ctx.lineTo(-15 * dir + legOffset, 0);
        ctx.lineTo(-5 * dir + legOffset, 0);
        ctx.lineTo(5, -35);
        ctx.moveTo(0, -35);
        ctx.lineTo(10 * dir - legOffset, 0);
        ctx.lineTo(20 * dir - legOffset, 0);
        ctx.lineTo(10, -35);
    }
    ctx.fill();

    // --- BODY ---
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    const bodyLower = isBlock ? -30 : -35; // Lower body position when blocking
    const bodyUpper = isBlock ? -60 : -65;
    ctx.moveTo(-12, bodyLower);
    ctx.lineTo(12, bodyLower);
    ctx.lineTo(15, bodyUpper);
    ctx.lineTo(-15, bodyUpper);
    ctx.fill();

    ctx.fillStyle = '#18181b';
    ctx.fillRect(-12, bodyLower - 5, 24, 5);

    // Scarf
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const scarfY = isBlock ? -58 : -63;
    ctx.moveTo(-5 * dir, scarfY);
    const wave = Math.sin(frame * 0.15) * 10;
    const speedTilt = state.vx * 3;
    ctx.bezierCurveTo(
        -20 * dir - speedTilt, scarfY + 3 + wave,
        -30 * dir - speedTilt, scarfY + 23 - wave,
        -35 * dir - speedTilt, scarfY + 43 + wave
    );
    ctx.stroke();

    // --- HEAD ---
    const headY = isBlock ? -65 : -70; // Lower head when blocking
    ctx.fillStyle = '#fecaca';
    ctx.beginPath();
    ctx.arc(0, headY, 9, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(0, headY - 3, 10, Math.PI, 0);
    ctx.moveTo(0, headY - 8);
    ctx.lineTo(-5 * dir, headY - 15);
    ctx.stroke();
    ctx.fill();

    // --- ARMS ---

    // Left Arm (prosthetic arm)
    ctx.strokeStyle = '#3f2e0e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const leftArmStart = isBlock ? -55 : -60;
    ctx.moveTo(-10 * dir, leftArmStart);
    if (isBlock) {
        // Left hand holding kashira (pommel end) - horizontal guard
        ctx.lineTo(-30 * dir, -42);
    } else if (isThrust) {
         ctx.lineTo(10 * dir, -50); // Tucked
    } else if (isAttack) {
        // Left arm follows attack motion
        if (isWindup) {
            ctx.lineTo(-5 * dir, -55); // Pull back
        } else if (isSwing) {
            ctx.lineTo(18 * dir, -50); // Extend forward for balance
        } else {
            ctx.lineTo(10 * dir, -48); // Return
        }
    } else {
        if (state.toolCooldown > 20 && state.state !== 'FLOATING_PASSAGE') {
            ctx.lineTo(30 * dir, -60);
        } else {
            ctx.lineTo(15 * dir, -45);
        }
    }
    ctx.stroke();

    // Right Arm (sword arm)
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const rightArmStart = isBlock ? -55 : -60;
    ctx.moveTo(10 * dir, rightArmStart);
    if (isBlock) {
        // Right hand near tsuba (guard) - horizontal guard
        ctx.lineTo(-12 * dir, -48);
    } else if (state.state === 'FLOATING_PASSAGE') {
         ctx.lineTo(25 * dir, -60);
    } else if (isAttack) {
        // Dynamic arm position during attack
        if (isWindup) {
            // Pull sword back high
            ctx.lineTo(-8 * dir, -75);
        } else if (isSwing) {
            // Extend arm forward during swing
            ctx.lineTo(35 * dir, -55);
        } else {
            // Recovery - arm forward but relaxing
            ctx.lineTo(22 * dir, -58);
        }
    } else if (isThrust) {
         ctx.lineTo(40 * dir, -60); // Reaching forward
    } else {
         ctx.lineTo(-15 * dir, -45);
    }
    ctx.stroke();

    // --- WEAPON ---

    if (state.state === 'FLOATING_PASSAGE') {
        // Floating Passage - rapid slashes
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(25 * dir, -60);
        ctx.quadraticCurveTo(50 * dir, -65, 85 * dir, -50);
        ctx.stroke();

        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(15 * dir, -60);
        ctx.lineTo(25 * dir, -60);
        ctx.stroke();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(20 * dir, -60, 70, -Math.PI/2 + (frame*0.5), Math.PI + (frame*0.5), !state.facingRight);
        ctx.moveTo(20 * dir, -60);
        ctx.arc(20 * dir, -60, 50, -Math.PI, Math.PI, state.facingRight);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

    } else if (isAttack) {
        // Dynamic attack animation
        let swordX, swordY, swordEndX, swordEndY;

        if (isWindup) {
            // Sword pulled back and up
            swordX = -8 * dir;
            swordY = -75;
            swordEndX = -25 * dir;
            swordEndY = -95;
        } else if (isSwing) {
            // Sword swinging forward in arc
            const swingProgress = (attackProgress - 0.3) / 0.4; // 0 to 1 during swing
            const angle = (Math.PI * 0.9 * swingProgress) - Math.PI/3; // Swing arc
            swordX = 35 * dir;
            swordY = -55;
            const swordLength = 90;
            swordEndX = swordX + Math.cos(angle) * swordLength * dir;
            swordEndY = swordY + Math.sin(angle) * swordLength;
        } else {
            // Recovery - sword forward
            swordX = 22 * dir;
            swordY = -58;
            swordEndX = 75 * dir;
            swordEndY = -45;
        }

        // Draw sword
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(swordX, swordY);
        ctx.lineTo(swordEndX, swordEndY);
        ctx.stroke();

        // Sword handle
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 5;
        const handleStartX = isWindup ? -8 * dir : (isSwing ? 35 * dir : 22 * dir);
        const handleStartY = isWindup ? -75 : (isSwing ? -55 : -58);
        ctx.beginPath();
        ctx.moveTo(10 * dir, -60);
        ctx.lineTo(handleStartX, handleStartY);
        ctx.stroke();

        // Sword trail effect during swing
        if (isSwing) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.3 + (attackProgress - 0.3) * 1.5;
            ctx.beginPath();
            // Create smooth arc trail
            const trailRadius = 80;
            const startAngle = -Math.PI/2;
            const endAngle = Math.PI/4;
            ctx.arc(10 * dir, -60, trailRadius, startAngle * dir, endAngle * dir, dir < 0);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            // Speed lines for impact
            if (attackProgress > 0.45 && attackProgress < 0.65) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(swordEndX - (10 * i * dir), swordEndY - (5 * i));
                    ctx.lineTo(swordEndX + (15 * dir), swordEndY + 5);
                    ctx.stroke();
                }
            }
        }
    } else if (state.state === 'THRUST_CHARGE') {
        // Hold sword back
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(40 * dir, -60);
        ctx.lineTo(10 * dir, -60); // Pulled back
        ctx.stroke();
        
        // Charge glow
        const chargeRatio = state.thrustCharge / MAX_CHARGE_FRAMES;
        if (chargeRatio > 0) {
             ctx.fillStyle = `rgba(255, 255, 255, ${chargeRatio})`;
             ctx.shadowBlur = 10 * chargeRatio;
             ctx.shadowColor = '#fff';
             ctx.beginPath();
             ctx.arc(10 * dir, -60, 3 + (chargeRatio * 5), 0, Math.PI*2);
             ctx.fill();
             ctx.shadowBlur = 0;
        }
    } else if (state.state === 'THRUST_RELEASE') {
        // Stab forward
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(40 * dir, -60);
        // Super long thrust
        ctx.lineTo(120 * dir, -60); 
        ctx.stroke();
        
        // Speed lines
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50 * dir, -65); ctx.lineTo(110 * dir, -65);
        ctx.moveTo(50 * dir, -55); ctx.lineTo(100 * dir, -55);
        ctx.stroke();

    } else if (isBlock) {
        // Block stance - sword held diagonally across body
        ctx.save();

        const bladeLength = 60;
        // Pivot point at center of body
        const pivotX = 5 * dir;
        const pivotY = -50;

        // Sword angled diagonally across body (about 30 degrees from horizontal)
        ctx.translate(pivotX, pivotY);
        ctx.rotate(dir * -0.5); // Tilt blade upward toward enemy
        ctx.translate(-pivotX, -pivotY);

        // === KATANA DRAWING ===

        // Blade back (spine/mune) - darker
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pivotX - 15 * dir, pivotY + 2);
        ctx.quadraticCurveTo(
            pivotX + 15 * dir, pivotY - 3,
            pivotX + bladeLength * dir, pivotY - 5
        );
        ctx.stroke();

        // Blade edge (ha) - bright steel
        ctx.strokeStyle = '#f4f4f5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pivotX - 15 * dir, pivotY + 5);
        ctx.quadraticCurveTo(
            pivotX + 15 * dir, pivotY,
            pivotX + bladeLength * dir, pivotY - 2
        );
        ctx.stroke();

        // Blade highlight
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(pivotX - 10 * dir, pivotY + 3);
        ctx.lineTo(pivotX + (bladeLength - 10) * dir, pivotY - 3);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Kissaki (blade tip)
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(pivotX + bladeLength * dir, pivotY - 5);
        ctx.lineTo(pivotX + bladeLength * dir, pivotY + 2);
        ctx.lineTo(pivotX + (bladeLength + 8) * dir, pivotY - 2);
        ctx.closePath();
        ctx.fill();

        // Habaki (blade collar)
        ctx.fillStyle = '#d4af37';
        ctx.beginPath();
        ctx.ellipse(pivotX - 12 * dir, pivotY + 3, 4, 5, dir * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Tsuba (guard)
        ctx.fillStyle = '#1f2937';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(pivotX - 15 * dir, pivotY + 3, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tsuka (handle)
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(pivotX - 18 * dir, pivotY + 3);
        ctx.lineTo(pivotX - 35 * dir, pivotY + 8);
        ctx.stroke();

        // Menuki (handle ornament)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(pivotX - 26 * dir, pivotY + 5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Kashira (pommel)
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.ellipse(pivotX - 37 * dir, pivotY + 9, 4, 3, dir * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    } else {
        // Idle/sheathed stance
        // Scabbard on back
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-15 * dir, -45);
        ctx.lineTo(-48 * dir, -62);
        ctx.stroke();

        // Sword blade (partially visible)
        ctx.strokeStyle = '#e4e4e7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15 * dir, -45);
        ctx.lineTo(-12 * dir, -43);
        ctx.stroke();

        // Breathing animation - subtle sword bob
        const breatheOffset = Math.sin(frame * 0.08) * 1.5;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(-15 * dir, -45 + breatheOffset);
        ctx.lineTo(0, -40 + breatheOffset);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  };

  const drawBossFigure = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, state: any, color: string, frame: number, profile?: BossVisualProfile) => {
    ctx.save();
    ctx.translate(x + w/2, y + h); 
    const dir = state.faceRight ? 1 : -1;

    if (profile && profile.hasCape) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = profile.capeColor || profile.baseColor;
        const flutter = Math.sin(frame * 0.08) * 8;
        ctx.beginPath();
        ctx.moveTo(-w * 0.6, -h * 0.85);
        ctx.quadraticCurveTo(-w * 0.95, -h * 0.2 + flutter, -w * 0.3, -h * 0.05);
        ctx.lineTo(w * 0.3, -h * 0.05);
        ctx.quadraticCurveTo(w * 0.95, -h * 0.25 - flutter, w * 0.55, -h * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    if (state.state === 'HIT') {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#fff';
    }
    if (state.state === 'DODGE') {
        ctx.globalAlpha = 0.6;
        ctx.transform(1, 0, state.vx * 0.05, 1, 0, 0);
    }

    // --- LEGS ---
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#111827';
    ctx.beginPath();
    
    if (state.state === 'DODGE') {
        ctx.moveTo(-10, -h*0.4);
        ctx.lineTo(-35, 0); 
        ctx.moveTo(10, -h*0.4);
        ctx.lineTo(35, 0); 
        
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2; 
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        const lineDir = state.vx > 0 ? -1 : 1;
        ctx.moveTo(10, -h/2);
        ctx.lineTo(50 * lineDir, -h/2 - 5);
        ctx.moveTo(0, -h/2 + 20);
        ctx.lineTo(40 * lineDir, -h/2 + 25);
        ctx.moveTo(-10, -h/3);
        ctx.lineTo(30 * lineDir, -h/3);
        ctx.stroke();
        ctx.restore();
    } else {
        if (y < GROUND_Y - 10) {
            ctx.moveTo(-10, -h*0.4);
            ctx.lineTo(-20, -10); 
            ctx.moveTo(10, -h*0.4);
            ctx.lineTo(20, -10);
        } else {
            ctx.moveTo(-10, -h*0.4);
            ctx.lineTo(-20, 0); 
            ctx.moveTo(10, -h*0.4);
            ctx.lineTo(20, 0); 
        }
    }
    ctx.stroke();

    ctx.fillStyle = profile?.trimColor || '#374151';
    ctx.fillRect(-22, -h*0.5, 20, 25); 
    ctx.fillRect(2, -h*0.5, 20, 25); 


    // --- BODY ---
    let torsoFill: string | CanvasGradient = color;
    if (profile && color === profile.baseColor) {
        const torsoGradient = ctx.createLinearGradient(-w * 0.6, -h * 0.85, w * 0.6, -h * 0.5);
        torsoGradient.addColorStop(0, profile.gradientFrom);
        torsoGradient.addColorStop(1, profile.gradientTo);
        torsoFill = torsoGradient;
    }
    ctx.fillStyle = torsoFill; 
    ctx.beginPath();
    ctx.moveTo(-w*0.5, -h*0.5); 
    ctx.lineTo(w*0.5, -h*0.5); 
    ctx.lineTo(w*0.6, -h*0.85); 
    ctx.lineTo(-w*0.6, -h*0.85); 
    ctx.fill();
    
    ctx.strokeStyle = profile?.accentColor || 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w*0.5, -h*0.6);
    ctx.lineTo(w*0.5, -h*0.6);
    ctx.moveTo(-w*0.55, -h*0.7);
    ctx.lineTo(w*0.55, -h*0.7);
    if (profile?.tier === 'ASHINA') {
        for (let i = -3; i <= 3; i++) {
            ctx.moveTo(i * (w * 0.15), -h * 0.85);
            ctx.lineTo(i * (w * 0.12), -h * 0.5);
        }
    }
    ctx.stroke();

    if (profile) {
        ctx.fillStyle = profile.accentColor;
        ctx.fillRect(-w * 0.5, -h * 0.58, w, 8);
        ctx.fillRect(-w * 0.45, -h * 0.55, w * 0.3, 8);
    }

    // --- SHOULDERS ---
    ctx.fillStyle = profile?.trimColor || '#1f2937'; 
    ctx.fillRect(-w*0.8, -h*0.85, 15, 30);
    ctx.fillRect(w*0.5, -h*0.85, 15, 30);

    // --- HEAD ---
    ctx.fillStyle = '#18181b'; 
    ctx.beginPath();
    ctx.arc(0, -h*0.95, 15, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(0, -h*1.0, 16, Math.PI, 0);
    ctx.fill();
    
    if (profile && profile.hasKabuto) {
        ctx.fillStyle = profile.trimColor;
        ctx.beginPath();
        ctx.moveTo(-30, -h * 1.05);
        ctx.quadraticCurveTo(0, -h * 1.25, 30, -h * 1.05);
        ctx.lineTo(24, -h * 0.95);
        ctx.lineTo(-24, -h * 0.95);
        ctx.closePath();
        ctx.fill();
    }

    ctx.strokeStyle = profile?.accentColor || '#fbbf24'; 
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -h*1.05);
    ctx.lineTo(-25, -h*1.25);
    ctx.moveTo(0, -h*1.05);
    ctx.lineTo(25, -h*1.25);
    ctx.stroke();

    if (profile && profile.hasHorns) {
        ctx.fillStyle = profile.hornColor || profile.accentColor;
        ctx.beginPath();
        ctx.moveTo(-18, -h * 1.05);
        ctx.lineTo(-30, -h * 1.2);
        ctx.lineTo(-24, -h * 1.0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(18, -h * 1.05);
        ctx.lineTo(30, -h * 1.2);
        ctx.lineTo(24, -h * 1.0);
        ctx.closePath();
        ctx.fill();
    }

    if (profile && profile.hasScarf) {
        ctx.fillStyle = profile.scarfColor || profile.accentColor;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.88, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.88);
        ctx.quadraticCurveTo(-dir * 25, -h * 0.95, -dir * 40, -h * 0.78 - Math.sin(frame * 0.15) * 5);
        ctx.lineTo(-dir * 20, -h * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    if (profile && profile.hasPrayerBeads) {
        ctx.strokeStyle = '#fef9c3';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-15, -h * 0.85);
        ctx.quadraticCurveTo(0, -h * 0.75, 15, -h * 0.85);
        ctx.stroke();
        ctx.fillStyle = '#fef3c7';
        for (let i = -15; i <= 15; i += 10) {
            ctx.beginPath();
            ctx.arc(i, -h * 0.82, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (state.state === 'ATTACK' || state.state === 'WINDUP') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-5*dir, -h*0.95, 2, 0, Math.PI*2);
        ctx.fill();
    }

    // --- WEAPON ---
    const handX = 30 * dir;
    const handY = -h*0.6;

    ctx.strokeStyle = '#d1d5db'; 
    ctx.lineWidth = 4; 
    ctx.lineCap = 'square';
    ctx.beginPath();

    const handleGradient = ctx.createLinearGradient(handX, handY, handX + 20*dir, handY+20);
    handleGradient.addColorStop(0, '#4b5563');
    handleGradient.addColorStop(1, '#000');

    if (state.state === 'WINDUP') {
        const isThrust = state.attackType === 'THRUST';
        const isSweep = state.attackType === 'SWEEP';

        if (isThrust) {
            // Thrust windup - sword pulled back, aimed forward
            const bladeLen = 85;
            const tipX = handX - 60*dir; // Pulled back
            const tipY = handY + 5;

            // Handle
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX - 20*dir, handY + 8);
            ctx.stroke();

            // Tsuba
            ctx.fillStyle = '#374151';
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(handX - 22*dir, handY + 8, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Blade back - horizontal pointing backward
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(handX - 25*dir, handY + 5);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();

            // Blade edge
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX - 25*dir, handY + 10);
            ctx.lineTo(tipX, tipY + 5);
            ctx.stroke();

            // Blade tip
            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.moveTo(tipX - 8*dir, tipY);
            ctx.lineTo(tipX, tipY + 3);
            ctx.lineTo(tipX, tipY - 3);
            ctx.closePath();
            ctx.fill();

            // Thrust charge effect - red glow at tip
            if (state.isPerilous) {
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(tipX - 5*dir, tipY, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        } else if (isSweep) {
            // Sweep windup - boss crouches, blade dragging near the floor
            const sweepHandY = handY + 50;
            const sweepTipX = handX + (dir * 120);
            const sweepTipY = sweepHandY + 25;

            // Lower torso hint
            ctx.save();
            ctx.fillStyle = '#111827';
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-w * 0.45, -h * 0.4, w * 0.9, h * 0.2);
            ctx.restore();

            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX + 25*dir, sweepHandY);
            ctx.stroke();

            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.ellipse(handX + 18*dir, sweepHandY - 5, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX + 20*dir, sweepHandY);
            ctx.lineTo(sweepTipX, sweepTipY);
            ctx.stroke();

            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX + 25*dir, sweepHandY + 4);
            ctx.lineTo(sweepTipX + 5*dir, sweepTipY + 2);
            ctx.stroke();

            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.moveTo(sweepTipX + 8*dir, sweepTipY + 2);
            ctx.lineTo(sweepTipX - 2*dir, sweepTipY - 4);
            ctx.lineTo(sweepTipX - 2*dir, sweepTipY + 6);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = state.isPerilous ? '#b91c1c' : '#f59e0b';
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.moveTo(handX + 15*dir, sweepHandY + 5);
            ctx.quadraticCurveTo(handX + 80*dir, sweepHandY + 30, sweepTipX + 25*dir, sweepTipY + 10);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            ctx.strokeStyle = '#fef3c7';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 12]);
            ctx.beginPath();
            ctx.moveTo(handX + 10*dir, sweepHandY + 20);
            ctx.lineTo(sweepTipX + 40*dir, sweepTipY + 35);
            ctx.stroke();
            ctx.setLineDash([]);

        } else {
            // Normal windup - sword raised for attack
            const bladeLen = 80;
            const tipX = handX - 30*dir;
            const tipY = handY - 100;

            // Handle (tsuka)
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX + 15*dir, handY + 20);
            ctx.stroke();

            // Tsuba (guard)
            ctx.fillStyle = '#374151';
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(handX - 2*dir, handY - 5, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Blade back (mune)
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(handX - 5*dir, handY - 8);
            ctx.quadraticCurveTo(tipX + 15*dir, tipY + 40, tipX, tipY);
            ctx.stroke();

            // Blade edge (ha)
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX, handY - 5);
            ctx.quadraticCurveTo(tipX + 20*dir, tipY + 35, tipX + 3*dir, tipY + 3);
            ctx.stroke();

            // Blade tip (kissaki)
            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX + 5*dir, tipY + 8);
            ctx.lineTo(tipX - 3*dir, tipY + 5);
            ctx.closePath();
            ctx.fill();
        }

    } else if (state.state === 'ATTACK') {
        const isThrust = state.attackType === 'THRUST';
        const isSweep = state.attackType === 'SWEEP';

        if (isThrust) {
            // Thrust attack - sword extended forward in a lunge
            const bladeLen = 100;
            const tipX = handX + 95*dir;
            const tipY = handY + 15;

            // Handle - held close to body
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX - 10*dir, handY);
            ctx.lineTo(handX + 5*dir, handY + 5);
            ctx.stroke();

            // Tsuba
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.ellipse(handX + 8*dir, handY + 5, 5, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Blade back - straight horizontal thrust
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(handX + 12*dir, handY + 3);
            ctx.lineTo(tipX - 5*dir, tipY - 2);
            ctx.stroke();

            // Blade edge
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX + 12*dir, handY + 8);
            ctx.lineTo(tipX - 3*dir, tipY + 3);
            ctx.stroke();

            // Blade tip - sharp point
            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - 10*dir, tipY - 5);
            ctx.lineTo(tipX - 10*dir, tipY + 5);
            ctx.closePath();
            ctx.fill();

            // Thrust trail effect - straight line
            ctx.strokeStyle = state.isPerilous ? '#ef4444' : (bossData.visualColor || '#3b82f6');
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.moveTo(handX, handY + 5);
            ctx.lineTo(tipX + 20*dir, tipY);
            ctx.stroke();

            // Speed lines for thrust
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 4; i++) {
                const offsetY = (i - 1.5) * 8;
                ctx.beginPath();
                ctx.moveTo(handX - 20*dir, handY + offsetY);
                ctx.lineTo(handX + 40*dir, handY + 5 + offsetY * 0.5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;

        } else if (isSweep) {
            // Sweep attack - blade carving a low horizontal arc
            const sweepHandY = handY + 55;
            const sweepTipX = handX + 130*dir;
            const sweepTipY = sweepHandY + 15;

            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX - 5*dir, handY);
            ctx.lineTo(handX + 30*dir, sweepHandY);
            ctx.stroke();

            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.ellipse(handX + 32*dir, sweepHandY - 4, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX + 35*dir, sweepHandY);
            ctx.quadraticCurveTo(handX + 70*dir, sweepHandY + 25, sweepTipX, sweepTipY);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX + 38*dir, sweepHandY + 4);
            ctx.quadraticCurveTo(handX + 90*dir, sweepHandY + 32, sweepTipX + 8*dir, sweepTipY + 3);
            ctx.stroke();

            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.moveTo(sweepTipX + 10*dir, sweepTipY + 2);
            ctx.lineTo(sweepTipX - 5*dir, sweepTipY - 6);
            ctx.lineTo(sweepTipX - 2*dir, sweepTipY + 6);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = state.isPerilous ? '#dc2626' : (bossData.visualColor || '#fbbf24');
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.moveTo(handX + 20*dir, sweepHandY + 10);
            ctx.arc(handX - 40*dir, sweepHandY + 10, 140, dir === 1 ? -0.1 : Math.PI - 0.1, dir === 1 ? Math.PI - 0.7 : 0.7, dir !== 1);
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            ctx.strokeStyle = '#fef3c7';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 10]);
            ctx.beginPath();
            ctx.moveTo(handX - 20*dir, sweepHandY + 20);
            ctx.lineTo(sweepTipX + 60*dir, sweepTipY + 35);
            ctx.stroke();
            ctx.setLineDash([]);

        } else {
            // Normal swing attack
            const bladeLen = 85;
            const tipX = handX + 80*dir;
            const tipY = handY + 35;

            // Handle
            ctx.strokeStyle = '#1f2937';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(handX - 15*dir, handY - 15);
            ctx.stroke();

            // Tsuba
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.ellipse(handX + 3*dir, handY + 3, 5, 7, dir * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Blade back
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(handX + 5*dir, handY);
            ctx.quadraticCurveTo(handX + 50*dir, handY + 5, tipX - 5*dir, tipY - 5);
            ctx.stroke();

            // Blade edge
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(handX + 8*dir, handY + 5);
            ctx.quadraticCurveTo(handX + 50*dir, handY + 15, tipX, tipY);
            ctx.stroke();

            // Blade tip
            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(tipX - 8*dir, tipY - 8);
            ctx.lineTo(tipX - 5*dir, tipY + 5);
            ctx.closePath();
            ctx.fill();

            // Attack trail effect
            ctx.strokeStyle = bossData.visualColor || '#dc2626';
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 15;
            ctx.beginPath();
            ctx.moveTo(handX, handY - 40);
            ctx.quadraticCurveTo(handX + 45*dir, handY - 30, handX + 90*dir, handY + 40);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

    } else if (state.state === 'BLOCK') {
        // Defensive stance - vertical katana
        const bladeLen = 70;

        // Handle
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(handX, handY + 15);
        ctx.lineTo(handX, handY + 35);
        ctx.stroke();

        // Tsuba
        ctx.fillStyle = '#374151';
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(handX, handY + 12, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Blade back
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(handX + 3*dir, handY + 8);
        ctx.quadraticCurveTo(handX + 5*dir, handY - 35, handX + 3*dir, handY - bladeLen);
        ctx.stroke();

        // Blade edge
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handX - 2*dir, handY + 8);
        ctx.quadraticCurveTo(handX, handY - 35, handX, handY - bladeLen);
        ctx.stroke();

        // Blade tip
        ctx.fillStyle = '#f4f4f5';
        ctx.beginPath();
        ctx.moveTo(handX - 3*dir, handY - bladeLen);
        ctx.lineTo(handX + 4*dir, handY - bladeLen);
        ctx.lineTo(handX, handY - bladeLen - 10);
        ctx.closePath();
        ctx.fill();

        // Block aura
        ctx.fillStyle = '#3b82f6';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(handX + 5*dir, handY - 30, 18, 50, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

    } else {
        // Idle stance - sword lowered
        const bladeLen = 55;
        const tipX = handX + 50*dir;
        const tipY = handY + 25;

        // Handle
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(handX - 5*dir, handY - 5);
        ctx.lineTo(handX + 8*dir, handY + 8);
        ctx.stroke();

        // Tsuba
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.ellipse(handX + 10*dir, handY + 10, 5, 6, dir * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Blade back
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handX + 12*dir, handY + 12);
        ctx.quadraticCurveTo(handX + 35*dir, handY + 15, tipX - 3*dir, tipY - 3);
        ctx.stroke();

        // Blade edge
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(handX + 14*dir, handY + 15);
        ctx.quadraticCurveTo(handX + 35*dir, handY + 22, tipX, tipY);
        ctx.stroke();

        // Blade tip
        ctx.fillStyle = '#d1d5db';
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 6*dir, tipY - 5);
        ctx.lineTo(tipX - 4*dir, tipY + 4);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const { player, boss, particles, projectiles, shake, frame, sakura } = gameState.current;

    ctx.save();
    const dx = (Math.random() - 0.5) * shake;
    const dy = (Math.random() - 0.5) * shake;
    ctx.translate(dx, dy);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(-10, -10, ctx.canvas.width + 20, ctx.canvas.height + 20);
    drawBackground(ctx, ctx.canvas.width, ctx.canvas.height);

    sakura.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.sin(frame * 0.05 + s.swayOffset)); 
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.size, s.size * 0.6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });

    if (player.state === 'HIT') {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 40, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // Motion blur for fast movement
    if (Math.abs(player.vx) > 3 && player.state !== 'DASH') {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.translate(-player.vx * 1.5, 0);
        drawWolf(ctx, player.x, player.y, player.width, player.height, player, frame);
        ctx.restore();
    }

    // Attack afterimage
    if (player.state === 'ATTACK' && player.attackTimer > 8 && player.attackTimer < 15) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        const prevFrame = frame - 2;
        drawWolf(ctx, player.x, player.y, player.width, player.height, player, prevFrame);
        ctx.restore();
    }

    drawWolf(ctx, player.x, player.y, player.width, player.height, player, frame);

    // Show golden aura only on successful parry
    if (gameState.current.parrySuccessTimer > 0) {
       const successIntensity = gameState.current.parrySuccessTimer / 30; // 30 frames total

       // Golden parry aura
       ctx.fillStyle = 'rgba(252, 211, 77, 0.3)';
       ctx.globalAlpha = successIntensity * 0.8;
       ctx.beginPath();
       const glowSize = 60 + (1 - successIntensity) * 30;
       ctx.arc(player.x + player.width/2, player.y + player.height/2 - 10, glowSize, 0, Math.PI*2);
       ctx.fill();
       ctx.globalAlpha = 1.0;

       // Expanding golden ring
       ctx.strokeStyle = '#fbbf24';
       ctx.lineWidth = 3;
       ctx.globalAlpha = successIntensity * 0.9;
       ctx.beginPath();
       ctx.arc(player.x + player.width/2, player.y + player.height/2 - 10, 40 + (1 - successIntensity) * 40, 0, Math.PI*2);
       ctx.stroke();
       ctx.globalAlpha = 1.0;
    }

    if (player.state === 'HEAL') {
       ctx.fillStyle = '#22c55e';
       ctx.globalAlpha = 0.3;
       ctx.beginPath();
       ctx.arc(player.x + player.width/2, player.y + player.height/2, 40 + Math.sin(frame*0.2)*5, 0, Math.PI*2);
       ctx.fill();
       ctx.globalAlpha = 1.0;
    }
    
    if (player.state === 'DASH') {
       ctx.save();
       ctx.globalAlpha = 0.3;
       ctx.translate(-player.vx * 2, 0);
       drawWolf(ctx, player.x, player.y, player.width, player.height, player, frame);
       ctx.restore();
    }

    projectiles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        // Different colors for player and boss shuriken
        ctx.fillStyle = p.owner === 'player' ? '#e5e7eb' : '#dc2626';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.moveTo(0, -10);
            ctx.lineTo(3, -3);
            ctx.lineTo(0, 0);
            ctx.lineTo(-3, -3);
            ctx.fill();
        }
        ctx.restore();
    });

    let bossColor = bossVisualProfile.baseColor;
    if (boss.state === 'RECOVER') bossColor = '#71717a'; 
    else if (boss.state === 'WINDUP') bossColor = boss.attackType === 'HEAVY' ? '#dc2626' : '#fbbf24';
    else if (boss.state === 'BLOCK') bossColor = '#9ca3af'; 
    else if (boss.state === 'DODGE') bossColor = '#f3f4f6'; 

    if (boss.state === 'DODGE') {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.translate(-boss.vx * 1.5, 0); 
        drawBossFigure(ctx, boss.x, boss.y, boss.width, boss.height, boss, '#9ca3af', frame, bossVisualProfile);
        ctx.restore();
    }

    drawBossFigure(ctx, boss.x, boss.y, boss.width, boss.height, boss, bossColor, frame, bossVisualProfile);
    
    if (boss.state === 'RECOVER') {
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText('硬直中', boss.x, boss.y - 10);
    }

    if (boss.state === 'ATTACK') {
       const props = boss.attackType === 'HEAVY' ? ATK_HEAVY :
                    (boss.attackType === 'COMBO' ? ATK_COMBO :
                    (boss.attackType === 'SWEEP' ? ATK_SWEEP : ATK_LIGHT));
       const progress = 1 - (boss.attackTimer / props.active);
       ctx.save();
       ctx.globalAlpha = boss.attackType === 'HEAVY' ? 0.5 : 0.3;
       ctx.fillStyle = boss.isPerilous ? '#b91c1c' : (boss.attackType === 'HEAVY' ? '#ef4444' : '#f59e0b'); 
       const centerX = boss.x + boss.width / 2;
       const centerY = boss.y + boss.height / 2;
       const radius = props.range; 
       const direction = boss.faceRight ? 1 : -1;
       ctx.beginPath();
       ctx.moveTo(centerX, centerY);
       const startAngle = direction === 1 ? -Math.PI/2 : -Math.PI/2;
       const endAngle = direction === 1 ? Math.PI/2 : -3 * Math.PI/2;
       const currentEndAngle = startAngle + (endAngle - startAngle) * progress;
       ctx.arc(centerX, centerY, radius, startAngle, currentEndAngle, direction === -1);
       ctx.lineTo(centerX, centerY);
       ctx.fill();
       ctx.restore();
    }

    if (boss.isPerilous && (boss.state === 'WINDUP' || boss.state === 'ATTACK')) {
       ctx.fillStyle = '#dc2626';
       ctx.font = 'bold 60px serif';
       ctx.textAlign = 'center';
       ctx.fillText('危', boss.x + boss.width/2, boss.y - 50);
    }

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      if (p.life <= 0) particles.splice(i, 1);
    });
    
    gameState.current.shockwaves.forEach(sw => {
       ctx.save();
       ctx.strokeStyle = `rgba(255, 215, 0, ${sw.alpha})`; 
       ctx.lineWidth = 5;
       ctx.beginPath();
       ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI*2);
       ctx.stroke();
       ctx.restore();
    });

    if (gameState.current.flashIntensity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${gameState.current.flashIntensity})`;
        ctx.fillRect(-100, -100, ctx.canvas.width + 200, ctx.canvas.height + 200);
    }

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.focus();

    const render = () => {
      update();
      draw(ctx);
      requestRef.current = requestAnimationFrame(render);
    };
    requestRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(requestRef.current);
  }, [bossData, level]); 

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const key = e.key.toLowerCase();
      
      if ((key === 'a' || key === 'arrowleft' || key === 'd' || key === 'arrowright') && !e.repeat) {
         const lastTime = lastKeyTime.current[key] || 0;
         if (now - lastTime < DOUBLE_TAP_WINDOW && gameState.current.player.state !== 'DASH' && gameState.current.player.state !== 'HIT' && gameState.current.player.state !== 'THRUST_CHARGE') {
            const isRight = (key === 'd' || key === 'arrowright');
            const dir = isRight ? 1 : -1;
            const player = gameState.current.player;
            const boss = gameState.current.boss;

            const toBossDir = boss.x > player.x ? 1 : -1;
            const movingTowardsBoss = (dir === toBossDir);

            player.state = 'DASH';
            player.dashTimer = DASH_DURATION;
            player.vx = dir * DASH_SPEED;
            player.facingRight = isRight;
            
            if (movingTowardsBoss) {
               player.vy = -4; 
               setLog("突进！");
            } else {
               player.vy = 0;
               setLog("垫步");
            }
            playCombatSound('DASH');
         }
         lastKeyTime.current[key] = now;
      }

      if (key === 'a' || key === 'arrowleft') controls.current.left = true;
      if (key === 'd' || key === 'arrowright') controls.current.right = true;
      if (key === ' ' || key === 'w') controls.current.jump = true;
      if (key === 'r' || key === 'arrowup') controls.current.heal = true;
      if (key === 'q') controls.current.shuriken = true; 
      if (key === 's' || key === 'arrowdown') controls.current.floatingPassage = true; 
      if (key === 'e') controls.current.thrust = true; // Thrust Input
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a' || e.key === 'ArrowLeft') controls.current.left = false;
      if (e.key.toLowerCase() === 'd' || e.key === 'ArrowRight') controls.current.right = false;
      if (e.key === ' ' || e.key.toLowerCase() === 'w') controls.current.jump = false;
      if (e.key.toLowerCase() === 'r' || e.key === 'ArrowUp') controls.current.heal = false;
      if (e.key.toLowerCase() === 'q') controls.current.shuriken = false;
      if (e.key.toLowerCase() === 's' || e.key === 'ArrowDown') controls.current.floatingPassage = false;
      if (e.key.toLowerCase() === 'e') controls.current.thrust = false; // Thrust Release
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { 
        if (gameState.current.player.state === 'IDLE' || gameState.current.player.state === 'RUN') {
          gameState.current.player.state = 'ATTACK';
          gameState.current.player.attackTimer = 18; 
        }
      } else if (e.button === 2) { 
        controls.current.block = true;
        gameState.current.inputBuffer.parry = 6; 
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        controls.current.block = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      tabIndex={0} 
      width={ARENA_WIDTH} 
      height={500} 
      className="border-2 border-zinc-700 rounded shadow-2xl bg-black cursor-crosshair mx-auto focus:outline-none focus:ring-2 focus:ring-amber-900"
    />
  );
};

export default CombatCanvas;
