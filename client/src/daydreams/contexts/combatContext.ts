import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { ItemUtils } from "@/utils/loot";
import { calculateLevel, calculateCombatStats, calculateAttackDamage, calculateBeastDamage } from "@/utils/game";

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
  
  // Combat tracking
  lastAction?: string;
  lastActionTime?: number;
  combatRounds: number;
  fleeAttempts: number;
}

// Helper function to format equipment for XML
const formatEquip = (item: any) => {
  if (!item || !item.id) return "None";
  const name = ItemUtils.getItemName(item.id);
  const tier = ItemUtils.getItemTier(item.id);
  const level = calculateLevel(item.xp || 0);
  return `${name} T${tier} Lv${level}`;
};

// Calculate combat preview/estimates
const getCombatPreview = (adventurer: any, beast: any, bag: any[]) => {
  if (!adventurer || !beast) return null;
  
  const combatStats = calculateCombatStats(adventurer, bag || [], beast);
  
  // Calculate flee chance based on DEX
  const fleeChance = Math.min(100, Math.max(0, 
    (adventurer.stats?.dexterity || 0) / adventurer.level * 100
  ));
  
  // Estimate combat outcome
  let outcome = "uncertain";
  const healthRatio = adventurer.health / beast.health;
  const damageRatio = combatStats.baseDamage / 30; // Rough estimate
  
  if (healthRatio > 2 && damageRatio > 1) {
    outcome = "likely_victory";
  } else if (healthRatio < 0.5 || damageRatio < 0.3) {
    outcome = "likely_defeat";
  } else if (fleeChance > 75) {
    outcome = "flee_recommended";
  }
  
  return {
    playerDamage: {
      base: combatStats.baseDamage,
      critical: combatStats.criticalDamage,
    },
    beastDamage: {
      max: Math.floor(beast.level * 2), // Rough estimate
    },
    fleeChance: Math.floor(fleeChance),
    critChance: combatStats.critChance,
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
    
    return `<phase>combat</phase>
  <adventurer health="${adventurer.health}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>
  <stats str="${adventurer.stats?.strength || 0}" dex="${adventurer.stats?.dexterity || 0}" vit="${adventurer.stats?.vitality || 0}" int="${adventurer.stats?.intelligence || 0}" wis="${adventurer.stats?.wisdom || 0}" cha="${adventurer.stats?.charisma || 0}"/>
  <equipment weapon="${formatEquip(adventurer.equipment?.weapon)}" chest="${formatEquip(adventurer.equipment?.chest)}" head="${formatEquip(adventurer.equipment?.head)}" waist="${formatEquip(adventurer.equipment?.waist)}" foot="${formatEquip(adventurer.equipment?.foot)}" hand="${formatEquip(adventurer.equipment?.hand)}" neck="${formatEquip(adventurer.equipment?.neck)}" ring="${formatEquip(adventurer.equipment?.ring)}"/>
  <beast name="${beast?.name || 'Unknown'}" health="${beast?.health || 0}" level="${beast?.level || 1}" tier="${beast?.tier || 0}"/>
  <damage player="${combatPreview?.playerDamage.base || 0}" critical="${combatPreview?.playerDamage.critical || 0}" beast="${combatPreview?.beastDamage.max || 0}"/>
  <flee chance="${combatPreview?.fleeChance || 0}"/>
  <estimate>${combatPreview?.outcome || 'Unknown'}</estimate>`;
  },
  
  instructions: `You are in combat with a beast in Death Mountain!
  
Available actions:
- attack: Strike the beast (can attack until death for continuous combat)
- flee: Attempt to escape (success based on DEX/Level ratio)
- equip: Change equipment mid-combat (beast gets free attack)

Combat tips:
- Check type advantages (Bludgeon > Blade > Magic > Bludgeon)
- Higher STR = more damage
- Higher DEX = better flee chance
- Consider fleeing if health is low or beast is too strong
- Equipment swaps give the beast a free attack, so plan carefully`,

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
    description: "Attack the beast in combat",
    schema: z.object({
      untilDeath: z.boolean().default(false).describe("Continue attacking until beast or adventurer dies"),
    }),
    handler: async ({ untilDeath }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
        };
      }
      
      if (!ctx.memory.beast) {
        return {
          success: false,
          error: "No beast to attack",
          message: "You are not in combat",
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
          error: "GameDirector not available",
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
        
        return {
          success: true,
          message: untilDeath 
            ? "Attacking until one of you falls..." 
            : "Attacking the beast!",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
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
    description: "Attempt to flee from combat",
    schema: z.object({
      untilSuccess: z.boolean().default(false).describe("Keep trying to flee until successful"),
    }),
    handler: async ({ untilSuccess }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
        };
      }
      
      if (!ctx.memory.beast) {
        return {
          success: false,
          error: "No combat to flee from",
          message: "You are not in combat",
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
          error: "GameDirector not available",
        };
      }
      
      try {
        await gameDirector.executeGameAction({
          type: "flee",
          untilSuccess,
        });
        
        ctx.memory.lastAction = "flee";
        ctx.memory.lastActionTime = Date.now();
        ctx.memory.fleeAttempts++;
        
        const fleeChance = Math.min(100, Math.max(0, 
          (ctx.memory.adventurer?.stats?.dexterity || 0) / (ctx.memory.adventurer?.level || 1) * 100
        ));
        
        return {
          success: true,
          message: untilSuccess 
            ? "Attempting to flee until successful..." 
            : `Attempting to flee (${Math.floor(fleeChance)}% chance)...`,
          fleeChance: Math.floor(fleeChance),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
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
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
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
          error: "GameDirector not available",
        };
      }
      
      try {
        await gameDirector.executeGameAction({
          type: "equip",
          itemIds,
        });
        
        ctx.memory.lastAction = "equip";
        ctx.memory.lastActionTime = Date.now();
        
        return {
          success: true,
          message: `Equipped ${itemIds.length} items (beast gets free attack!)`,
          itemIds,
          warning: "Beast attacks while you change equipment!",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
]);