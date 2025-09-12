import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { ItemUtils } from "@/utils/loot";
import { 
  calculateLevel, 
  calculateCombatStats, 
  calculateAttackDamage, 
  calculateBeastDamage,
  ability_based_percentage 
} from "@/utils/game";
import { getAttackType, getArmorType } from "@/utils/beast";
import { GameEvent, getEventTitle } from "@/utils/events";

interface CombatMemory {
  gameDirector?: any; // Reference to the GameDirector
  actionInFlight?: boolean;
  inFlightAction?: string;
  inFlightSince?: number;
  
  // Combat state
  adventurer?: any;
  adventurerState?: any;
  beast?: any;
  battleEvent?: any;
  bag?: any[];
  recentEvents?: GameEvent[]; // Recent combat events
  
  // Combat tracking
  lastAction?: string;
  lastActionTime?: number;
  combatRounds: number;
  fleeAttempts: number;
}

// Helper function to format equipment for XML
const formatEquip = (item: any) => {
  if (!item || !item.id || item.id === 0) return "None";
  const name = ItemUtils.getItemName(item.id);
  const tier = ItemUtils.getItemTier(item.id);
  const level = calculateLevel(item.xp || 0);
  const type = ItemUtils.getItemType(item.id);
  
  // Format: "Name:L{level}:T{tier}:{type}"
  return `${name}:L${level}:T${tier}:${type}`;
};

// Calculate combat preview/estimates
const getCombatPreview = (adventurer: any, beast: any, bag: any[]) => {
  if (!adventurer || !beast) return null;
  
  // Calculate actual damage values using game utils
  const { baseDamage, criticalDamage } = calculateAttackDamage(
    adventurer.equipment?.weapon, 
    adventurer, 
    beast
  );
  
  // Calculate beast damage against each armor piece
  let totalBeastDamage = 0;
  let armorCount = 0;
  const armorSlots = ['chest', 'head', 'waist', 'hand', 'foot'];
  
  for (const slot of armorSlots) {
    const armor = adventurer.equipment?.[slot];
    if (armor && armor.id !== 0) {
      totalBeastDamage += calculateBeastDamage(beast, adventurer, armor);
      armorCount++;
    }
  }
  
  // Average beast damage across armor pieces
  const avgBeastDamage = armorCount > 0 
    ? Math.floor(totalBeastDamage / armorCount)
    : Math.floor(beast.level * (6 - beast.tier) * 1.5); // No armor damage
  
  // Calculate flee chance using actual formula
  const fleeChance = ability_based_percentage(
    adventurer.xp || 0,
    adventurer.stats?.dexterity || 0
  );
  
  // Estimate combat outcome
  const roundsToKill = Math.ceil(beast.health / baseDamage);
  const damageToTake = roundsToKill * avgBeastDamage;
  
  let outcome = "";
  if (roundsToKill <= 3 && damageToTake < adventurer.health * 0.5) {
    outcome = `Win in ${roundsToKill} rounds, take ~${damageToTake} damage`;
  } else if (damageToTake >= adventurer.health) {
    outcome = `Dangerous! May die in ${Math.ceil(adventurer.health / avgBeastDamage)} rounds`;
  } else {
    outcome = `Win in ${roundsToKill} rounds, take ~${damageToTake} damage`;
  }
  
  return {
    playerDamage: {
      base: baseDamage,
      critical: criticalDamage,
    },
    beastDamage: avgBeastDamage,
    fleeChance,
    critChance: adventurer.stats?.luck || 0,
    roundsToKill,
    damageToTake,
    outcome,
  };
};

