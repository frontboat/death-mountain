import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { ItemUtils } from "@/utils/loot";
import { calculateLevel } from "@/utils/game";
import { generateMarketItems, potionPrice } from "@/utils/market";
import { GameEvent, getEventTitle } from "@/utils/events";

interface ExplorationMemory {
  gameDirector?: any; // Reference to the GameDirector
  actionInFlight?: boolean;
  inFlightAction?: string;
  inFlightSince?: number;
  
  // Core adventurer state
  adventurer?: any;
  adventurerState?: any;
  bag?: any[];
  marketItemIds?: number[];
  
  // Game tracking
  currentGameId?: number;
  gameStarted: boolean;
  lastAction?: string;
  lastActionTime?: number;
  recentEvents?: GameEvent[]; // Recent game events
  
  preferences: {
    autoExplore: boolean;
    preferredStats: string[];
  };
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

// Helper function to format item for XML
const formatItem = (item: any) => {
  const name = ItemUtils.getItemName(item.id);
  const tier = ItemUtils.getItemTier(item.id);
  const level = calculateLevel(item.xp || 0);
  const slot = ItemUtils.getItemSlot(item.id);
  const type = ItemUtils.getItemType(item.id);
  return `    <item id="${item.id}" name="${name}" slot="${slot}" tier="${tier}" level="${level}" type="${type}"/>`;
};

export const explorationContext = context<ExplorationMemory>({
  type: "exploration",
  
  schema: z.object({
    gameId: z.number().describe("Current game ID"),
    playerId: z.string().describe("Player wallet address"),
  }),
  
  create: (): ExplorationMemory => ({
    gameStarted: false,
    preferences: {
      autoExplore: false,
      preferredStats: ["vitality", "dexterity"],
    },
  }),
  
  render: (state) => {
    const { memory } = state;
    const adventurer = memory.adventurer;
    
    if (!adventurer) {
      return `<phase>pre-game</phase>
  <status>No active game. Use start-game to begin.</status>`;
    }
    
    // Generate affordable market items (CHA affects prices)
    const marketItems = memory.marketItemIds && adventurer.stats?.charisma !== undefined
      ? generateMarketItems(memory.marketItemIds, adventurer.stats.charisma)
          .filter((item: any) => item.price <= (adventurer.gold || 0))
      : [];
    
    const affordableItems = marketItems.length > 0
      ? marketItems.map((item: any) => {
          const type = ItemUtils.getItemType(item.id);
          return `    <item id="${item.id}" name="${item.name}" slot="${item.slot}" tier="${item.tier}" type="${type}" price="${item.price}g"/>`;
        }).join('\n')
      : null;
    
    // Format bag items
    const bagItems = memory.bag && memory.bag.length > 0
      ? memory.bag
          .filter((item: any) => item && item.id && item.id !== 0)
          .map(formatItem)
          .join('\n')
      : '    <!-- Empty bag -->';
    
    // Calculate max health: 100 base + (vitality * 15)
    const maxHealth = 100 + ((adventurer.stats?.vitality || 0) * 15);
    
    // Calculate potion price based on level and charisma
    const adventurerLevel = calculateLevel(adventurer.xp || 0);
    const potionCost = potionPrice(adventurerLevel, adventurer.stats?.charisma || 0);
    const maxPotionsByHealth = Math.ceil((maxHealth - adventurer.health) / 10);
    const maxPotionsByGold = Math.floor(adventurer.gold / potionCost);
    const maxPotions = Math.min(maxPotionsByHealth, maxPotionsByGold);
    
    // Format recent events (most recent 5, deduplicated by action_count, sorted by action_count descending)
    const uniqueEvents = memory.recentEvents ? 
      Array.from(new Map(memory.recentEvents.map(e => [e.action_count, e])).values())
        .sort((a, b) => (b.action_count || 0) - (a.action_count || 0)) : [];
    const recentEvents = uniqueEvents.slice(0, 5).map(event => {
      const title = getEventTitle(event);
      if (event.type === 'discovery' && event.discovery) {
        return `    <event type="${event.type}">${title} (+${event.xp_reward || 0} XP)</event>`;
      } else if (event.type === 'obstacle' && event.obstacle) {
        if (event.obstacle.dodged) {
          return `    <event type="${event.type}">${title} (dodged! +${event.xp_reward || 0} XP)</event>`;
        } else {
          return `    <event type="${event.type}">${title} (${event.obstacle.damage} damage)</event>`;
        }
      } else {
        return `    <event type="${event.type}">${title}</event>`;
      }
    }).join('\n') || '    <!-- No recent events -->';
    
    return `<phase>exploration</phase>
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
  <market>
    <potion price="${potionCost}g" heals="10hp" maxBuy="${maxPotions}"/>
${affordableItems || '    <!-- No affordable items -->'}
  </market>
  <bag>
${bagItems}
  </bag>
  <recent_events>
${recentEvents}
  </recent_events>`;
  },
  
  instructions: `You are in the exploration phase of Death Mountain. 
EASY MONEY BIG MONEY STRAT

DEX, VIT build.

maintain dex >= 75% flee chance, and potions at 1gold, otherwise stack VIT. 
(these are loose benchmarks)
if good rng for early economy, can snag bronze ring before lvl15, if you have 5 armor pieces and a t1 weapon.

level 15 conditional mid-game decision point:
continue leveling the low-tier equipped gear to G20, or;
swap low-tier gear, as soon as they hit G15, for a T1
jewelry for crit (prio armor first if choice)

Late game lvl 25+ 
Keep gold at 1 cost
Keep dex above 80%
Otherwise stack vit
Begin working other armor types into inventory and leveling those pieces up when safe

Notes: 
buying potions between every explore is fine. Especially with high economy, but this is only viable with potion cost = 1gold.

Tips:
t1 weapon is THE highest priority. and then the t5 armors at early levels.
rotate armor/weapons to lvl them on obstacles

try to wear a variety of armor types (this means that instead of a 33% chance to insta die to ambush/obstacle. i haven't run the maths on this, so its probably wrong, but it feels like that should improve your chance of survival (though maybe your equipped necklace changes this, idk).

equip armor that is "off" from your weapon. This makes you "semi-strong" into all 3 beast types, instead of VERY strong into one. (imagine you run into a magic beast with a metal armour, but stabby weapon - there is a chance you insta kill turn-1 and don't need to swap out, and for the other 2, at least you don't take so much damage).

adventurer equips magic weapon, adventurer should equip metal armor
adventurer equips blade  weapon, adventurer should equip cloth  armor
adventurer equips blunt weapon, adventurer should equip   hide   armor 

STRATEGY, BUY POTIONS AT THE MARKET BEFORE EXPLORING, IF YOU CAN. TRY TO KEEP POTION COST AT 1 GOLD. TRY TO KEEP VIT AND DEX HIGH.`,
  
}).setActions([
  // Explore action
  action({
    name: "explore",
    description: "Explore the dungeon to find random treasures, obstacles, or beasts",
    schema: z.object({
      untilBeast: z.boolean().default(false).describe("Continue exploring until finding a beast"),
    }),
    handler: async ({ untilBeast }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "explore";
      ctx.memory.inFlightSince = Date.now();
      
      const gameDirector = ctx.memory.gameDirector;
      if (!gameDirector) {
        ctx.memory.actionInFlight = false;
        console.error("[Daydreams] GameDirector not available in explore action", {
          hasGameDirector: !!ctx.memory.gameDirector,
          memoryKeys: Object.keys(ctx.memory),
          gameStarted: ctx.memory.gameStarted,
          adventurer: !!ctx.memory.adventurer
        });
        return {
          success: false,
          error: "game_director_unavailable",
        };
      }
      
      try {
        console.log("[Daydreams] Executing explore action", { untilBeast });
        await gameDirector.executeGameAction({
          type: "explore",
          untilBeast,
        });
        
        ctx.memory.lastAction = "explore";
        ctx.memory.lastActionTime = Date.now();
        
        console.log("[Daydreams] Explore action executed successfully");
        // Don't return messages that the AI might repeat to user
        return {
          success: true,
          data: { untilBeast },
        };
      } catch (error) {
        console.error("[Daydreams] Explore action failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "unknown_error",
          details: error instanceof Error ? error.stack : String(error),
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
  
  // Buy items action
  action({
    name: "buy-items",
    description: "Purchase items and potions from the market. Potions are consumed at purchase time and cannot be stored.",
    schema: z.object({
      purchases: z.array(z.object({
        item_id: z.number().describe("Item ID to purchase"),
        equip: z.boolean().describe("Whether to equip immediately"),
      })).describe("List of items to purchase"),
      potions: z.number().min(0).default(0).describe("Number of health potions to buy"),
    }),
    handler: async ({ purchases, potions }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      // Validate potions don't exceed health capacity
      if (ctx.memory.adventurer && potions > 0) {
        const currentHealth = ctx.memory.adventurer.health || 0;
        // Max health = 100 (starting) + (vitality * 15)
        const maxHealth = 100 + ((ctx.memory.adventurer.stats?.vitality || 0) * 15);
        const healthToRestore = potions * 10; // Each potion restores 10 HP
        
        if (currentHealth + healthToRestore > maxHealth) {
          const maxPotions = Math.ceil((maxHealth - currentHealth) / 10);
          return {
            success: false,
            error: "too_many_potions",
            data: {
              currentHealth,
              maxHealth,
              requestedPotions: potions,
              maxPotions,
            },
          };
        }
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "buy_items";
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
          type: "buy_items",
          itemPurchases: purchases,  // GameDirector expects 'itemPurchases', not 'purchases'
          potions,
        });
        
        ctx.memory.lastAction = "buy_items";
        ctx.memory.lastActionTime = Date.now();
        
        // Don't return messages that the AI might repeat to user
        return {
          success: true,
          data: {
            purchases,
            potions,
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
  
  // Equip action
  action({
    name: "equip",
    description: "Equip items from your bag",
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
          data: { itemIds },
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
  
  // Drop action
  action({
    name: "drop",
    description: "Drop items to free up bag space",
    schema: z.object({
      itemIds: z.array(z.number()).describe("List of item IDs to drop"),
    }),
    handler: async ({ itemIds }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "drop";
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
          type: "drop",
          itemIds,
        });
        
        ctx.memory.lastAction = "drop";
        ctx.memory.lastActionTime = Date.now();
        
        // Don't return messages that the AI might repeat to user
        return {
          success: true,
          data: { itemIds },
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