import express from 'express';
import cors from 'cors';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { messages, gameContext, isInitialMessage } = req.body;
  
  // Debug logging to see the actual game state
  console.log('Game Context received:', JSON.stringify(gameContext, null, 2));
  console.log('Is initial message:', isInitialMessage);

  // Static game documentation (only for initial message)
  const gameDocumentation = `# Loot Survivor

Loot Survivor is a fully onchain dungeon crawler RPG built on Starknet using the Dojo engine. Navigate through procedurally generated dungeons, battle fierce beasts, overcome deadly obstacles, and collect legendary loot in your quest for survival and glory. The items in the game are dervied from the Loot project.

## Overview

Death Mountain powers Loot Survivor - a token-agnostic, no-code onchain dungeon creator that provides a complete RPG experience. Every action, from combat to loot generation, is verifiable and deterministic on the blockchain.

## Game Systems

### Adventurer System

Create and develop your character with comprehensive RPG mechanics:

- **Stats**: Strength, Dexterity, Vitality, Intelligence, Wisdom, Charisma, Luck
- **Equipment**: Weapon, Chest, Head, Waist, Foot, Hand, Neck, Ring slots
- **Progression**: XP-based leveling with stat point allocation
- **Health**: Starting HP of 100, scalable with Vitality and replenished with potions.

### Combat System

Engage in strategic turn-based combat against beasts:

- **Combat Types**: Weapon triangle system (Magical > Brute > Hunter > Magical)
- **Critical Hits**: Luck based strikes, grows with better Jewelry
- **Flee Mechanics**: Dexterity-based escape chances

### Exploration

Navigate through dangerous dungeons:

- **Beasts**: Fight 75 different beast types with scaling difficulty
- **Obstacles**: 75 unique environmental hazards
- **Loot**: Find items, gold, and XP through exploration
- **Strategic Choices**: Decide when to fight, flee, or explore

### Item System

Collect and upgrade powerful equipment:

- **Tier System**: T1 (Legendary) - T5 (Common) items with inverse pricing
- **Item Evolution**: Items gain "greatness" unlocking suffixes and prefixes
- **Special Powers**: 16 unique suffixes providing stat bonuses
- **Type Advantages**: Strategic equipment choices based on enemy types

Understanding Your Adventurer

When you create a new adventurer, you'll receive:
* ⚔️ Starting Weapon - Random Tier 5 weapon
* 📊 Base Stats - 12 points randomly distributed
* ❤️ Health - 100 HP + VIT bonus

Core Game Loop

The adventure follows a simple cycle:
1. 🔍 Explore - Search for items, gold, and XP
2. ⚔️ Combat - Fight or flee from beasts
3. 📈 Level Up - Allocate stat points
4. 🛍️ Market - Buy equipment and potions
5. 🔄 Repeat - Continue deeper into Death Mountain
Goal: Survive as long as possible!

Exploration is the heart of Loot Survivor's gameplay loop. Every step into the unknown brings potential rewards and deadly dangers. Understanding the exploration system is key to surviving Death Mountain's treacherous depths.
🎲 Random Encounters: Every exploration is a roll of the dice with equal chances for discovery, obstacles, or beasts!

How Exploration Works

When you "Explore", the game rolls for one of three equally likely outcomes:
* 📦 Item Discovery (33.33%) - Find gold, potions, or equipment
* 🪨 Obstacle (33.33%) - Environmental hazards to overcome
* 👹 Beast Encounter (33.33%) - Mandatory combat encounters

Item Discovery Breakdown
When you hit the 33% item discovery chance, it subdivides into:
* 💰 Gold (45% of discoveries) - Currency for market purchases (~15% of all explores)
* 🧪 Health Potion (45% of discoveries) - Restores HP when used (~15% of all explores)
* ⚔️ Equipment (10% of discoveries) - Weapons, armor, jewelry (~3.3% of all explores)

Discovery Types
💰 Gold Discovery

Formula: Gold = Random(1 to Adventurer Level)
Level	Gold Range	Average
5	1-5g	3g
10	1-10g	5.5g
20	1-20g	10.5g
30	1-30g	15.5g
50	1-50g	25.5g
Key Features:
* Amount scales with your level
* Can be saved between explorations
* CHA stat reduces market prices
* Essential for equipment upgrades
* Maximum capacity: 511 gold
💰 Gold Cap: You can only carry up to 511 gold. Any excess is lost, so spend wisely!

⚔️ Equipment Discovery

Equipment discoveries are a part of gear upgrades. When you discover loot (3.3% of all explores), the tier distribution is:
Item Tier	Drop Rate	Of All Explores	Description
T5 (Common)	50%	~1.65%	Basic gear
T4 (Uncommon)	30%	~1.0%	Decent upgrades
T3 (Rare)	12%	~0.4%	Good equipment
T2 (Epic)	6%	~0.2%	Powerful items
T1 (Legendary)	2%	~0.066%	Best in slot
Item assigning: Items are automatically equipped or added to bag if there are free slots. Otherwise, if items are already discovered or there is no space they are converted to gold.

🧪 Health Discovery
Formula: HP = Random(2 to Level × 2)
Level	HP Range	Average	% of Max HP
5	2-10 HP	6 HP	~0.6%
10	2-20 HP	11 HP	~1.1%
20	2-40 HP	21 HP	~2.1%
30	2-60 HP	31 HP	~3.0%
50	2-100 HP	51 HP	~5.0%
Potion Information:
* Found in 15% of all explores
* Instantly restores HP when discovered
* Maximum health: 1023 HP (adventurer cap)
❤️ Health Cap: Adventurers have a maximum health of 1023 HP. Health potions cannot exceed this limit.

⭐ Experience Gains

Exploration provides consistent experience points for leveling up:
XP Source	XP Gained	Scaling	Risk Level
Item Discovery	1	None	Safe
Beast Kills	Beast Level × (Tier Multiplier - 1)	Decayed	High
Obstacles	Same as above	Decayed	Medium

Beast Encounters
⚠️ Mandatory Combat

IMPORTANT: Discovering a beast during exploration always locks you into combat. There is no way to avoid the fight once a beast is encountered.
Combat is Unavoidable:
* Beast encounters force immediate battle
* No option to flee before combat begins
* You must fight until victory, defeat, or successful flee attempt
* See the Battle Guide for detailed combat mechanics

Beast Strength Calculation
When a beast is discovered, its level and health are determined by your adventurer level:
Base Level = 1 + Random(0 to Adventurer Level × 3 - 1)
Final Level = Base Level + Difficulty Bonus

Difficulty Bonuses by Adventurer Level:
Adventurer Level	Difficulty Bonus	Level Range	Average Level
1-19	+0	1-57	~29
20-29	+10	11-97	~54
30-39	+20	21-137	~79
40-49	+40	41-187	~114
50+	+80	81-230+	~155+

Beast Health Formula
Base Health = 1 + Random(0 to Adventurer Level × 20 - 1)
Final Health = Base Health + Health Bonus
Health Bonuses by Adventurer Level:
Adventurer Level	Health Bonus	Health Range	Average Health
1-19	+10	11-390	~200
20-29	+100	101-680	~390
30-39	+200	201-980	~590
40-49	+400	401-1023*	~712
50+	+500	501-1023*	~762
*Capped at maximum health of 1023 HP
⚠️ Power Spikes: Beasts get significantly stronger at levels 20, 30, 40, and 50. Plan your upgrades accordingly!
❤️ Beast Health Cap: Like adventurers, beasts have a maximum health of 1023 HP.

Ambush Disadvantages
Beast encounters during exploration catch you off-guard with several penalties:
* ⚡ Initiative Loss - Beast attacks first in combat
* 🛡️ No Preparation - Cannot switch gear before combat begins

Ambush Avoidance
Ambush Avoidance Formula:
Avoidance Chance = (WIS / Level) × 100%
WIS/Level	Avoidance	Level 10 Example	Level 20 Example
0.5	50%	WIS 5	WIS 10
0.75	75%	WIS 7-8	WIS 15
1.0	100%	WIS 10	WIS 20
1.5	100%	WIS 15	WIS 30
Key Points:
* WIS equal to level = 100% avoidance
* Success rate caps at 100%
* Only applies to beast encounters
* Does not prevent the encounter entirely
👁️ Important: Wisdom helps avoid the ambush penalties, but you will still be locked into combat when a beast is encountered.

Environmental Challenges
🪨 Obstacle System
Obstacles are unavoidable environmental hazards with three distinct categories:
Obstacle Types
✨ Magical Obstacles (25 types)
* Examples: Demonic Altar, Vortex of Despair, Cursed Tomb
* Counter: Hide armor
🗡️ Blade Obstacles (25 types)
* Examples: Pendulum Blades, Poison Darts, Hidden Arrows
* Counter: Metal armor
🔨 Bludgeon Obstacles (25 types)
* Examples: Collapsing Ceiling, Rolling Boulder, Crushing Walls
* Counter: Cloth armor

Obstacle Level Calculation
When an obstacle is encountered, its level is determined using the same formula as beast levels:
Base Level = 1 + Random(0 to Adventurer Level × 3 - 1)
Final Level = Base Level + Difficulty Bonus
Difficulty Bonuses by Adventurer Level:
Adventurer Level	Difficulty Bonus	Obstacle Level Range	Average Level
1-19	+0	1-57	~29
20-29	+10	11-97	~54
30-39	+20	21-137	~79
40-49	+40	41-187	~114
50+	+80	81-230+	~155+
📊 Note: Unlike beasts, obstacles don't have health - they deal damage based on their level if not avoided.

Damage Mitigation
Method	Effect	Requirement
Intelligence	Complete avoidance	INT ≥ obstacle level
Armor Match	50% damage reduction	Correct armor type
No Protection	Full damage	No mitigation

Summary
Exploration provides the foundation for your Death Mountain adventure through consistent rewards and progression opportunities. Understanding the 33/33/33 split between discoveries, obstacles, and beasts helps you make informed decisions about when and how to explore.
Key Takeaways:
* Equal chances for all three outcome types
* Higher levels = better gold and health discoveries
* LUCK influences equipment tier drops
* INT helps avoid obstacles, WIS helps avoid ambushes
* Choose exploration modes based on your current needs

Combat Guide
Combat in Loot Survivor is a turn-based system where preparation meets execution. Every encounter tests your understanding of type advantages, stat optimization, and tactical decision-making. Master the art of battle to survive Death Mountain's deadliest challenges.
🎯 Combat Philosophy: Turn-based combat means every action counts. Sometimes survival means avoiding the fight entirely.

Combat Mechanics
Turn-Based Combat Flow
⏱️ Combat Turn Order
Combat follows a strict turn-based sequence where adventurers always act first:
* Adventurer Turn - Choose your action:
    * ⚔️ Attack the beast
    * 🏃 Attempt to flee
    * 🔄 Switch equipment (beast gets free attack)
* Beast Counterattack - If not defeated or fled:
    * Beast automatically attacks back
    * Targets a random armor slot (1 of 5: Head, Chest, Waist, Foot, Hand)
    * Damage reduced by armor in that specific slot
* Repeat - Combat continues until victory, defeat, or successful escape
💡 Key Insight: Since beasts attack random armor slots, having balanced armor coverage is more important than stacking defense in one slot!

Damage System
⚡ Understanding Power
Power is displayed in combat for the base damage before modifiers. It appears as a number on item and beast info showing the raw damage potential.
Power = Weapon Level × (6 - Weapon Tier)
Combat Damage Modifiers
The full damage amount includes several factors during combat:
* ⚔️ Base Damage - Your Power value (Weapon tier × level formula above)
* 🎯 Type Advantage - +50% when strong, -50% when weak
* 💪 Strength Bonus - +10% damage per STR point
* ✨ Critical Hits - LUCK/100% chance for 100% bonus damage

Type Advantage System
Bludgeon + Metal beats Blade + Hide beats Magic + Cloth beats Bludgeon + Metal
Type Advantage Effects
📈 With Advantage:
* Damage Multiplier: +50%
* Example: 20 base damage → 30 damage output
* Visual Cue: Green damage numbers in combat log
📉 With Disadvantage:
* Damage Multiplier: -50%
* Example: 20 base damage → 10 damage output
* Visual Cue: Red damage numbers in combat log

Strategic Equipment Sets
🛡️ Full Armor Sets
Each armor type excels against specific attacks: Metal resists Blade, Hide resists Magic, Cloth resists Bludgeon. But beware - each has a weakness!
⚔️ Offensive Priority
Your weapon choice matters more than armor. Remember: Bludgeon crushes Hide, Blade slices Cloth, Magic pierces Metal. +50% damage is huge!
🎯 Beast Hunting
When hunting specific beasts, matching your full armor set to counter their attacks is powerful. Know your target and gear up accordingly for maximum survivability.
💡 Pro Strategy: Early game, prioritize covering all armor slots with appropriate types over hunting for higher tiers!

Combat Actions
⚔️ Attack Options
Single Attack
Execute one calculated strike against your opponent.
Stat Influences:
* STR: +10% damage per point
* LUCK: Critical hit chance (LUCK/100%)
* Weapon Tier: Base damage multiplier
Best for: Controlled combat, testing damage, conserving resources
Attack Until Death
Chain attacks automatically until victory or defeat.
⚠️ High Risk Mode:
* No control once initiated
* Fight continues until resolution
* Cannot flee mid-sequence
Use when:
* Beast health is very low
* You have type advantage
* Confident in victory
* Emergency/desperate situations

🏃 Flee Mechanics
Flee Formula:
Success Rate = (DEX / Level) × 100%
DEX/Level	Success	Level 10 Example	Level 20 Example
0.5	50%	DEX 5	DEX 10
0.75	75%	DEX 7-8	DEX 15
1.0	100%	DEX 10	DEX 20
1.5	100%	DEX 15	DEX 30
Key Points:
* DEX equal to level = 100% success
* Success rate caps at 100%
* Failed flee attempts waste a turn
* Ambush encounters have no additional penalties

🛡️ Equipment Switching
You can change your equipment mid-combat to gain type advantages, but the beast gets a free attack when you do. Strategic swapping can turn a losing fight into victory - switch to counter their type for +50% damage or -50% damage reduction.
💡 Important: Bundle all gear changes into one action to minimize the number of free attacks the beast gets. Multiple switches still only give the beast one free attack!

Combat Decision Making
When entering combat, consider these factors:
* 🏃 Flee - When you have low HP, type disadvantage, or facing a stronger beast
* 🔄 Switch Gear - When you have the wrong equipment type and need advantage
* ⚔️ Attack - When you have good matchup and are confident in victory
* 💀 All-Out Attack - When beast has very low HP and victory is guaranteed

Combat Rewards
Experience Points (XP)
💰 Victory Rewards
Defeating beasts grants XP and gold based on their power, with bonuses for finding items:
Base Reward Formulas:
Adventurer XP = Beast Power / 2Item XP = 2 * Adventurer XPGold = Beast Power / 2 (same as XP)
Level Decay:
XP rewards decrease as you level up (2% per level, max 95% reduction)Gold rewards do NOT decay - always full value!
Reward Calculation Examples
Your Level	Beast (T3, Lv10)	Base Rewards	XP After Decay	Gold (No Decay)	Item XP
Level 1	Power: 30	15	15 XP (0%)	15 🪙	30 XP
Level 10	Power: 30	15	12 XP (-20%)	15 🪙	24 XP
Level 25	Power: 30	15	7 XP (-50%)	15 🪙	15 XP
Level 50+	Power: 30	15	1 XP (-95%)	15 🪙	2 XP
💡 Tip: The XP decay encourages fighting appropriate challenges, but gold rewards stay consistent - making every victory valuable!
Summary
Combat success in Loot Survivor comes from understanding type advantages, optimizing your stats, and making tactical decisions. Every battle offers multiple approaches - from switching gear for advantages to knowing when discretion is the better part of valor.
Key Combat Principles:
* Type advantage provides significant damage bonuses/penalties
* STR scaling makes strength investment worthwhile for damage dealers
* DEX equal to your level guarantees successful escapes
* Gear switching can turn losing fights into victories
* Sometimes the best fight is the one you avoid

Leveling up and upgrading your adventurer is a pivotal moment in every Loot Survivor run. Each level brings stat points to allocate and opens the market with fresh items. Master the upgrade system to transform your adventurer from a fragile newcomer into an unstoppable force!
⚡ Power Spike: Every level up is an opportunity to dramatically increase your power. Plan your upgrades carefully!
Upgrade Overview
The upgrade system consists of three key components:
1. Stat Allocation - Distribute points to enhance your adventurer's capabilities
2. Market Refresh - Access new items with each level up
3. Purchase Decisions - Buy equipment and potions from the market
Stat Allocation
Stat Point Distribution
You receive 1 stat point per level to allocate among:
Stat	Effect per Point	Primary Use
STR	+10% attack damage	Combat damage
DEX	Improves flee success	Escaping from beasts
VIT	+15 HP max & current	Health and survival
INT	Aids obstacle avoidance	Avoiding obstacles
WIS	Helps evade beast ambushes	Ambush prevention
CHA	Gold discount on items/potions	Market purchases
LUCK	❌ Cannot upgrade	Item discovery only
🎯 Allocation Note: Consider focusing on 2-3 primary stats rather than spreading points evenly across all stats.

Market System
How Markets Generate
Each level up generates a unique market through random selection:
* 25 Rolls: The game rolls for 25 random items
* No Duplicates: If the same item is rolled multiple times, it only appears once
* Variable Size: Markets can have 1-25 items depending on duplicate rolls
* Level Locked: The same market persists for your entire level
* Fresh on Level Up: New random items appear when you reach the next level

Market Contents
Markets can contain:
* ⚔️ Weapons - All tiers and types
* 🛡️ Armor - Head, chest, waist, foot, and hand pieces
* 💍 Jewelry - Rings and necklaces for stat boosts
* 🧪 Potions - Health and other consumables
Market Strategy
* Check Everything: With limited rolls, valuable items might be rare
* Plan Purchases: The market won't refresh until next level
* CHA Benefits: Higher Charisma reduces all market prices
* Gold Management: Save for critical upgrades vs. immediate needs
💡 Pro Tip: A small market (few items) means many duplicate rolls occurred. Don't expect it to have everything you need!

Stats
Understanding and optimizing your adventurer's stats is crucial for survival in Loot Survivor. Each of the seven core stats plays a vital role in different aspects of gameplay, from combat effectiveness to market efficiency. Master stat allocation to create powerful builds tailored to your playstyle!

Stats Overview
Every adventurer has 7 core stats that define their capabilities:
* Physical Stats: Strength, Dexterity, Vitality
* Mental Stats: Intelligence, Wisdom, Charisma
* Metaphysical: Luck (special stat with unique mechanics)
Each Adventurer starts with 12 random stat points.
📈 Progression Note: You gain 1 stat point per level to allocate freely, except for Luck which can only be increased through items!

The Seven Core Stats
Physical Stats
💪 Strength (STR)
* Effect: +10% attack damage per point
* Formula: Damage = Base × (1 + STR/10)
* Each point increases damage output by 10% with linear scaling and no cap
* Works with all weapon types
* ⚔️ Tip: 10 STR = double damage!
🏃 Dexterity (DEX)
* Effect: Improves flee success rate
* Formula: Success% = (DEX / Level) × 100
* Flee success depends on DEX/Level ratio
* Keep DEX equal to level for guaranteed escapes
* 🏃 Tip: DEX = Level = 100% escape!
❤️ Vitality (VIT)
* Effect: +15 HP per point (instant heal)
* Formula: Max HP = 100 + (VIT × 15)
* Increases maximum and current health
* Base health is 100 HP
* Maximum health cap: 1023 HP
* 🛡️ Tip: VIT upgrades heal instantly!
Mental Stats
🧠 Intelligence (INT)
* Effect: Avoids obstacle damage
* Formula: Avoidance% = (INT / Level) × 100
* Obstacle avoidance based on INT/Level ratio
* Keep INT equal to level for full immunity
* 🧠 Tip: INT = Level = No obstacle damage!
📚 Wisdom (WIS)
* Effect: Prevents ambush penalties
* Formula: Evasion% = (WIS / Level) × 100
* Avoids surprise attack penalties
* Also improves exploration rewards
* 👁️ Tip: Avoids penalties, not the fight!
😎 Charisma (CHA)
* Effect: Market discounts
* Prices: -1 gold/point for items, -2 gold/point for potions (min 1 gold)
* Example: 10 CHA = 10g off items, 20g off potions
* Makes late-game shopping nearly free
* 💰 Tip: High CHA = nearly free shopping!
Metaphysical Stat
🍀 Luck (LUCK)
* The Special Stat - Cannot be upgraded with points, only through equipment!
* Effect: Critical hit chance & better loot
* Formula: Crit Chance = LUCK% (caps at 100)
* Critical Damage: 2× base damage when triggered
* Determines critical hit probability and improves item discovery
* Get LUCK from jewelry items
* 🎰 Tip: Stack jewelry for guaranteed crits!
⚠️ Warning: Dropping jewelry will remove LUCK stats equal to the greatness level of the item dropped!

Suffix Boosts & Item Management
🏆 Enhanced Items
Items with Greatness 15+ gain powerful suffix boost that provide additional stat bonuses beyond base equipment stats. See the Suffix Boost Guide for complete details on all available bonuses.
⚠️ Unequipping Items with Suffix Boosts
When you unequip items with suffix boosts, most stat bonuses are immediately removed from your adventurer. However, there are two important exceptions:
* Vitality (VIT): Remains active even when the item is in your bag
* Charisma (CHA): Remains active even when the item is in your bag
Conclusion
Stats are the foundation of every successful adventurer in Loot Survivor. Whether you choose to be an unstoppable tank, a glass cannon dealing massive damage, or a nimble escape artist, understanding stat mechanics is key to survival. Remember: there's no single "best" build - the optimal stat distribution depends on your playstyle, the items you find, and your ability to adapt to the dungeon's challenges.
🏆 Final Thought: The best stat allocation is one that keeps you alive and progressing. When in doubt, add VIT!

# Combat Mechanics
Combat in Loot Survivor involves complex calculations that determine damage output between adventurers and beasts. Understanding these mechanics helps you optimize your build and strategy.

## Combat Overview
Combat damage is calculated through a series of steps:
1. **Base Damage Calculation** - Weapon tier and level determine base power
2. **Elemental Adjustments** - Type advantages modify damage by ±50%
3. **Bonus Calculations** - All bonuses use elemental adjusted damage:
   - **Strength Bonus** - +10% of elemental damage per STR point
   - **Critical Hit Bonus** - +100% of elemental damage (if triggered)
   - **Special Bonuses** - Name matches (2× or 8× elemental damage)
4. **Total Attack** - Sum of elemental damage + all bonuses
5. **Armor Reduction** - Base armor (tier × level) subtracted from total
6. **Minimum Damage** - Adventurers deal min 4, beasts deal min 2

## Damage Calculation Formula
### Step 1: Base Attack & Defense

Base Attack = Item Level × (6 - Tier)
Base Defense = Armor Level × (6 - Tier)

**Tier Damage Formula:**

| Tier | Formula (6 - Tier) | Example (Level 10) |
|------|-------------------|-------------------|
| **T1** | 10 × (6 - 1) = 10 × 5 | 50 damage |
| **T2** | 10 × (6 - 2) = 10 × 4 | 40 damage |
| **T3** | 10 × (6 - 3) = 10 × 3 | 30 damage |
| **T4** | 10 × (6 - 4) = 10 × 2 | 20 damage |
| **T5** | 10 × (6 - 5) = 10 × 1 | 10 damage |

### Step 2: Elemental Adjustment


Elemental Effect = Base Attack / 2


- **Strong** (Type advantage): Base Attack + Elemental Effect (+50% damage)
- **Fair** (Neutral): Base Attack (no change)  
- **Weak** (Type disadvantage): Base Attack - Elemental Effect (-50% damage)

### Step 3: Add Bonuses (All Based on Elemental Adjusted Damage)


Strength Bonus = (Elemental Adjusted Damage × STR) / 10
Critical Bonus = Elemental Adjusted Damage × 1.0 (if triggered)
Special Bonus = Elemental Adjusted Damage × Multiplier (if name match)

Total Attack = Elemental Adjusted Damage + Strength Bonus + Critical Bonus + Special Bonus


### Step 4: Apply Armor & Calculate Final Damage


Base Armor = Armor Level × (6 - Tier)
Final Damage = MAX(Minimum Damage, Total Attack - Base Armor)

Minimum Damage:
- Adventurer attacks: 4 damage
- Beast attacks: 2 damage


## Combat Type System

### The Three Combat Types

| Combat Type | Weapon | Armor | Strong Against | Weak Against |
|-------------|--------|-------|----------------|-------------|
| **Brute** | Bludgeon | Metal | Hunter | Magical |
| **Hunter** | Blade | Hide | Magical | Brute |
| **Magical** | Magic | Cloth | Brute | Hunter |

### Type Advantage Cycle


Brute → Hunter → Magical → Brute


- **Brute** (Bludgeon + Metal) beats **Hunter** (Blade + Hide)
- **Hunter** (Blade + Hide) beats **Magical** (Magic + Cloth)  
- **Magical** (Magic + Cloth) beats **Brute** (Bludgeon + Metal)

> **Combat Rule:** Type advantage grants +50% damage, disadvantage gives -50% damage

Critical hits provide bonus damage based on your LUCK stat:

### Critical Hit Chance

Crit Chance = LUCK / 100 (%)


| LUCK | Crit Chance |
|------|-------------|
| 0 | 0% |
| 25 | 25% |
| 50 | 50% |
| 75 | 75% |
| 100 | 100% |

### Critical Hit Damage
When a critical hit occurs, bonus damage is added:

- **Critical bonus:** +100% of elemental-adjusted damage
- **Total damage:** 2× the normal damage when a critical hit is rolled

## Name Match Bonuses
High-level beasts (19+) and items (Greatness 19+) have special name prefixes that provide combat bonuses when matched.
### Name Structure
Items and beasts can have names like "**Whisper** **Glow** Demon" where:
- **Prefix 1:** "Whisper" (primary name)
- **Prefix 2:** "Glow" (secondary name)

### Bonus Calculation
| Match Type | Damage Multiplier |
|------------|------------------|
| **Prefix 2 Match** | 2× elemental damage |
| **Prefix 1 Match** | 8× elemental damage |
| **Both Match** | Cumulative (16× total) |

### Important Note

- **Offense**: If your weapon shares a prefix with a beast, you deal bonus damage.
- **Defense**: If your **armor** shares a prefix with a beast, the beast deals bonus damage to you.
> **Pro Tip:** Name matches are a double-edged sword—gear that empowers you against some beasts might leave you vulnerable to others!

## Strength Bonus
The Strength stat provides a direct damage increase:


Strength Bonus = (Elemental Adjusted Damage × STR) / 10


| STR | Damage Increase |
|-----|-----------------|
| 0 | +0% |
| 5 | +50% |
| 10 | +100% |
| 15 | +150% |
| 20 | +200% |

## Combat Example
**Scenario:** Level 10 Adventurer with T3 Blade attacking a Beast with T4 Hide armor

1. Base Attack = 10 (level) × (6 - 3) = 10 × 3 = 30
2. Elemental: Blade vs Hide = Fair (no change) = 30
3. Bonuses (all based on elemental damage of 30):
   - Strength Bonus (STR=5): 30 × 0.5 = +15
   - Critical Hit: None triggered
   - Special Bonus: None
4. Total Attack = 30 + 15 = 45

5. Base Armor = 10 (level) × (6 - 4) = 10 × 2 = 20
6. Final Damage = MAX(4, 45 - 20) = 25 HP


**Alternative with Type Advantage & Critical:**

If using T3 Bludgeon vs Hide (Strong) with critical hit:
1. Base Attack = 30
2. Elemental: 30 + (30/2) = 45 (+50% for type advantage)
3. Bonuses (all based on elemental damage of 45):
   - Strength (STR=5): 45 × 0.5 = +22
   - Critical Hit: 45 × 1.0 = +45
   - Special: None
4. Total Attack = 45 + 22 + 45 = 112

5. Base Armor = 20
6. Final Damage = MAX(4, 112 - 20) = 92 HP!


**Ultimate Example with Name Match:**

T3 Bludgeon "Glow" vs Beast "Glow" (Prefix 2 match):
1. Base Attack = 30
2. Elemental: 30 (neutral)
3. Bonuses (all based on elemental damage of 30):
   - Strength (STR=5): 30 × 0.5 = +15
   - Critical: None
   - Name Match: 30 × 2 = +60 (Prefix 2 match)
4. Total Attack = 30 + 15 + 60 = 105

5. Base Armor = 20
6. Final Damage = MAX(4, 105 - 20) = 85 HP!

Note: If Prefix 1 matched instead, bonus would be 30 × 8 = +240!


## Combat Strategy Tips
### Optimization Guidelines
1. **Prioritize Type Advantages** - +50% damage is a significant boost
2. **Stack STR for Consistent Damage** - Linear scaling with no cap
3. **LUCK for Burst Potential** - Critical hits can turn battles
4. **Match Tier to Level** - Higher tier = more base damage
5. **Name Matching Endgame** - Massive multipliers at high levels

### Common Pitfalls
- Fighting with type disadvantage (-50% damage reduction)
- Neglecting STR investment (missing easy damage boost)
- Using low-tier weapons at high levels
- Ignoring name match opportunities

Market System
The market is your lifeline in Loot Survivor, offering equipment upgrades and life-saving potions. Understanding pricing mechanics and market generation helps you make strategic purchasing decisions that can mean the difference between victory and defeat.
🛍️ Market Philosophy: Every gold piece spent should advance your survival strategy!
Market Overview
🏪 Market Mechanics
* Duration: Same market persists for your entire level
* Refresh: New randomly generated market on next level up
* Purchases: Buy as many items as you can afford
* Inventory: Limited to 15 bag slots + 8 equipped items
Item Pricing
Base Pricing System
💰 Equipment Pricing Formula
Base Price = Item Tier × 4
Tier	Base Price	With 10 CHA	With 20 CHA
T5 (Common)	20 gold	10 gold	1 gold (min)
T4	16 gold	6 gold	1 gold (min)
T3	12 gold	2 gold	1 gold (min)
T2	8 gold	1 gold (min)	1 gold (min)
T1 (Legendary)	4 gold	1 gold (min)	1 gold (min)
Charisma Discount: -1 gold per CHA point (minimum 1 gold)
💡 Important: All purchased items start at Greatness 1. A T1 item may initially be weaker than your leveled T5 equipment - you need to gain experience and level the item to unlock its full potential!
Potion System
Health Potions
🧪 Potion Mechanics
Health Restored: +10 HP per potion
Purchase Limit: Unlimited (buy as many as you can afford)
Price Formula:
Base Price = 1 gold × Adventurer LevelCHA Discount = 2 gold per CHA pointFinal Price = Base - Discount (minimum 1 gold)
Potion Pricing Table
Level	Base Price	1 CHA	5 CHA	10 CHA	15 CHA
1	1g	1g	1g	1g	1g
5	5g	3g	1g	1g	1g
10	10g	8g	1g	1g	1g
20	20g	18g	10g	1g	1g
50	50g	48g	40g	30g	20g
💡 Strategy: High CHA makes potions extremely cheap, allowing bulk healing purchases!
Market Generation
🎲 How Markets Generate
Each level generates a unique market through RNG:
* Game rolls for 25 random items
* Duplicate items are removed (only one instance appears)
* Market size varies from 1-25 items
* Small markets = many duplicate rolls occurred
* Market remains constant until next level

Market Size Probabilities
* 20-25 items: Common (most markets)
* 15-19 items: Occasional
* 10-14 items: Uncommon
* 5-9 items: Rare
* 1-4 items: Very rare (extreme bad luck)
Market Tips & Tricks
🎯 Pro Market Strategies
* Check Everything: Scroll through entire market - gems might be at the bottom
* Type Coverage: Prioritize items that give you type advantages
* Empty Slots: Any armor is better than no armor
Common Mistakes to Avoid
* Overspending Early: Don't buy everything just because you can
* Ignoring CHA: Even 3 CHA dramatically reduces T5 prices
* Potion Neglect: Always keep HP topped up between fights
Summary
The market system rewards strategic planning and smart stat allocation. High Charisma turns the market into your personal armory, while understanding pricing helps you maximize every gold piece. Remember: the best deal is the item that keeps you alive!
Key Market Principles:
* Markets refresh on level up only
* CHA dramatically reduces all prices
* Potions scale with level but CHA discount is powerful
* Small markets mean bad RNG - work with what you get
* Every purchase should advance your survival strategy

Jewelry Items
Jewelry items can be used to increase Luck and unlock special abilities. Luck gives an increased chance of achieving critical hits. Jewelry items will contribute to Luck even when bagged.
Item	Boost
Pendant	3% increase per greatness hide armor defence.
Necklace	3% increase per greatness metal armor defence.
Amulet	3% increase per greatness cloth armor defence.
Bronze Ring	No special ability (economy option).
Silver Ring	+20 Luck boost when equipped at G20 and +1 bonus luck per greatness when equipped.
Gold Ring	3% per greatness increase in gold rewards from beasts.
Platinum Ring	3% per greatness increase in name match damage bonus.
Titanium Ring	3% per greatness increase in critical hit damage bonus.

# Beasts
Beasts are the creatures you'll encounter and battle throughout your adventures in Loot Survivor. Understanding beast types, tiers, and combat advantages is crucial for survival and progression.

## Beast Overview
**75 unique beasts** populate Loot Survivor, each with distinct characteristics:
- **3 Combat Types**: Magical, Hunter, and Brute
- **5 Tiers**: T1 (Legendary) to T5 (Common)
- **Special Names**: High-level beasts gain name prefixes at level 19+
- **Dynamic Generation**: Each encounter uses VRF seeds for true randomness
> **Combat Focus:** Every beast follows the rock-paper-scissors combat system - choose your equipment wisely!

## Beast Tier System

| Tier   | Rarity      | Power Level | Gold Reward | XP Reward | Examples                 |
| ------ | ----------- | ----------- | ----------- | --------- | ------------------------ |
| **T1** | Legendary   | Highest     | 5× level    | Maximum   | Warlock, Griffin, Kraken |
| **T2** | Rare        | High        | 4× level    | High      | Gorgon, Qilin, Titan     |
| **T3** | Uncommon    | Medium      | 3× level    | Medium    | Werewolf, Wyvern, Oni    |
| **T4** | Common      | Low         | 2× level    | Low       | Goblin, Fenrir, Yeti     |
| **T5** | Very Common | Lowest      | 1× level    | Minimum   | Fairy, Bear, Troll       |

**Reward Formula:** Gold = (Tier Multiplier × Beast Level) ÷ 2

## Beast Categories
### 🪄 Magical Beasts (25 Total)
**T1 Legendary (5):** Warlock, Typhon, Jiangshi, Anansi, Basilisk  
**T2 Rare (5):** Gorgon, Kitsune, Lich, Chimera, Wendigo  
**T3 Uncommon (5):** Rakshasa, Werewolf, Banshee, Draugr, Vampire  
**T4 Common (5):** Goblin, Ghoul, Wraith, Sprite, Kappa  
**T5 Very Common (5):** Fairy, Leprechaun, Kelpie, Pixie, Gnome

### 🏹 Hunter Beasts (25 Total)
**T1 Legendary (5):** Griffin, Manticore, Phoenix, Dragon, Minotaur  
**T2 Rare (5):** Qilin, Ammit, Nue, Skinwalker, Chupacabra  
**T3 Uncommon (5):** Weretiger, Wyvern, Roc, Harpy, Pegasus  
**T4 Common (5):** Hippogriff, Fenrir, Jaguar, Satori, Direwolf  
**T5 Very Common (5):** Bear, Wolf, Mantis, Spider, Rat

### 🔨 Brute Beasts (25 Total)
**T1 Legendary (5):** Kraken, Colossus, Balrog, Leviathan, Tarrasque  
**T2 Rare (5):** Titan, Nephilim, Behemoth, Hydra, Juggernaut  
**T3 Uncommon (5):** Oni, Jotunn, Ettin, Cyclops, Giant  
**T4 Common (5):** Nemeanlion, Berserker, Yeti, Golem, Ent  
**T5 Very Common (5):** Troll, Bigfoot, Ogre, Orc, Skeleton


High-level beasts (Level 19+) can gain **special name prefixes** that provide:
- **Enhanced Combat Power**: Named beasts are significantly stronger
- **Bonus Rewards**: Higher gold and XP rewards
- **Collectible Value**: Named beast encounters become permanent achievements
> **Pro Tip:** Named beasts are dangerous but offer the best rewards and collectible potential!
## Beast Encounter Mechanics

### Generation System
- **VRF Seeds**: True randomness for beast selection (configurable in settings)
- **Level Scaling**: Beast power increases with your adventurer level
- **Tier Distribution**: Higher tiers become more common at lower levels
- **Special Names**: 19+ level beasts can gain name prefixes randomly

### Combat Rewards


Gold Reward = (Tier Multiplier × Beast Level) ÷ 2
XP Reward = Minimum 4 + beast tier bonuses

**Bonus Multipliers:**
- Critical hits from LUCK stat
- Name match bonuses (weapon/armor names matching beast names)
- Type advantage damage (+50%)

You are a helpful AI assistant for the Loot Survivor dungeon crawler game. You have access to the player's current game state to provide personalized advice.`;

  // Dynamic game state (sent every message)
  const gameStateContext = `CURRENT GAME STATE:
${gameContext.gameId ? `Game ID: ${gameContext.gameId}` : 'No active game'}
${gameContext.adventurer ? `
Adventurer:
- Level: ${gameContext.adventurer.level || 1}
- Health: ${gameContext.adventurer.health || 0}
- XP: ${gameContext.adventurer.xp || 0}
- Gold: ${gameContext.adventurer.gold || 0}
- Beast Health: ${gameContext.adventurer.beast_health || 0}
- Stat Upgrades Available: ${gameContext.adventurer.stat_upgrades_available || 0}
- Stats: ${gameContext.adventurer.stats ? `Strength ${gameContext.adventurer.stats.strength || 0}, Dexterity ${gameContext.adventurer.stats.dexterity || 0}, Vitality ${gameContext.adventurer.stats.vitality || 0}, Intelligence ${gameContext.adventurer.stats.intelligence || 0}, Wisdom ${gameContext.adventurer.stats.wisdom || 0}, Charisma ${gameContext.adventurer.stats.charisma || 0}, Luck ${gameContext.adventurer.stats.luck || 0}` : 'No stats allocated'}
- Equipment: ${gameContext.adventurer.equipment ? `
  * Weapon: ${gameContext.adventurer.equipment.weapon && gameContext.adventurer.equipment.weapon.id ? `${gameContext.adventurer.equipment.weapon.name || `Item #${gameContext.adventurer.equipment.weapon.id}`} [T${gameContext.adventurer.equipment.weapon.tier || '?'} ${gameContext.adventurer.equipment.weapon.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.weapon.level || 1}]` : 'None'}
  * Chest: ${gameContext.adventurer.equipment.chest && gameContext.adventurer.equipment.chest.id ? `${gameContext.adventurer.equipment.chest.name || `Item #${gameContext.adventurer.equipment.chest.id}`} [T${gameContext.adventurer.equipment.chest.tier || '?'} ${gameContext.adventurer.equipment.chest.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.chest.level || 1}]` : 'None'}
  * Head: ${gameContext.adventurer.equipment.head && gameContext.adventurer.equipment.head.id ? `${gameContext.adventurer.equipment.head.name || `Item #${gameContext.adventurer.equipment.head.id}`} [T${gameContext.adventurer.equipment.head.tier || '?'} ${gameContext.adventurer.equipment.head.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.head.level || 1}]` : 'None'}
  * Waist: ${gameContext.adventurer.equipment.waist && gameContext.adventurer.equipment.waist.id ? `${gameContext.adventurer.equipment.waist.name || `Item #${gameContext.adventurer.equipment.waist.id}`} [T${gameContext.adventurer.equipment.waist.tier || '?'} ${gameContext.adventurer.equipment.waist.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.waist.level || 1}]` : 'None'}
  * Foot: ${gameContext.adventurer.equipment.foot && gameContext.adventurer.equipment.foot.id ? `${gameContext.adventurer.equipment.foot.name || `Item #${gameContext.adventurer.equipment.foot.id}`} [T${gameContext.adventurer.equipment.foot.tier || '?'} ${gameContext.adventurer.equipment.foot.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.foot.level || 1}]` : 'None'}
  * Hand: ${gameContext.adventurer.equipment.hand && gameContext.adventurer.equipment.hand.id ? `${gameContext.adventurer.equipment.hand.name || `Item #${gameContext.adventurer.equipment.hand.id}`} [T${gameContext.adventurer.equipment.hand.tier || '?'} ${gameContext.adventurer.equipment.hand.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.hand.level || 1}]` : 'None'}
  * Neck: ${gameContext.adventurer.equipment.neck && gameContext.adventurer.equipment.neck.id ? `${gameContext.adventurer.equipment.neck.name || `Item #${gameContext.adventurer.equipment.neck.id}`} [T${gameContext.adventurer.equipment.neck.tier || '?'} ${gameContext.adventurer.equipment.neck.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.neck.level || 1}]` : 'None'}
  * Ring: ${gameContext.adventurer.equipment.ring && gameContext.adventurer.equipment.ring.id ? `${gameContext.adventurer.equipment.ring.name || `Item #${gameContext.adventurer.equipment.ring.id}`} [T${gameContext.adventurer.equipment.ring.tier || '?'} ${gameContext.adventurer.equipment.ring.type || 'Unknown'}, Level ${gameContext.adventurer.equipment.ring.level || 1}]` : 'None'}` : 'No equipment'}
