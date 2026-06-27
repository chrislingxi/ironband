# Ironband Mobile Design Specification
## A Diablo 2-Style Mobile ARPG

---

## 1. Visual Design Language

### 1.1 Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background Dark | `#1a0f0a` | Base sky / void |
| Ground – Camp | `#3d2b1f` | Town / encampment tiles |
| Ground – Wild | `#1f2d1a` | Wilderness / dungeon tiles |
| Player Outline | `#2d1b00` | Character bold outline |
| Health Bar | `#cc2200` | HP fill gradient anchor |
| Mana Bar | `#0044cc` | MP fill gradient anchor |
| Gold | `#ffcc00` | Coin drops, UI gold text |
| Elite Glow | `#ff6600` | Pulsing elite aura |
| XP Bar | `#e0a020` → `#ffe08a` | Experience fill gradient |
| Damage Text – Player Hit | `#ff5e4a` | Damage numbers (red) |
| Damage Text – Kill | `#ffd76b` | Kill numbers (gold) |
| Damage Text – Default | `#ffffff` | Damage numbers (white) |
| UI Panel BG | `#0c0c12d8` | Panels, tooltips |
| UI Border | `#6a5a3a` | Panel borders, button borders |
| UI Text Primary | `#e8e0d0` | Body text |
| UI Text Gold | `#ffe08a` | Highlight text |

### 1.2 Character Proportions (Q-Version / Chibi)

- **Head-to-body ratio**: 1:2.5 (large head = ~40% of total height)
- **Body width**: Wider than realistic (shoulder width ≥ 0.7× body height)
- **Limbs**: Stubby, rounded — no realistic anatomy
- **Outline weight**: 2–3px dark stroke (`#2d1b00` or `#000000`) on all character shapes
- **Shadow**: Soft ellipse beneath character, 35% alpha black
- **Size baseline**: Player radius = 10px (game units map to ~20px screen units at default zoom)

### 1.3 Outline System

All characters and monsters use a **bold procedural outline**:
- Stroke width: 2px for regular enemies, 3px for player and elites
- Color: near-black `#000000` or `#1a0800` (dark brown for warm tones)
- Applied to every drawn shape (body, head, weapon, accessory)
- Elite enemies add a **pulsing glow ring** in their affix color (e.g. orange `#ff6600`)

### 1.4 Animation Principles

1. **Bob**: Characters bob vertically while moving — amplitude = 12% of size, period 90ms
2. **Idle Breath**: Subtle inhale/exhale when still — amplitude = 4% of size, period 600ms
3. **Attack Lunge**: Body shifts 35% of size toward target when attacking
4. **Hit Flash**: Tween to white on damage received; full white at flash=1, lerp back over 250ms
5. **Screen Shake**: Hit → 2.5px; Player hit → 6px; Kill → 7px; decays at 0.85× per frame
6. **Hitstop**: Kill pauses simulation 50ms for weight feel
7. **Elite Pulse**: Glow ring opacity oscillates sin(t/400) between 60%–100%
8. **Death Fade**: Corpse fades from 70% alpha to 10% over 12 seconds

---

## 2. Class-Distinct Silhouettes

### 2.1 Barbarian
- **Proportions**: Extra-wide shoulders (≥1.4× body width), short thick legs
- **Head**: Spiky hair/horns, square jaw, fierce expression dot-eyes
- **Weapon**: Large two-handed sword/axe visible on back or in hand (rectangle + trapezoid)
- **Color identity**: Warm brown/tan skin, dark iron armor plate accent
- **Silhouette read**: Widest character, center of mass low

### 2.2 Amazon
- **Proportions**: Taller and slimmer than Barb (height 10% taller, width 80% of Barb)
- **Head**: Long ponytail that swings during movement
- **Weapon**: Visible bow or javelin beside/behind character body
- **Color identity**: Copper/olive skin, forest-green armor accents
- **Silhouette read**: Tallest character, elegant triangle shape

