import express from 'express';
import cors from 'cors';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();

const TIER_PRICE = 4;
const CHARISMA_ITEM_DISCOUNT = 1;
const MINIMUM_ITEM_PRICE = 1;

const isNecklace = (id) => id >= 1 && id <= 3;
const isRing = (id) => id >= 4 && id <= 8;
const isWeapon = (id) =>
  (id >= 9 && id <= 16) ||
  (id >= 42 && id <= 46) ||
  (id >= 72 && id <= 76);
const isChest = (id) => (id >= 17 && id <= 21) || (id >= 47 && id <= 51) || (id >= 77 && id <= 81);
const isHead = (id) => (id >= 22 && id <= 26) || (id >= 52 && id <= 56) || (id >= 82 && id <= 86);
const isWaist = (id) => (id >= 27 && id <= 31) || (id >= 57 && id <= 61) || (id >= 87 && id <= 91);
const isFoot = (id) => (id >= 32 && id <= 36) || (id >= 62 && id <= 66) || (id >= 92 && id <= 96);
const isHand = (id) => (id >= 37 && id <= 41) || (id >= 67 && id <= 71) || (id >= 97 && id <= 101);

const getItemSlot = (id) => {
  if (isNecklace(id)) return 'Neck';
  if (isRing(id)) return 'Ring';
  if (isWeapon(id)) return 'Weapon';
  if (isChest(id)) return 'Chest';
  if (isHead(id)) return 'Head';
  if (isWaist(id)) return 'Waist';
  if (isFoot(id)) return 'Foot';
  if (isHand(id)) return 'Hand';
  return 'None';
};

const getItemType = (id) => {
  if (id <= 0) return 'None';
  if (isNecklace(id)) return 'Necklace';
  if (isRing(id)) return 'Ring';
  if (id >= 9 && id <= 41) return isWeapon(id) ? 'Magic' : 'Cloth';
  if (id >= 42 && id <= 71) return isWeapon(id) ? 'Blade' : 'Hide';
  if (id >= 72) return isWeapon(id) ? 'Bludgeon' : 'Metal';
  return 'None';
};

const getItemTier = (id) => {
  if (id <= 0) return 0;
  if (isNecklace(id)) return 1;
  if (id === 4) return 2;
  if (id === 5) return 3;
  if (id <= 8) return 1;

  if (id <= 41) {
    if ([9, 13, 17, 22, 27, 32, 37].includes(id)) return 1;
    if ([10, 14, 18, 23, 28, 33, 38].includes(id)) return 2;
    if ([11, 15, 19, 24, 29, 34, 39].includes(id)) return 3;
    if ([20, 25, 30, 35, 40].includes(id)) return 4;
    return 5;
  }

  if (id <= 71) {
    if ([42, 47, 52, 57, 62, 67].includes(id)) return 1;
    if ([43, 48, 53, 58, 63, 68].includes(id)) return 2;
    if ([44, 49, 54, 59, 64, 69].includes(id)) return 3;
    if ([45, 50, 55, 60, 65, 70].includes(id)) return 4;
    return 5;
  }

  if ([72, 77, 82, 87, 92, 97].includes(id)) return 1;
  if ([73, 78, 83, 88, 93, 98].includes(id)) return 2;
  if ([74, 79, 84, 89, 94, 99].includes(id)) return 3;
  if ([75, 80, 85, 90, 95, 100].includes(id)) return 4;
  return 5;
};

const getItemBasePrice = (tier) => {
  switch (tier) {
    case 1:
      return 5 * TIER_PRICE;
    case 2:
      return 4 * TIER_PRICE;
    case 3:
      return 3 * TIER_PRICE;
    case 4:
      return 2 * TIER_PRICE;
    case 5:
      return TIER_PRICE;
    default:
      return 0;
  }
};

const getItemPrice = (id, charisma) => {
  const tier = getItemTier(id);
  if (tier === 0) return 0;
  const basePrice = getItemBasePrice(tier);
  const discount = CHARISMA_ITEM_DISCOUNT * charisma;
  const adjusted = basePrice - discount;
  return adjusted <= MINIMUM_ITEM_PRICE ? MINIMUM_ITEM_PRICE : adjusted;
};

