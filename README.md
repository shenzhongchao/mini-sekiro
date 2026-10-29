<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 只狼：影之网 | Sekiro Lite: Shadow Web

**一款受《只狼：影逝二度》启发的2D浏览器Boss Rush游戏**

*A 2D browser-based boss rush game inspired by Sekiro: Shadows Die Twice*

[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[游戏特性](#-游戏特性) • [快速开始](#-快速开始) • [操作指南](#-操作指南) • [技术架构](#-技术架构) • [开发指南](#-开发指南)

</div>

---

## ✨ 游戏特性

### 核心战斗系统
- **弹刀/格挡机制** - 精确时机的弹刀可以大幅削减Boss架势值
- **架势管理** - 玩家与Boss双方都有架势条，架势打满即可处决
- **危险攻击 (危)** - 无法格挡的红字攻击，必须闪避或完美弹刀
- **忍杀处决** - 架势打满后触发华丽处决动画，造成50%最大生命值伤害

### 视觉表现（PR3）
- **水墨夜景** - 月轮、双层山峦、寺门、远树、薄雾、地面碎石与稳定草叶；轻微视差，不移动碰撞区
- **流派专属刀光** - 剑士金、忍者靛、武僧紫；普通斩、重劈、突刺、下段采用不同轨迹
- **打击反馈分层** - 命中白、格挡灰白、弹反金、危技红、忍杀绯红；短时扩散与冲击线，避免大面积遮挡角色
- **轻量镜头语言** - 受限幅度的稳定震动、二阶段轻推镜、边缘暗角与受控闪白
- **HUD 统一** - 更细的血条与架势条、低干扰资源面板和更醒目的战斗提示

### 丰富的战斗技能
- **手里剑** (Q) - 远程投掷攻击，消耗1个形代
- **浮舟渡海** (S) - 多段连击绝技，消耗2个形代
- **蓄力突刺** (E) - 蓄力后释放强力突进攻击
- **闪避** - 双击A/D快速闪避

### Boss AI系统
- **智能状态机** - IDLE/WINDUP/ATTACK/BLOCK/DODGE/RECOVER/PACE多种状态
- **三种战斗风格** - 苇名剑士（连斩与突刺）、孤影忍者（机动与下段）、破戒武僧（长柄重击与横扫），按关卡轮换
- **可学习的连招** - 每次起手由可复现的招式序列决定，不再逐帧随机抽选所有攻击；前摇名称和进度条提示反制时机
- **二阶段战斗** - Boss体力降至55%后，会经过变招过渡并使用新的连击
- **攻防个性** - 不同流派针对玩家起手做不同防御决策；孤影忍者使用定期手里剑连投

### 游戏进程
- **20个挑战关卡** - 难度逐级递增
- **装备收集系统** - 击败Boss获取稀有装备
- **角色成长** - 提升生命值、架势值、攻击力等属性
- **回复葫芦** - 战斗中可使用葫芦回复生命

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/your-username/sekiro-lite.git
cd sekiro-lite

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

游戏将在 `http://localhost:3000` 运行

### 生产构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 运行测试

```bash
npm test
npm run typecheck
```

测试覆盖 60/120/144Hz 刷新率下的战斗计时、弹反输入缓冲、三种Boss招式轮换、二阶段变招、前摇与防御行为，以及视觉主题和冲击反馈。

### 环境配置 (可选)

如需启用AI生成功能，在 `.env.local` 中配置：

```env
GEMINI_API_KEY=your_api_key_here
```

---

## 🎮 操作指南

### 移动控制
| 按键 | 动作 |
|------|------|
| `W` | 跳跃 |
| `A` | 向左移动 |
| `D` | 向右移动 |
| `A/D` 双击 | 闪避冲刺 |

### 战斗控制
| 按键 | 动作 |
|------|------|
| `鼠标左键` | 攻击 |
| `鼠标右键` (按住) | 格挡 |
| `鼠标右键` (点击) | 弹刀 (需在Boss攻击瞬间) |
| `R` | 使用回复葫芦 |

### 技能控制
| 按键 | 技能 | 消耗 |
|------|------|------|
| `Q` | 手里剑 | 1 形代 |
| `S` | 浮舟渡海 | 2 形代 |
| `E` (蓄力) | 蓄力突刺 | - |

### Boss交手方式

| 流派 | 核心招式 | 反制重点 |
|------|---------|---------|
| 苇名剑士 | 二连斩、踏前突刺、一文字 | 抓准弹反节奏；突刺可弹反，需辨识「危」 |
| 孤影忍者 | 回身斩、扫堂腿、突刺、手里剑 | 下段跳跃，突刺弹反，观察游走与连续投射 |
| 破戒武僧 | 长柄横扫、蓄势重劈、回旋双斩 | 留意长前摇和攻击距离；下段必须跳跃或离开范围 |

红色「危」与前摇倒计时用于提前辨认危险招式。Boss在生命降至55%时进入二阶段。

### 战斗技巧
1. **弹刀时机** - 在Boss攻击即将命中时点击右键，成功弹刀会大幅削减Boss架势
2. **观察危字** - 红色"危"字出现时不要格挡，选择闪避或精准弹刀
3. **管理架势** - 持续进攻保持Boss架势积累，架势会随时间恢复
4. **处决时机** - Boss架势打满后靠近并攻击触发忍杀

---

## 🏗 技术架构

### 技术栈
- **前端框架**: React 19.1 + TypeScript 5.8
- **构建工具**: Vite 6.3
- **样式方案**: Tailwind CSS (CDN)
- **图表库**: Recharts
- **渲染**: HTML5 Canvas（固定 60Hz 战斗逻辑，渲染刷新率独立）

### 项目结构

```
sekiro/
├── src/
│   ├── App.tsx              # 主应用组件，游戏状态管理
│   ├── CombatCanvas.tsx     # 战斗画布，核心游戏逻辑
│   ├── types.ts             # TypeScript类型定义
│   ├── services/
│   │   └── geminiService.ts # Boss/装备生成服务
│   └── utils/
│       └── audio.ts         # 音频系统
├── public/                  # 静态资源
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 核心模块

#### 游戏状态机 (App.tsx)
```
MENU → LOADING_BOSS → COMBAT → VICTORY/DEFEAT
                         ↓
                     INVENTORY
```

#### Boss AI 状态机 (CombatCanvas.tsx)
```
IDLE ↔ PACE ↔ WINDUP → ATTACK → RECOVER
  ↓                       ↓
BLOCK ← ← ← ← ← ← ← ← DODGE
  ↓
 HIT
```

### 物理系统
- 刚体碰撞模拟
- 质量比: 玩家 1.0 / Boss 10.0
- 弹性系数: 0.3
- 摩擦系数: 0.85

---

## 🛠 开发指南

### 添加新的Boss攻击

1. 在 `utils/bossPatterns.js` 为指定流派新增招式模式，并在需要新碰撞类型时同步扩展 `CombatCanvas.tsx`：
```typescript
const NEW_ATTACK = {
  windup: 30,    // 前摇帧数
  active: 15,    // 攻击判定帧数
  recover: 20,   // 后摇帧数
  damage: 25,    // 伤害值
  perilous: false // 是否为危险攻击
};
```

2. 在Boss状态机中添加攻击逻辑
3. 实现攻击判定和视觉效果

### 添加新的玩家技能

1. 在 `controls` ref 中添加技能标志
2. 在 `handleKeyDown` 中绑定按键
3. 在 `update()` 函数中实现技能逻辑
4. 在 `drawWolf()` 中添加视觉效果
5. 更新UI显示冷却时间

### 调整游戏平衡

关键参数位于 `CombatCanvas.tsx` 顶部：
- `utils/combatClock.js`: 固定60Hz战斗时钟、弹刀有效窗口（10帧）
- `utils/bossPatterns.js`: 三种Boss的招式、连击、二阶段变化和防御行为
- `utils/visualTheme.js`: 流派色彩、特效语义、持续时间及限幅镜头震动
- `utils/combatVisuals.ts`: 分层夜景、角色落影、刀光、冲击特效、暗角
- 伤害倍率、架势恢复速度等

Boss属性缩放在 `geminiService.ts` 中调整。

---

## 📝 待办事项

- [ ] 实现真实的Gemini API集成
- [ ] 给三个战斗流派补充专属动画与镜头演出
- [ ] 移动端触控支持
- [x] 浏览器存档系统
- [ ] 多语言支持
- [ ] 音效和背景音乐增强

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

<div align="center">

**献给所有热爱《只狼》的玩家**

*Dedicated to all Sekiro fans*

</div>