### 2.3 Sorceress
- **Proportions**: Standard humanoid width, but taller due to pointed hat
- **Head**: Tall pointed witch-hat (adds ~50% extra height above head)
- **Weapon**: Floating staff orb (glowing circle beside hand)
- **Robe**: Bell-shaped lower body wider at hem than waist
- **Color identity**: Purple/blue robes, pale skin, glowing cyan staff orb
- **Silhouette read**: Narrowest shoulders, dramatic hat spike, magical aura glow

---

## 3. Monster Color Coding

| Monster Type | Primary Color | Accent | Notes |
|---|---|---|---|
| Fallen | `#cc4400` (orange-red) | Dark outline | Goblin-like, small |
| Skeleton | `#7a8fa8` (grey-blue) | Off-white bones | Undead AI |
| Zombie | `#5a7a2a` (sickly green) | Purplish shadow | Shambling, slow |
| Hound | `#6b3a1a` (dark brown) | Red eye dot | Beast silhouette |
| Brute | `#4a3060` (dark purple) | Orange highlight | Large beast form |
| Spitter | `#2a5a3a` (deep green) | Acid yellow dot | Ranged caster look |
| Andariel | `#9a1a4a` (deep crimson) | Gold crown | Boss, large |

---

## 4. Projectile Visuals

| Missile Kind | Shape | Color | Trail |
|---|---|---|---|
| Arrow | Elongated diamond (4:1 ratio) | `#c8b88a` cream | 60% alpha trail behind |
| Fireball | Orange filled circle, r=8 | `#ff7a3a` | Ember trail, orange-to-red |
| Ice Bolt | Blue-white elongated shard | `#8fd6ff` | Frost sparkle trail |
| Lightning Bolt | Jagged multi-segment line | `#fff060` | Brief spark burst |
| Nova Ring | Expanding thin ring | `#fff060` | Fade on expand |
| Javelin | Thin rod, elongated | `#a08050` | No trail |

---

## 5. Death Penalty System

### 5.1 Penalty Table by Difficulty

| Difficulty | Respawn Location | HP on Respawn | Gold Penalty | Item Durability |
|---|---|---|---|---|
| **Normal** | In-place (same spot) | 100% HP | None | No damage |
| **Nightmare** | Zone entrance | 50% HP | −10% current gold | No damage |
| **Hell** | Rogue Encampment (camp) | 30% HP | −20% current gold | −20 durability on all equipped items (grey out at 0) |

### 5.2 Durability Rules (Hell Only)
- Each equipped item has `durability: number` and `maxDurability: number` in `ItemBase`
- At 0 durability, item is **broken** (grey icon, no stats applied)
- Repair at blacksmith NPC (costs gold proportional to item level)
- Durability penalty: each death reduces all equipped items by 20 durability points
- New items start at `maxDurability` (varies by slot: weapon 60, armor 80, helm 40, etc.)

### 5.3 Death UI Overlay
```
┌─────────────────────────────────────┐
│           ☠ 你已阵亡                 │
│                                     │
│  惩罚:  -10% 金币 (-234 金)          │
│         重生于区域入口               │
│         HP: 50%                     │
│                                     │
│         [点击重生]                   │
└─────────────────────────────────────┘
```

---

## 6. Control Scheme — 4-Skill Layout

### 6.1 Screen Layout

```
┌──────────────────────────────────┐
│ [HP]  [XP]           [Minimap]  │
│                                  │
│                                  │
│                                  │
│  [Joystick]      [Skill 2][Sk4] │
│                  [Skill 1][Sk3] │
│ [Bag][Book][Quest][Town]         │
└──────────────────────────────────┘
```

- Skills 1–4 arranged in **2×2 grid**, bottom-right corner
- Each skill button: 62×62px circle with icon, name label, cooldown overlay
- Cooldown: **arc/pie wipe** (SVG or Canvas arc) in dark overlay showing remaining %
- Joystick: Left side, activates on any touch in left half; don't use fixed position

### 6.2 Skill Button 4 — Class Signature Ability

| Class | Skill 4 | Effect | Cooldown |
|---|---|---|---|
| Barbarian | 呐喊 (Shout) | +50% defense for 5s, party buff aura | 8s |
| Amazon | 翻滚 (Dodge Roll) | Iframe dash 2 tiles in facing direction | 6s |
| Sorceress | 传送 (Teleport) | Blink to joystick direction, 3-tile range | 5s |

