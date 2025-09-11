import { action } from "@daydreamsai/core";
import * as z from "zod";
import { GameAction, Stats, ItemPurchase } from "@/types/game";
import { Settings } from "@/dojo/useGameSettings";

// Schema for Stats
const StatsSchema = z.object({
  strength: z.number().min(0).describe("Strength stat points"),
  dexterity: z.number().min(0).describe("Dexterity stat points"),
  vitality: z.number().min(0).describe("Vitality stat points"),
  intelligence: z.number().min(0).describe("Intelligence stat points"),
  wisdom: z.number().min(0).describe("Wisdom stat points"),
  charisma: z.number().min(0).describe("Charisma stat points"),
  luck: z.number().min(0).describe("Luck stat points"),
});

// Schema for ItemPurchase
const ItemPurchaseSchema = z.object({
  item_id: z.number().positive().describe("ID of the item to purchase"),
  equip: z.boolean().describe("Whether to equip the item after purchase"),
});

// Schema for game settings (simplified - adjust based on actual Settings type)
const GameSettingsSchema = z.object({
  settings_id: z.number().describe("Settings ID"),
  game_seed: z.number().describe("Game seed"),
  game_seed_until_xp: z.number().describe("Game seed until XP threshold"),
  adventurer: z.object({
    xp: z.number().describe("Starting adventurer XP"),
  }).describe("Adventurer starting configuration"),
});

/**
 * Action to start a new game
 */