const calculateLevel = (xp) => {
  const value = Number(xp) || 0;
  if (value <= 0) return 1;
  return Math.floor(Math.sqrt(value));
};

const getPotionPrice = (level, charisma) => {
  if (!Number.isFinite(level)) return null;
  const cost = level - charisma * 2;
  return Math.max(1, cost);
};

const computeCombatOutlook = (adventurer, beast, combatStats) => {
  if (!adventurer || !beast || !combatStats) {
    return null;
  }

  const damagePerTurn = (combatStats?.yourDamage?.baseDamage) || combatStats?.bestDamage || 0;
  const beastHealth = Number(beast?.health || 0);
  const currentHealth = Number(adventurer?.health || 0);

  let roundsToDefeatBeast = null;
  if (damagePerTurn > 0 && beastHealth > 0) {
    roundsToDefeatBeast = Math.ceil(beastHealth / damagePerTurn);
  }

  let roundsToDie = null;
  const damageMap = combatStats?.beastDamageToYou;
  if (damageMap) {
    const values = [damageMap.head, damageMap.chest, damageMap.waist, damageMap.hand, damageMap.foot]
      .map((v) => Number(v || 0))
      .filter((v) => v > 0);
    if (values.length > 0 && currentHealth > 0) {
      const averageDamage = values.reduce((sum, value) => sum + value, 0) / values.length;
      if (averageDamage > 0) {
        roundsToDie = Math.ceil(currentHealth / averageDamage);
      }
    }
  }

  let recommendation = null;
  if (roundsToDefeatBeast !== null && roundsToDie !== null) {
    recommendation = roundsToDefeatBeast <= roundsToDie ? 'fight' : 'flee';
  }

  if (roundsToDefeatBeast === null && roundsToDie === null) {
    return null;
  }

  return {
    roundsToDefeatBeast,
    roundsToDie,
    recommendation,
  };
};

const LOG_FILE_PATH = path.join(process.cwd(), 'logs', 'ai-messages.log');