export const combatContext = context<CombatMemory>({
  type: "combat",
  
  schema: z.object({
    gameId: z.number().describe("Current game ID"),
    playerId: z.string().describe("Player wallet address"),
  }),
  
  create: (): CombatMemory => ({
    combatRounds: 0,
    fleeAttempts: 0,
  }),
  
  render: (state) => {
    const { memory } = state;
    const adventurer = memory.adventurer;
    const beast = memory.beast;
    
    if (!adventurer || !beast) {
      return `<phase>no-combat</phase>
  <status>No active combat</status>`;
    }
    
    const combatPreview = getCombatPreview(adventurer, beast, memory.bag || []);
    
    // Calculate max health: 100 base + (vitality * 15)
    const maxHealth = 100 + ((adventurer.stats?.vitality || 0) * 15);
    
    // Format beast info
    const beastType = beast?.type || "Unknown";
    const beastAttackType = getAttackType(beast?.id || 0);
    const beastArmorType = getArmorType(beast?.id || 0);
    
    // Format recent combat events (most recent 5, deduplicated, sorted by action_count descending)
    const uniqueEvents = memory.recentEvents ? 
      Array.from(new Map(memory.recentEvents.map(e => [e.action_count, e])).values())
        .sort((a, b) => (b.action_count || 0) - (a.action_count || 0)) : [];
    const recentCombatEvents = uniqueEvents.slice(0, 10) // Get more initially to ensure we have 5 combat events
      .filter(event => ['attack', 'beast_attack', 'flee', 'ambush', 'beast', 'defeated_beast', 'fled_beast'].includes(event.type))
      .slice(0, 5) // Then take the first 5 combat events
      .map(event => {
        if (event.type === 'attack' && event.attack) {
          return `    <event type="attack">Player dealt ${event.attack.damage} damage${event.attack.critical_hit ? ' (CRIT!)' : ''}</event>`;
        } else if (event.type === 'beast_attack' && event.attack) {
          return `    <event type="beast_attack">Beast dealt ${event.attack.damage} damage to ${event.attack.location}${event.attack.critical_hit ? ' (CRIT!)' : ''}</event>`;
        } else if (event.type === 'flee') {
          return `    <event type="flee">Flee attempt ${event.success ? 'succeeded' : 'failed'}</event>`;
        } else if (event.type === 'defeated_beast') {
          return `    <event type="defeated_beast">Victory! (+${event.xp_reward} XP, +${event.gold_reward} gold)</event>`;
        } else if (event.type === 'fled_beast') {
          return `    <event type="fled_beast">Escaped! (+${event.xp_reward} XP)</event>`;
        } else {
          return `    <event type="${event.type}">${getEventTitle(event)}</event>`;
        }
      }).join('\n') || '    <!-- No recent combat events -->';
    
    return `<phase>combat</phase>
  <adventurer health="${adventurer.health}" maxHealth="${maxHealth}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>
  <stats str="${adventurer.stats?.strength || 0}" dex="${adventurer.stats?.dexterity || 0}" vit="${adventurer.stats?.vitality || 0}" int="${adventurer.stats?.intelligence || 0}" wis="${adventurer.stats?.wisdom || 0}" cha="${adventurer.stats?.charisma || 0}" luck="${adventurer.stats?.luck || 0}"/>
  <equipment>
    <weapon>${formatEquip(adventurer.equipment?.weapon)}</weapon>
    <chest>${formatEquip(adventurer.equipment?.chest)}</chest>
    <head>${formatEquip(adventurer.equipment?.head)}</head>
    <waist>${formatEquip(adventurer.equipment?.waist)}</waist>
    <foot>${formatEquip(adventurer.equipment?.foot)}</foot>
    <hand>${formatEquip(adventurer.equipment?.hand)}</hand>
    <neck>${formatEquip(adventurer.equipment?.neck)}</neck>
    <ring>${formatEquip(adventurer.equipment?.ring)}</ring>
  </equipment>
  <beast name="${beast?.name || 'Unknown'}" health="${beast?.health || 0}" level="${beast?.level || 1}" tier="${beast?.tier || 0}" type="${beastType}" attackType="${beastAttackType}" armorType="${beastArmorType}"/>
  <combat>
    <damage player="${combatPreview?.playerDamage.base || 0}" critical="${combatPreview?.playerDamage.critical || 0}" beast="${combatPreview?.beastDamage || 0}"/>
    <flee chance="${combatPreview?.fleeChance || 0}%"/>
    <critChance value="${combatPreview?.critChance || 0}%"/>
    <rounds toKill="${combatPreview?.roundsToKill || 0}"/>
    <estimate>${combatPreview?.outcome || 'Unknown'}</estimate>
  </combat>
  <recent_events>
${recentCombatEvents}
  </recent_events>`;
  },
  
  instructions: `You are in combat with a beast in Death Mountain! 
  
Analyze the combat preview to decide whether to fight or flee. Consider:
- Your health vs expected damage
- Flee chance based on DEX
- Rounds to victory
- Whether you can survive the fight

All actions are blockchain transactions that take a moment to confirm.`,

  onStep: async (ctx) => {
    // Track combat rounds
    if (ctx.memory.beast && ctx.memory.lastAction === "attack") {
      ctx.memory.combatRounds++;
    }
  },
  
}).setActions([
  // Attack action
  action({
    name: "attack",
    description: "Attack the beast in combat if you believe you can slay it",
    schema: z.object({
      untilDeath: z.boolean().default(false).describe("Continue attacking until beast or adventurer dies"),
    }),
    handler: async ({ untilDeath }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      if (!ctx.memory.beast) {
        return {
          success: false,
          error: "no_beast",
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "attack";
      ctx.memory.inFlightSince = Date.now();
      
      const gameDirector = ctx.memory.gameDirector;
      if (!gameDirector) {
        ctx.memory.actionInFlight = false;
        return {
          success: false,
          error: "game_director_unavailable",
        };
      }
      
      try {
        await gameDirector.executeGameAction({
          type: "attack",
          untilDeath,
        });
        
        ctx.memory.lastAction = "attack";
        ctx.memory.lastActionTime = Date.now();
        ctx.memory.combatRounds++;
        
        // Don't return messages that the AI might repeat to user
        return {
          success: true,
          data: { untilDeath },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "unknown_error",
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
  
  // Flee action
  action({
    name: "flee",
    description: "Attempt to flee from combat if beast is too strong",
    schema: z.object({
      untilDeath: z.boolean().default(false).describe("Keep trying to flee until successful or death"),
    }),
    handler: async ({ untilDeath }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      if (!ctx.memory.beast) {
        return {
          success: false,
          error: "no_beast",
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "flee";
      ctx.memory.inFlightSince = Date.now();
      
      const gameDirector = ctx.memory.gameDirector;
      if (!gameDirector) {
        ctx.memory.actionInFlight = false;
        return {
          success: false,
          error: "game_director_unavailable",
        };
      }
      
      try {
        await gameDirector.executeGameAction({
          type: "flee",
          untilDeath,  // Fixed: was untilSuccess
        });
        
        ctx.memory.lastAction = "flee";
        ctx.memory.lastActionTime = Date.now();
        ctx.memory.fleeAttempts++;
        
        const fleeChance = Math.min(100, Math.max(0, 
          (ctx.memory.adventurer?.stats?.dexterity || 0) / (ctx.memory.adventurer?.level || 1) * 100
        ));
        
        // Don't return messages that the AI might repeat to user
        return {
          success: true,
          data: { 
            untilDeath,
            fleeChance: Math.floor(fleeChance),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "unknown_error",
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
  
  // Equip action (also available in combat)
  action({
    name: "equip",
    description: "Change equipment during combat (beast gets free attack)",
    schema: z.object({
      itemIds: z.array(z.number()).describe("List of item IDs to equip"),
    }),
    handler: async ({ itemIds }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "equip";
      ctx.memory.inFlightSince = Date.now();
      
      const gameDirector = ctx.memory.gameDirector;
      if (!gameDirector) {
        ctx.memory.actionInFlight = false;
        return {
          success: false,
          error: "game_director_unavailable",
        };
      }
      
      try {
        await gameDirector.executeGameAction({
          type: "equip",
          itemIds,
        });
        
        ctx.memory.lastAction = "equip";
        ctx.memory.lastActionTime = Date.now();
        
        // Don't return messages that the AI might repeat to user
        return {
          success: true,
          data: { 
            itemIds,
            beastGetsAttack: true,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "unknown_error",
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
]);