### 6.3 Cooldown Arc Indicator
- **Full circle arc** as SVG `stroke-dasharray` or Canvas arc
- Clockwise wipe from top; remaining = filled arc in `rgba(0,0,0,0.6)`
- Numbers in center showing seconds remaining when CD > 1s
- Button greys out when on cooldown (opacity 0.6)

---

## 7. Class Identity and Build Paths

### 7.1 Barbarian
**Identity**: Melee berserker, damage sponge, crowd controller
- **Combat Loop**: Auto-attack → Bash on single targets → Double Swing for groups → War Cry when swarmed → Shout when outnumbered
- **Build Paths**:
  - *Berserker*: Max Bash + Double Swing, stack Strength for damage
  - *Battle Cry*: Max War Cry + Shout, tank build with high Vitality
  - *Whirlwind* (endgame): Spinning attack through crowds

### 7.2 Amazon
**Identity**: Ranged glass cannon, mobility-focused, pierce/spread specialist
- **Combat Loop**: Stay mobile → Magic Arrow as filler → Multi-Shot for groups → Jab Spear for single-target burst → Dodge Roll out of danger
- **Build Paths**:
  - *Archer*: Max Multiple Shot + Magic Arrow, stack Dexterity
  - *Javazon*: Max Javelin + Charged Strike, balanced Str/Dex
  - *Lightning Fury* (endgame): Nova javelin piercing through packs

### 7.3 Sorceress
**Identity**: Elemental caster, highest burst, fragile, kite playstyle
- **Combat Loop**: Teleport to safe position → Ice Bolt to slow → Fireball for burst → Lightning Nova for surrounded situations
- **Build Paths**:
  - *Blizzard*: Max Ice Bolt + Blizzard, cold-immune skip with fire backup
  - *Meteorb*: Hybrid Meteor + Frozen Orb, covers all non-immune enemies
  - *Lightning* (endgame): Max Chain Lightning, one-shots entire screens

### 7.4 Skill Scaling
- Base damage from `ClassSkillKey.damageMult` × player weapon damage
- Each point invested in a skill tree node: +8% damage mult (cumulative)
- Synergy bonuses: investing in linked skills adds % to primary skill
- Level 20 cap per skill; max 3 skills to level 20 in a single playthrough

---

## 8. Mobile UX Principles

### 8.1 Thumb Zones
- All primary actions (joystick, skill buttons) in **lower 40% of screen**
- All secondary UI (minimap, stats, area name) in **upper 20%**
- Panel open buttons in lower-left; skill buttons in lower-right
- No critical interactions in the dead-center or upper-right (awkward thumb reach)

### 8.2 Touch Targets
- Minimum interactive area: **54×54px** (all action buttons)
- Skill buttons: 62×62px with 14px gap
- Bottom navigation: 54×54px with 10px gaps
- Safe area insets respected on all edges for notch/home indicator

### 8.3 Performance Budget
- Target: 60fps on iPhone 12 / equivalent Android (2020+)
- Max draw calls per frame: 120
- Sprite/particle budget: 50 entities on screen simultaneously
- No real-time shadows; baked ellipse shadow per entity

### 8.4 Feedback Principles
- **Every action has immediate visual response**: attack swing arc, skill glow
- **Audio**: SFX on every hit, pickup, level-up (even if muted — haptic feedback)
- **Damage numbers**: Float and fade, color-coded by source
- **Death**: Clear overlay, penalty displayed immediately, tap to respawn
- **Level-up**: Full-screen flash + large text notice, brief pause

### 8.5 Readability
- Font: System font (`-apple-system`, `PingFang SC`) for CJK; Georgia for fantasy text
- Minimum font size: 11px (body), 13px (important), 22px (damage kill numbers)
- High contrast: all UI text on dark semi-transparent backgrounds
- HP bar always visible when damaged; hidden at full HP to reduce clutter

### 8.6 Accessibility
- Colorblind support: shape-code in addition to color (damage type icons)
- One-handed play possible (all controls reachable with right or left thumb)
- Pause-on-minimize: game pauses when app goes to background
- Auto-save on area transition and every 60 seconds