const buildGameStateSummary = (ctx = {}) => {
  if (!ctx || typeof ctx !== 'object') {
    return '';
  }

  const lines = ['CURRENT GAME STATE:'];

  lines.push(ctx.gameId ? `Game ID: ${ctx.gameId}` : 'No active game');

  const adventurer = ctx.adventurer;
  if (adventurer) {
    lines.push('');
    lines.push('Adventurer:');
    lines.push(`- Level: ${adventurer.level || 1}`);
    lines.push(`- Health: ${adventurer.health || 0}`);
    lines.push(`- Max Health: ${adventurer.max_health || (adventurer.health || 0)}`);
    lines.push(`- XP: ${adventurer.xp || 0}`);
    lines.push(`- Gold: ${adventurer.gold || 0}`);
    lines.push(`- Beast Health: ${adventurer.beast_health || 0}`);
    lines.push(`- Stat Upgrades Available: ${adventurer.stat_upgrades_available || 0}`);
    if (adventurer.stats) {
      const stats = adventurer.stats;
      lines.push(`- Stats: Strength ${stats.strength || 0}, Dexterity ${stats.dexterity || 0}, Vitality ${stats.vitality || 0}, Intelligence ${stats.intelligence || 0}, Wisdom ${stats.wisdom || 0}, Charisma ${stats.charisma || 0}, Luck ${stats.luck || 0}`);
    }

    if (adventurer.equipment) {
      const eq = adventurer.equipment;
      lines.push('- Equipment:');
      lines.push(`  * Weapon: ${eq.weapon && eq.weapon.id ? `${eq.weapon.name || `Item #${eq.weapon.id}`} [T${eq.weapon.tier || '?'} ${eq.weapon.type || 'Unknown'}, Level ${eq.weapon.level || 1}]` : 'None'}`);
      lines.push(`  * Chest: ${eq.chest && eq.chest.id ? `${eq.chest.name || `Item #${eq.chest.id}`} [T${eq.chest.tier || '?'} ${eq.chest.type || 'Unknown'}, Level ${eq.chest.level || 1}]` : 'None'}`);
      lines.push(`  * Head: ${eq.head && eq.head.id ? `${eq.head.name || `Item #${eq.head.id}`} [T${eq.head.tier || '?'} ${eq.head.type || 'Unknown'}, Level ${eq.head.level || 1}]` : 'None'}`);
      lines.push(`  * Waist: ${eq.waist && eq.waist.id ? `${eq.waist.name || `Item #${eq.waist.id}`} [T${eq.waist.tier || '?'} ${eq.waist.type || 'Unknown'}, Level ${eq.waist.level || 1}]` : 'None'}`);
      lines.push(`  * Foot: ${eq.foot && eq.foot.id ? `${eq.foot.name || `Item #${eq.foot.id}`} [T${eq.foot.tier || '?'} ${eq.foot.type || 'Unknown'}, Level ${eq.foot.level || 1}]` : 'None'}`);
      lines.push(`  * Hand: ${eq.hand && eq.hand.id ? `${eq.hand.name || `Item #${eq.hand.id}`} [T${eq.hand.tier || '?'} ${eq.hand.type || 'Unknown'}, Level ${eq.hand.level || 1}]` : 'None'}`);
      lines.push(`  * Neck: ${eq.neck && eq.neck.id ? `${eq.neck.name || `Item #${eq.neck.id}`} [T${eq.neck.tier || '?'} ${eq.neck.type || 'Unknown'}, Level ${eq.neck.level || 1}]` : 'None'}`);
      lines.push(`  * Ring: ${eq.ring && eq.ring.id ? `${eq.ring.name || `Item #${eq.ring.id}`} [T${eq.ring.tier || '?'} ${eq.ring.type || 'Unknown'}, Level ${eq.ring.level || 1}]` : 'None'}`);
    } else {
      lines.push('- Equipment: No equipment');
    }
  } else {
    lines.push('');
    lines.push('No adventurer created');
  }

  const beast = ctx.beast;
  if (beast) {
    lines.push('');
    lines.push('Current Beast:');
    lines.push(`- Name: ${beast.name || 'Unknown Beast'}`);
    lines.push(`- Level: ${beast.level || 0}`);
    lines.push(`- Health: ${beast.health || 0}`);
    lines.push(`- Type: ${beast.type || 'Unknown'}`);
  } else {
    lines.push('');
    lines.push('No beast encountered');
  }

  if (Array.isArray(ctx.bag) && ctx.bag.length > 0) {
    lines.push('');
    lines.push(`Bag Items: ${ctx.bag.map(item => `${item.name} [T${item.tier || '?'} ${item.type || 'Unknown'}, Level ${item.level || 1}]`).join(', ')}`);
  }

  if (ctx.abilityPercentages) {
    const { fleeChance, obstacleAvoidance, ambushAvoidance } = ctx.abilityPercentages;
    lines.push('');
    lines.push('ABILITY CHANCES:');
    lines.push(`- Flee Success: ${fleeChance}%`);
    lines.push(`- Obstacle Avoidance: ${obstacleAvoidance}%`);
    lines.push(`- Ambush Avoidance: ${ambushAvoidance}%`);
  }

  if (ctx.quest) {
    lines.push('');
    lines.push(`Active Quest: ${ctx.quest.name || 'Unknown Quest'}`);
  }

  if (ctx.collectableCount) {
    lines.push('');
    lines.push(`Beasts Collected: ${ctx.collectableCount}`);
  }

  if (ctx.combatStats) {
    const combat = ctx.combatStats;
    lines.push('');
    lines.push('COMBAT ANALYSIS:');
    lines.push(`- Your Base Damage: ${combat.yourDamage?.baseDamage || 0}`);
    lines.push(`- Your Critical Damage: ${combat.yourDamage?.criticalDamage || 0}`);
    if (combat.beastDamageToYou) {
      const damageMap = combat.beastDamageToYou;
      lines.push('- Beast Damage to You:');
      lines.push(`  * If hitting Head: ${damageMap.head || 0}`);
      lines.push(`  * If hitting Chest: ${damageMap.chest || 0}`);
      lines.push(`  * If hitting Waist: ${damageMap.waist || 0}`);
      lines.push(`  * If hitting Hand: ${damageMap.hand || 0}`);
      lines.push(`  * If hitting Foot: ${damageMap.foot || 0}`);
    }
    lines.push(`- Best Available Damage: ${combat.bestDamage || 0}`);
    lines.push(`- Current Protection: ${combat.protection || 0}`);
    lines.push(`- Best Available Protection: ${combat.bestProtection || 0}`);
    lines.push(`- Gear Score: ${combat.gearScore || 0}`);
    if (Array.isArray(combat.bestItems) && combat.bestItems.length > 0) {
      lines.push(`- Recommended Equipment: ${combat.bestItems.map(item => item.name || `Item #${item.id}`).join(', ')}`);
    }
  }

  const combatOutlook = ctx.combatOutlook || computeCombatOutlook(adventurer, beast, ctx.combatStats);
  if (combatOutlook) {
    lines.push('');
    lines.push('COMBAT OUTLOOK:');
    if (combatOutlook.roundsToDefeatBeast !== null && combatOutlook.roundsToDefeatBeast !== undefined) {
      lines.push(`- Rounds to defeat beast: ${combatOutlook.roundsToDefeatBeast}`);
    }
    if (combatOutlook.roundsToDie !== null && combatOutlook.roundsToDie !== undefined) {
      lines.push(`- Rounds until defeat: ${combatOutlook.roundsToDie}`);
    }
    if (combatOutlook.recommendation) {
      lines.push(`- Suggested action: ${combatOutlook.recommendation === 'fight' ? 'Fight' : 'Flee'}`);
    }
  }

  if (ctx.selectedStats) {
    const s = ctx.selectedStats;
    lines.push('');
    lines.push(`Unallocated Stat Points - Strength: ${s.strength}, Dexterity: ${s.dexterity}, Vitality: ${s.vitality}, Intelligence: ${s.intelligence}, Wisdom: ${s.wisdom}, Charisma: ${s.charisma}, Luck: ${s.luck}`);
  }

  const inCombat = Boolean(beast) || (adventurer && Number(adventurer.beast_health || 0) > 0);

  if (inCombat) {
    lines.push('');
    lines.push('Market not available during combat');
  } else if (Array.isArray(ctx.marketDetails) && ctx.marketDetails.length > 0) {
    lines.push('');
    lines.push('Market Items:');
    ctx.marketDetails.forEach(item => {
      lines.push(`- Item #${item.id}: ${item.slot} | ${item.type} | ${item.tierLabel} | ${item.price} gold`);
    });
  }

  if (typeof ctx.potionCost === 'number') {
    lines.push('');
    lines.push(`Potion Cost: ${ctx.potionCost} gold per potion`);
  }

  return lines.join('\n');
};

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const gameContext = req.body.gameContext || {};

  const charisma = Number(gameContext?.adventurer?.stats?.charisma ?? 0);
  const levelFromContext = Number(gameContext?.adventurer?.level ?? NaN);
  const xp = Number(gameContext?.adventurer?.xp ?? 0);
  const adventurerLevel = Number.isFinite(levelFromContext) ? levelFromContext : calculateLevel(xp);
  const potionCost = Number.isFinite(adventurerLevel) ? getPotionPrice(adventurerLevel, charisma) : null;

  const marketRaw = Array.isArray(gameContext?.marketItemIds) ? gameContext.marketItemIds : [];
  const marketDetails = marketRaw
    .map((rawId) => {
      const id = Number(rawId);
      if (!Number.isFinite(id) || id <= 0) {
        return null;
      }
      const tier = getItemTier(id);
      return {
        id,
        slot: getItemSlot(id),
        type: getItemType(id),
        tier,
        tierLabel: tier ? `T${tier}` : 'None',
        price: getItemPrice(id, charisma),
      };
    })
    .filter(Boolean);

  gameContext.potionCost = potionCost;
  gameContext.marketDetails = marketDetails;
  if (!gameContext.combatOutlook) {
    gameContext.combatOutlook = computeCombatOutlook(gameContext.adventurer, gameContext.beast, gameContext.combatStats);
  }

  const stateSummary = buildGameStateSummary(gameContext);
  const messagesForModel = Array.isArray(messages) ? messages.map((message) => ({ ...message })) : [];

  if (stateSummary) {
    const lastUserIndexFromEnd = [...messagesForModel].reverse().findIndex((message) => message.role === 'user');
    const lastUserIndex = lastUserIndexFromEnd === -1 ? -1 : messagesForModel.length - 1 - lastUserIndexFromEnd;

    if (lastUserIndex !== -1) {
      const existingContent = messagesForModel[lastUserIndex].content || '';
      if (!existingContent.includes('CURRENT GAME STATE:')) {
        const separator = existingContent.trim().length > 0 ? '\n\n' : '';
        messagesForModel[lastUserIndex] = {
          ...messagesForModel[lastUserIndex],
          content: `${existingContent}${separator}${stateSummary}`,
        };
      }
    } else {
      messagesForModel.push({
        role: 'user',
        content: stateSummary,
      });
    }
  }

  // Debug logging to see the actual game state
  // console.log('Game Context received:', JSON.stringify(gameContext, null, 2));

  // Build a comprehensive system prompt with the game context
  let systemPrompt = `# Loot Survivor

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
* ⚔️ Starting Weapon - Random Tier 5 weapon
* 📊 Base Stats - 12 points randomly distributed
* ❤️ Health - 100 HP + VIT bonus

Core Game Loop

The adventure follows a simple cycle:
1. 🔍 Explore - Search for items, gold, and XP
2. ⚔️ Combat - Fight or flee from beasts
3. 📈 Level Up - Allocate stat points
4. 🛍️ Market - Buy equipment and potions
5. 🔄 Repeat - Continue deeper into Death Mountain
Goal: Survive as long as possible!

Exploration is the heart of Loot Survivor's gameplay loop. Every step into the unknown brings potential rewards and deadly dangers. Understanding the exploration system is key to surviving Death Mountain's treacherous depths.
🎲 Random Encounters: Every exploration is a roll of the dice with equal chances for discovery, obstacles, or beasts!

How Exploration Works

When you "Explore", the game rolls for one of three equally likely outcomes:
* 📦 Item Discovery (33.33%) - Find gold, potions, or equipment
* 🪨 Obstacle (33.33%) - Environmental hazards to overcome
* 👹 Beast Encounter (33.33%) - Mandatory combat encounters

Item Discovery Breakdown
When you hit the 33% item discovery chance, it subdivides into:
* 💰 Gold (45% of discoveries) - Currency for market purchases (~15% of all explores)
* 🧪 Health Potion (45% of discoveries) - Restores HP when used (~15% of all explores)
* ⚔️ Equipment (10% of discoveries) - Weapons, armor, jewelry (~3.3% of all explores)

Discovery Types
💰 Gold Discovery

Formula: Gold = Random(1 to Adventurer Level)
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
💰 Gold Cap: You can only carry up to 511 gold. Any excess is lost, so spend wisely!

⚔️ Equipment Discovery

Equipment discoveries are a part of gear upgrades. When you discover loot (3.3% of all explores), the tier distribution is:
Item Tier	Drop Rate	Of All Explores	Description
T5 (Common)	50%	~1.65%	Basic gear
T4 (Uncommon)	30%	~1.0%	Decent upgrades
T3 (Rare)	12%	~0.4%	Good equipment
T2 (Epic)	6%	~0.2%	Powerful items
T1 (Legendary)	2%	~0.066%	Best in slot
Item assigning: Items are automatically equipped or added to bag if there are free slots. Otherwise, if items are already discovered or there is no space they are converted to gold.

🧪 Health Discovery
Formula: HP = Random(2 to Level × 2)
Level	HP Range	Average	% of Max HP
5	2-10 HP	6 HP	~0.6%
10	2-20 HP	11 HP	~1.1%
20	2-40 HP	21 HP	~2.1%
30	2-60 HP	31 HP	~3.0%
50	2-100 HP	51 HP	~5.0%
Potion Information:
* Found in 15% of all explores
* Instantly restores HP when discovered
* Maximum health: 1023 HP (adventurer cap)
❤️ Health Cap: Adventurers have a maximum health of 1023 HP. Health potions cannot exceed this limit.

⭐ Experience Gains

Exploration provides consistent experience points for leveling up:
XP Source	XP Gained	Scaling	Risk Level
Item Discovery	1	None	Safe
Beast Kills	Beast Level × (Tier Multiplier - 1)	Decayed	High
Obstacles	Same as above	Decayed	Medium

Beast Encounters
⚠️ Mandatory Combat

IMPORTANT Discovering a beast during exploration always locks you into combat. There is no way to avoid the fight once a beast is encountered.
Combat is Unavoidable:
* Beast encounters force immediate battle
* No option to flee before combat begins
* You must fight until victory, defeat, or successful flee attempt
* See the Battle Guide for detailed combat mechanics

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
⚠️ Power Spikes: Beasts get significantly stronger at levels 20, 30, 40, and 50. Plan your upgrades accordingly!
❤️ Beast Health Cap: Like adventurers, beasts have a maximum health of 1023 HP.

Ambush Disadvantages
Beast encounters during exploration catch you off-guard with several penalties:
* ⚡ Initiative Loss - Beast attacks first in combat
* 🛡️ No Preparation - Cannot switch gear before combat begins

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
👁️ Important: Wisdom helps avoid the ambush penalties, but you will still be locked into combat when a beast is encountered.

Environmental Challenges
🪨 Obstacle System
Obstacles are unavoidable environmental hazards with three distinct categories:
Obstacle Types
✨ Magical Obstacles (25 types)
* Examples: Demonic Altar, Vortex of Despair, Cursed Tomb
* Counter: Hide armor
🗡️ Blade Obstacles (25 types)
* Examples: Pendulum Blades, Poison Darts, Hidden Arrows
* Counter: Metal armor
🔨 Bludgeon Obstacles (25 types)
* Examples: Collapsing Ceiling, Rolling Boulder, Crushing Walls
* Counter: Cloth armor

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
📊 Note: Unlike beasts, obstacles don't have health - they deal damage based on their level if not avoided.

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
🎯 Combat Philosophy: Turn-based combat means every action counts. Sometimes survival means avoiding the fight entirely.

Combat Mechanics
Turn-Based Combat Flow
⏱️ Combat Turn Order
Combat follows a strict turn-based sequence where adventurers always act first:
* Adventurer Turn - Choose your action:
    * ⚔️ Attack the beast
    * 🏃 Attempt to flee
    * 🔄 Switch equipment (beast gets free attack)
* Beast Counterattack - If not defeated or fled:
    * Beast automatically attacks back
    * Targets a random armor slot (1 of 5: Head, Chest, Waist, Foot, Hand)
    * Damage reduced by armor in that specific slot
* Repeat - Combat continues until victory, defeat, or successful escape
💡 Key Insight: Since beasts attack random armor slots, having balanced armor coverage is more important than stacking defense in one slot!

Damage System
⚡ Understanding Power
Power is displayed in combat for the base damage before modifiers. It appears as a number on item and beast info showing the raw damage potential.
Power = Weapon Level × (6 - Weapon Tier)
Combat Damage Modifiers
The full damage amount includes several factors during combat:
* ⚔️ Base Damage - Your Power value (Weapon tier × level formula above)
* 🎯 Type Advantage - +50% when strong, -50% when weak
* 💪 Strength Bonus - +10% damage per STR point
* ✨ Critical Hits - LUCK/100% chance for 100% bonus damage

Type Advantage System
Bludgeon + Metal beats Blade + Hide beats Magic + Cloth beats Bludgeon + Metal
Type Advantage Effects
📈 With Advantage:
* Damage Multiplier: +50%
* Example: 20 base damage → 30 damage output
* Visual Cue: Green damage numbers in combat log
📉 With Disadvantage:
* Damage Multiplier: -50%
* Example: 20 base damage → 10 damage output
* Visual Cue: Red damage numbers in combat log

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
Items with Greatness 15+ gain powerful suffix boost that provide additional stat bonuses beyond base equipment stats. See the Suffix Boost Guide for complete details on all available bonuses.
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

You are a helpful AI assistant for the Loot Survivor dungeon crawler game. You provide personalized advice to players based on the latest state of their run. Leveling items matters: once a gear piece reaches level 15 it unlocks powerful suffix bonuses—consider finishing upgrades on T5/T4/T3 items before swapping to lower-tier gear unless a T1 option is immediately superior.

Tier naming in Loot Survivor is inverted compared to many RPGs: **T1 items are the strongest and T5 items are the weakest**. When evaluating upgrades, prefer lower tier numbers (e.g., T3 → T2 → T1) unless a higher-tier item has clearly superior stats or bonuses.

Focus Guidelines:
- Combat TL;DR: Calculate the number of turns it would take to defeat the beast theyre currently fighting. This means (Beast HP) / (adventurer's attack damage) = (number of turns to defeat the beast). And do the same for the adventurer. (Adventurer HP) / (Average Beast's Attack Damage) = (Number of turns to be defeated by the beaast). If it would take more turns to defeat the beast than to defeat the adventurer, that is a losing battle and should flee.  If it would take more turns to defeat the adventurer than to defeat the beast, that is a winning battle and should fight. 
- Early gear priorities: secure a T1 weapon first, then buy cheap T5 armor pieces and level them to 15 before replacing with T1 upgrades (level 15 unlocks suffix bonuses; consider pushing core pieces to G20 when safe).
- Potions heal instantly and cannot be stockpiled; only recommend CHA upgrades when potion cost is above 1 gold and highlight that 1-gold potions should be used to keep HP within ~10–20 of max before exploring.
- Fleeing a beast ends the encounter permanently—never advise leaving combat and returning to the same enemy later.
- Armor alignment: pair armor types off the weapon (bludgeon → hide, blade → cloth, magic → metal) to stay moderately strong versus every beast; diversify armor in late game to reduce obstacle/ambush risks.
- Stat upgrades: if flee chance < 50% put points into DEX; else if potion cost > 1 gold invest in CHA; otherwise (flee chance ≥ 50% and potions already 1 gold) invest in Vitality. If potion price=2or3 only invest 1 stat upgrade point in Charisma, if potion price=4or5 only invest 2 stat upgrade points in Charisma. 
- Market advice: when HP is already near max and gold > ~14, review any level ≥15 gear for possible T1 replacements that respect the weapon/armor synergy; keep emphasizing potions first when HP is low.
- Jewelry recommendations: early bronze ring only with strong economy; otherwise target Titanium Ring plus armor-synergistic pendant/amulet/necklace (bludgeon/hide → pendant, blade/cloth → amulet, magic/metal → necklace).
- Items only gain XP through exploring/combat; remind players that leveling happens passively via encounters—there is no direct upgrade action.

Respond with concise, tactical guidance that references the game state appended to the player's most recent message. Prioritize purchasing potions whenever adventurer health is not within 20HP of their max health. Prioritize actionable tips for combat (what are the chances I win this), exploration + market shopping (how much gold do I have, have my items reached level 15, if so, should i purchase a tier1. First prio each time at market should be restoring health to near max via potions), and stat allocation (alright, i have stat upgrade points. what should i invest these in, given my current stats? Keep dex high enough to maintain a flee rate of at least 50%, charisma high enough so that potion price is 1gold, and if those conditions are already completed, put it in Vitality). Note: market is not available when in combat. Combat must be resolved via successfully fleeing or successfully defeating the beast. Critical strikes are random, adventurers do not know if an attack will crit or not. Attack locations are random, adventurers do not know where an enemy attack will land. Stat upgrade points must be allocated before taking other actions like exploring or using the market. THE LOWEST POTION PRICE CAN BE IS 1 GOLD. IF POTION PRICE IS 1 GOLD, DO NOT RECOMMEND UPGRADING CHARISMA.
`;

  try {
    await fs.mkdir(path.dirname(LOG_FILE_PATH), { recursive: true });
    const logEntry = {
      timestamp: new Date().toISOString(),
      systemPrompt,
      messages: messagesForModel,
      stateSummary,
      gameContext,
    };
    await fs.appendFile(LOG_FILE_PATH, `${JSON.stringify(logEntry, null, 2)}\n---\n`);
  } catch (logError) {
    console.error('Failed to write AI payload log:', logError);
  }

  try {
    const result = await streamText({
      model: openai('gpt-4o'),
      messages: messagesForModel,
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