` : 'No adventurer created'}
${gameContext.beast ? `
Current Beast:
- Name: ${gameContext.beast.name || 'Unknown Beast'}
- Level: ${gameContext.beast.level || 0}
- Health: ${gameContext.beast.health || 0}
- Type: ${gameContext.beast.type || 'Unknown'}
` : 'No beast encountered'}
${gameContext.bag && gameContext.bag.length > 0 ? `
Bag Items: ${gameContext.bag.map(item => `${item.name} [T${item.tier || '?'} ${item.type || 'Unknown'}, Level ${item.level || 1}]`).join(', ')}` : ''}
${gameContext.abilityPercentages ? `

ABILITY CHANCES:
- Flee Success: ${gameContext.abilityPercentages.fleeChance}%
- Obstacle Avoidance: ${gameContext.abilityPercentages.obstacleAvoidance}%
- Ambush Avoidance: ${gameContext.abilityPercentages.ambushAvoidance}%` : ''}
${gameContext.quest ? `
Active Quest: ${gameContext.quest.name || 'Unknown Quest'}` : ''}
${gameContext.collectableCount ? `
Beasts Collected: ${gameContext.collectableCount}` : ''}
${gameContext.combatStats ? `

COMBAT ANALYSIS:
- Your Base Damage: ${gameContext.combatStats.yourDamage?.baseDamage || 0}
- Your Critical Damage: ${gameContext.combatStats.yourDamage?.criticalDamage || 0}
- Beast Damage to You:
  * If hitting Head: ${gameContext.combatStats.beastDamageToYou?.head || 0}
  * If hitting Chest: ${gameContext.combatStats.beastDamageToYou?.chest || 0}
  * If hitting Waist: ${gameContext.combatStats.beastDamageToYou?.waist || 0}
  * If hitting Hand: ${gameContext.combatStats.beastDamageToYou?.hand || 0}
  * If hitting Foot: ${gameContext.combatStats.beastDamageToYou?.foot || 0}
