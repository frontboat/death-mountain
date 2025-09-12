import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { ItemUtils } from "@/utils/loot";
import { calculateLevel } from "@/utils/game";
import { generateMarketItems } from "@/utils/market";

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
  
  preferences: {
    autoExplore: boolean;
    preferredStats: string[];
  };
}

// Helper function to format equipment for XML
const formatEquip = (item: any) => {
  if (!item || !item.id) return "None";
  const name = ItemUtils.getItemName(item.id);
  const tier = ItemUtils.getItemTier(item.id);
  const level = calculateLevel(item.xp || 0);
  return `${name} T${tier} Lv${level}`;
};

// Helper function to format item for XML
const formatItem = (item: any) => {
  const name = ItemUtils.getItemName(item.id);
  const tier = ItemUtils.getItemTier(item.id);
  const level = calculateLevel(item.xp || 0);
  const slot = ItemUtils.getItemSlot(item.id);
  return `    <item id="${item.id}" name="${name}" slot="${slot}" tier="${tier}" level="${level}"/>`;
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
      ? marketItems.map((item: any) => 
          `    <item id="${item.id}" name="${item.name}" slot="${item.slot}" tier="${item.tier}" price="${item.price}g"/>`
        ).join('\n')
      : null;
    
    // Format bag items
    const bagItems = memory.bag && memory.bag.length > 0
      ? memory.bag
          .filter((item: any) => item && item.id && item.id !== 0)
          .map(formatItem)
          .join('\n')
      : '    <!-- Empty bag -->';
    
    return `<phase>exploration</phase>
  <adventurer health="${adventurer.health}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>
  <stats str="${adventurer.stats?.strength || 0}" dex="${adventurer.stats?.dexterity || 0}" vit="${adventurer.stats?.vitality || 0}" int="${adventurer.stats?.intelligence || 0}" wis="${adventurer.stats?.wisdom || 0}" cha="${adventurer.stats?.charisma || 0}"/>
  <equipment weapon="${formatEquip(adventurer.equipment?.weapon)}" chest="${formatEquip(adventurer.equipment?.chest)}" head="${formatEquip(adventurer.equipment?.head)}" waist="${formatEquip(adventurer.equipment?.waist)}" foot="${formatEquip(adventurer.equipment?.foot)}" hand="${formatEquip(adventurer.equipment?.hand)}" neck="${formatEquip(adventurer.equipment?.neck)}" ring="${formatEquip(adventurer.equipment?.ring)}"/>
  <market>
${affordableItems || '    <!-- No affordable items -->'}
  </market>
  <bag>
${bagItems}
  </bag>`;
  },
  
  instructions: `You are in the exploration phase of Death Mountain. 
  
Available actions:
- explore: Search the dungeon for items, gold, or beasts
- buy-items: Purchase items from the market (only affordable items shown)
- equip: Equip items from your bag
- drop: Drop items to make bag space

Strategy tips:
- Keep your health high before exploring
- Buy potions when available
- Equip better items as you find them
- Balance your equipment types for combat advantages`,
  
}).setActions([
  // Explore action
  action({
    name: "explore",
    description: "Explore the dungeon to find treasures, obstacles, or beasts",
    schema: z.object({
      untilBeast: z.boolean().default(false).describe("Continue exploring until finding a beast"),
    }),
    handler: async ({ untilBeast }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "explore";
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
          type: "explore",
          untilBeast,
        });
        
        ctx.memory.lastAction = "explore";
        ctx.memory.lastActionTime = Date.now();
        
        return {
          success: true,
          message: `Exploring the dungeon${untilBeast ? " until finding a beast" : ""}...`,
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
  
  // Buy items action
  action({
    name: "buy-items",
    description: "Purchase items and potions from the market",
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
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "buy_items";
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
          type: "buy_items",
          purchases,
          potions,
        });
        
        ctx.memory.lastAction = "buy_items";
        ctx.memory.lastActionTime = Date.now();
        
        return {
          success: true,
          message: `Purchased ${purchases.length} items and ${potions} potions`,
          purchases,
          potions,
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
          message: `Equipped ${itemIds.length} items`,
          itemIds,
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
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
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
          error: "GameDirector not available",
        };
      }
      
      try {
        await gameDirector.executeGameAction({
          type: "drop",
          itemIds,
        });
        
        ctx.memory.lastAction = "drop";
        ctx.memory.lastActionTime = Date.now();
        
        return {
          success: true,
          message: `Dropped ${itemIds.length} items`,
          itemIds,
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