export const startGameAction = action({
  name: "start-game",
  description: "Start a new adventure game with specified settings",
  schema: z.object({
    gameId: z.number().positive().describe("Unique game/adventurer ID"),
    settings: GameSettingsSchema.describe("Game configuration settings"),
  }),
  handler: async ({ gameId, settings }, ctx) => {
    if (ctx.memory.actionInFlight) {
      return {
        success: false,
        error: "Action already in progress",
        message: `Currently processing: ${ctx.memory.inFlightAction}`,
      };
    }

    ctx.memory.actionInFlight = true;
    ctx.memory.inFlightAction = "start_game";
    ctx.memory.inFlightSince = Date.now();
    const gameAction: GameAction = {
      type: "start_game",
      gameId,
      settings,
    };

    // Access the GameDirector context to execute the action
    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      // Update memory with game state
      ctx.memory.currentGameId = gameId;
      ctx.memory.gameStarted = true;
      ctx.memory.lastAction = "start_game";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Game started successfully with ID ${gameId}`,
        gameId,
        settings,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to start game",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to explore the dungeon
 */
export const exploreAction = action({
  name: "explore",
  description: "Explore the dungeon to find treasures, obstacles, or beasts",
  schema: z.object({
    untilBeast: z.boolean().default(false).describe("Whether to continue exploring until finding a beast"),
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
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    const gameAction: GameAction = {
      type: "explore",
      untilBeast,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "explore";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Exploring the dungeon${untilBeast ? " until finding a beast" : ""}`,
        untilBeast,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to explore",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to attack a beast
 */
export const attackAction = action({
  name: "attack",
  description: "Attack a beast in combat",
  schema: z.object({
    untilDeath: z.boolean().default(false).describe("Whether to continue attacking until the beast or adventurer dies"),
  }),
  handler: async ({ untilDeath }, ctx) => {
    if (ctx.memory.actionInFlight) {
      return {
        success: false,
        error: "Action already in progress",
        message: `Currently processing: ${ctx.memory.inFlightAction}`,
      };
    }
    ctx.memory.actionInFlight = true;
    ctx.memory.inFlightAction = "attack";
    ctx.memory.inFlightSince = Date.now();
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    const gameAction: GameAction = {
      type: "attack",
      untilDeath,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "attack";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Attacking the beast${untilDeath ? " until death" : ""}`,
        untilDeath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to attack",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to flee from a beast
 */
export const fleeAction = action({
  name: "flee",
  description: "Attempt to flee from a beast in combat",
  schema: z.object({
    untilDeath: z.boolean().default(false).describe("Whether to continue fleeing until successful or death"),
  }),
  handler: async ({ untilDeath }, ctx) => {
    if (ctx.memory.actionInFlight) {
      return {
        success: false,
        error: "Action already in progress",
        message: `Currently processing: ${ctx.memory.inFlightAction}`,
      };
    }
    ctx.memory.actionInFlight = true;
    ctx.memory.inFlightAction = "flee";
    ctx.memory.inFlightSince = Date.now();
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    const gameAction: GameAction = {
      type: "flee",
      untilDeath,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "flee";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Attempting to flee from the beast${untilDeath ? " until successful or death" : ""}`,
        untilDeath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to flee",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to buy items and potions from the market
 */
export const buyItemsAction = action({
  name: "buy-items",
  description: "Purchase items and potions from the market",
  schema: z.object({
    potions: z.number().min(0).default(0).describe("Number of health potions to buy"),
    itemPurchases: z.array(ItemPurchaseSchema).default([]).describe("Array of items to purchase"),
  }),
  handler: async ({ potions, itemPurchases }, ctx) => {
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
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    if (potions === 0 && itemPurchases.length === 0) {
      return {
        success: false,
        error: "No items specified",
        message: "Must specify at least one potion or item to purchase",
      };
    }

    const gameAction: GameAction = {
      type: "buy_items",
      potions,
      itemPurchases,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "buy_items";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Purchased ${potions} potions and ${itemPurchases.length} items`,
        potions,
        itemPurchases,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to purchase items",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to select stat upgrades
 */
export const selectStatUpgradesAction = action({
  name: "select-stat-upgrades",
  description: "Allocate available stat upgrade points to different stats",
  schema: z.object({
    statUpgrades: StatsSchema.describe("Stat points to allocate to each stat"),
  }),
  handler: async ({ statUpgrades }, ctx) => {
    if (ctx.memory.actionInFlight) {
      return {
        success: false,
        error: "Action already in progress",
        message: `Currently processing: ${ctx.memory.inFlightAction}`,
      };
    }
    ctx.memory.actionInFlight = true;
    ctx.memory.inFlightAction = "select_stat_upgrades";
    ctx.memory.inFlightSince = Date.now();
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    // Validate that at least one stat point is being allocated
    const totalPoints = Object.values(statUpgrades).reduce((sum, value) => sum + value, 0);
    if (totalPoints === 0) {
      return {
        success: false,
        error: "No stat points allocated",
        message: "Must allocate at least one stat point",
      };
    }

    const gameAction: GameAction = {
      type: "select_stat_upgrades",
      statUpgrades,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "select_stat_upgrades";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Allocated ${totalPoints} stat points`,
        statUpgrades,
        totalPoints,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to allocate stat points",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to equip items
 */
export const equipAction = action({
  name: "equip",
  description: "Equip items from inventory to improve adventurer stats",
  schema: z.object({
    items: z.array(z.number().positive()).min(1).describe("Array of item IDs to equip"),
  }),
  handler: async ({ items }, ctx) => {
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
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    const gameAction: GameAction = {
      type: "equip",
      items,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "equip";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Equipped ${items.length} items`,
        items,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to equip items",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to drop items
 */
export const dropAction = action({
  name: "drop",
  description: "Drop items from inventory to make space",
  schema: z.object({
    items: z.array(z.number().positive()).min(1).describe("Array of item IDs to drop"),
  }),
  handler: async ({ items }, ctx) => {
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
    const gameId = ctx.memory.currentGameId;
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active. Start a game first.",
      };
    }

    const gameAction: GameAction = {
      type: "drop",
      items,
    };

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    try {
      await gameDirector.executeGameAction(gameAction);
      
      ctx.memory.lastAction = "drop";
      ctx.memory.lastActionTime = Date.now();

      return {
        success: true,
        message: `Dropped ${items.length} items`,
        items,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to drop items",
      };
    }
    finally {
      ctx.memory.actionInFlight = false;
      ctx.memory.inFlightAction = undefined as any;
      ctx.memory.inFlightSince = undefined as any;
    }
  },
});

/**
 * Action to get current game status
 */
export const getGameStatusAction = action({
  name: "get-game-status",
  description: "Get the current status of the active game",
  schema: z.object({}),
  handler: async ({}, ctx) => {
    const gameId = ctx.memory.currentGameId;
    
    if (!gameId) {
      return {
        success: false,
        error: "No active game",
        message: "No game is currently active",
        gameStarted: false,
      };
    }

    const gameDirector = ctx.memory.gameDirector;
    if (!gameDirector) {
      return {
        success: false,
        error: "GameDirector not available",
        message: "Game director context is not initialized",
      };
    }

    return {
      success: true,
      message: "Game status retrieved",
      gameId,
      gameStarted: ctx.memory.gameStarted || false,
      lastAction: ctx.memory.lastAction || "none",
      lastActionTime: ctx.memory.lastActionTime || null,
      actionFailed: gameDirector.actionFailed || 0,
      eventsProcessed: gameDirector.eventsProcessed || 0,
      spectating: gameDirector.spectating || false,
    };
  },
});

// Export all actions as an array for easy registration
export const gameActions = [
  startGameAction,
  exploreAction,
  attackAction,
  fleeAction,
  buyItemsAction,
  selectStatUpgradesAction,
  equipAction,
  dropAction,
  getGameStatusAction,
];