- Best Available Damage: ${gameContext.combatStats.bestDamage || 0}
- Current Protection: ${gameContext.combatStats.protection || 0}
- Best Available Protection: ${gameContext.combatStats.bestProtection || 0}
- Gear Score: ${gameContext.combatStats.gearScore || 0}
${gameContext.combatStats.bestItems && gameContext.combatStats.bestItems.length > 0 ? `- Recommended Equipment: ${gameContext.combatStats.bestItems.map(item => item.name || `Item #${item.id}`).join(', ')}` : ''}` : ''}
${gameContext.selectedStats ? `
Unallocated Stat Points - Strength: ${gameContext.selectedStats.strength}, Dexterity: ${gameContext.selectedStats.dexterity}, Vitality: ${gameContext.selectedStats.vitality}, Intelligence: ${gameContext.selectedStats.intelligence}, Wisdom: ${gameContext.selectedStats.wisdom}, Charisma: ${gameContext.selectedStats.charisma}, Luck: ${gameContext.selectedStats.luck}` : ''}
${gameContext.marketItems && gameContext.marketItems.length > 0 ? `
Market Items Available for purchase:
${gameContext.marketItems.map(item => `- ${item.name} (${item.type}, Tier ${item.tier}, Price: ${item.price} gold)`).join('\n')}` : ''}
${gameContext.potionPrice !== null && gameContext.potionPrice !== undefined ? `
Health Potion Price: ${gameContext.potionPrice} gold` : ''}

Use this game state information to provide contextual, helpful advice about strategies, next steps, equipment choices, stat allocation, and combat tactics. Be specific to the player's current situation. Note: market is not available when in combat. Combat must be resolved via successfully fleeing or successfully defeating the beast. Critical strikes are random, adventurers do not know if an attack will crit or not. Attack locations are random, adventurers do not know where an enemy attack will land. Equipment tier and potions are more important than jewelry during the early game (pre adventurer level 15). Remember, you cannot sell items. Consider the adventurer's currently equipped items before suggesting purchases in the store.`;

  // Build messages with appropriate context
  let finalMessages = [...messages];
  let systemPrompt = undefined;
  
  if (isInitialMessage) {
    // First message: include full documentation as system prompt
    systemPrompt = gameDocumentation + '\n\n' + gameStateContext;
  } else {
    // Subsequent messages: inject game state as a system message
    const lastUserMessage = finalMessages.pop();
    finalMessages.push({
      role: 'system',
      content: gameStateContext
    });
    if (lastUserMessage) {
      finalMessages.push(lastUserMessage);
    }
  }

  try {
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: finalMessages,
      system: systemPrompt,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    
    for await (const textPart of result.textStream) {
      res.write(textPart);
    }
    
    res.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});