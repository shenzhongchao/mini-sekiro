# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Sekiro Lite: Shadow Web" is a 2D browser-based boss rush game inspired by Sekiro, featuring parry mechanics, posture management, AI-generated bosses/loot via Gemini API, and a combat canvas rendered in HTML5. Built with React, TypeScript, and Vite.

## Development Commands

**Install dependencies:**
```bash
npm install
```

**Run development server:**
```bash
npm run dev
```
The app runs on `http://localhost:3000` (configured in vite.config.ts).

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Environment Setup

Set your Gemini API key in `.env.local`:
```
GEMINI_API_KEY=your_key_here
```

The Vite config exposes this as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` for runtime use.

## Architecture

### Game State Flow

The game uses a centralized state machine (`GameState` enum) managed in `App.tsx`:
- **MENU** → Player selects level (grid of 20 levels)
- **LOADING_BOSS** → Calls `generateBossForLevel()` from `geminiService.ts`
- **COMBAT** → Renders `CombatCanvas` component
- **VICTORY** → Calls `generateLoot()`, updates player stats, unlocks next level
- **DEFEAT** → Offers retry or return to menu
- **INVENTORY** → Displays player stats chart and equipment list

### Core Components

**App.tsx**
- Root component managing all game states
- Maintains `PlayerStats` (HP, posture, equipment, gourds, emblems)
- Handles level progression and loot collection
- Renders different screens based on `GameState`

**CombatCanvas.tsx**
- Self-contained combat simulation on HTML5 canvas
- Runs on a fixed 60 Hz simulation clock, with requestAnimationFrame used only to schedule rendering
- Implements:
  - Player controls (WASD movement, mouse for attack/block, Q/E/S for skills)
  - Double-tap dash mechanic (A/D keys)
  - Boss AI state machine (IDLE, WINDUP, ATTACK, BLOCK, DODGE, RECOVER, PACE, HIT)
  - Parry window system (10 active frames, 6-frame input buffer)
  - Posture break mechanics
  - Rigid body collision physics with elastic response
  - VFX (particles, shockwaves, screen shake, hit stop)
  - Special moves: Floating Passage (S), Shuriken (Q), Charged Thrust (E)
- Boss defense reacts once per new player attack, with style-specific choices and cooldowns
- Three move libraries in `utils/bossPatterns.js` (SWORDSMAN, SHADOW, MONK), a 55% HP phase-two transition, telegraph labels, and queued follow-ups
- Uses `updateHUD()` callback to sync combat state to parent

**services/geminiService.ts**
- **Non-Gemini implementation**: Currently uses hardcoded boss/loot generation
- Simulates async delays to mimic API calls
- Boss scaling: HP, posture, aggression, damage, and speed all scale with level
- Loot rarity system with stat scaling based on level and rarity

**types.ts**
- Central type definitions for all game entities
- Key interfaces: `BossData`, `PlayerStats`, `Item`, `CombatResult`
- Enums: `GameState`, `Rarity`

### Combat System Details

**Player Mechanics:**
- Light attack (mouse left click)
- Block/Parry (mouse right click - hold to block, tap during boss attack for parry)
- Dash (double-tap A/D within 250ms)
- Heal (R key, consumes gourd)
- Skills (require spirit emblems):
  - Shuriken (Q): Ranged attack, 1 emblem
  - Floating Passage (S): Multi-hit combo, 2 emblems
  - Charged Thrust (E): Hold to charge, release for powerful lunge

**Boss AI:**
- State-driven behavior with deterministic, style-specific attack sequences and a readable phase-two opener
- PACE state: Boss circles player at mid-range
- DODGE: One style-dependent defensive response per player attack, rate-limited by cooldown
- BLOCK: Can defend against player attacks and projectiles
- Perilous attacks (危): Cannot be blocked, must be dodged or parried
- Posture recovery slows when taking hits
- Deathblow (忍杀) triggers at max posture, deals 50% max HP damage

**Collision & Physics:**
- Rigid body simulation with mass-based impulse resolution
- Player mass: 1.0, Boss mass: 10.0
- Elasticity coefficient: 0.3
- Friction: 0.85
- Ground Y: 350px

### Styling

Uses Tailwind CSS via CDN (imported in index.html). Key design:
- Dark theme (zinc-900 backgrounds)
- Amber accent color (#d97706) for UI highlights
- Red (#ef4444) for danger states
- Monospace and serif fonts for thematic styling
- Chinese text for authenticity (e.g., "只狼：影之网", "死", "危")

## Automated Tests

Run `npm test` to verify combat simulation timing, parry buffering, boss style rotation, move selection, and phase-two transitions via Node.js built-in test runner.

## Important Implementation Notes

1. **No actual Gemini API integration**: Despite the service file name, boss and loot generation is currently deterministic with simulated delays. To integrate real AI generation, implement the `@google/genai` calls in `geminiService.ts`.

2. **Audio system**: `utils/audio.ts` provides `initAudio()`, `playCombatSound()` for SFX. Audio context initialized on first user gesture (level start).

3. **Canvas focus**: Combat canvas needs focus for keyboard input. Click canvas if keys aren't responding.

4. **Performance**: 60 FPS target with particles, VFX, and physics can be demanding. Particle arrays are manually spliced during update loop.

5. **Recharts dependency**: Used for stats visualization in inventory screen.

6. **Path alias**: `@/*` maps to project root in tsconfig.json and vite.config.ts.

7. **TypeScript settings**: Uses `experimentalDecorators: true` and `useDefineForClassFields: false` - respect these if refactoring.

## Common Development Patterns

**Adding a new boss attack:**
1. Add a named pattern to `utils/bossPatterns.js` with `attackType`, `windup`, `perilous`, range, and `chain`
2. Only if adding a genuinely new attack type: implement corresponding state/animation in `CombatCanvas.tsx`
3. Implement hitbox detection in ATTACK state
4. Add VFX calls (sparks, shake, hit stop)

**Adding a new player skill:**
1. Add control flag to `controls` ref
2. Add key binding in `handleKeyDown`
3. Implement state logic in player movement section of `update()`
4. Add visual representation in `drawWolf()`
5. Update UI overlay with cooldown indicator if needed

**Balancing gameplay:**
- Adjust attack timing in `utils/bossPatterns.js`; engine collision/recovery constants remain in `CombatCanvas.tsx`
- Modify scaling formulas in `geminiService.ts` for boss stats
- Change posture recovery rates in combat update loop
