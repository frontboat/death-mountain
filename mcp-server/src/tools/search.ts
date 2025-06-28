import { z } from 'zod';
import { GameDataClient } from '../clients/gameData.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

export function createSearchTools(client: GameDataClient): Tool[] {
  return [
    {
      name: 'search_items',
      description: 'Search for items by various criteria',
      inputSchema: z.object({
        name: z.string().optional().describe('Item name to search for (partial match)'),
        tier: z.number().min(1).max(5).optional().describe('Item tier (1-5)'),
        type: z.enum(['Blade', 'Bludgeon', 'Magic', 'Metal', 'Leather', 'Cloth', 'Jewelry']).optional().describe('Type of item'),
        slot: z.enum(['Weapon', 'Chest', 'Head', 'Waist', 'Foot', 'Hand', 'Neck', 'Ring']).optional().describe('Equipment slot'),
      }),
      handler: async (args) => {
        const items = await client.searchItems(args);
        return {
          count: items.length,
          items: items.slice(0, 20), // Limit results
        };
      },
    },
    {
      name: 'search_beasts',
      description: 'Search for beasts by tier or name',
      inputSchema: z.object({
        tier: z.number().min(1).max(5).optional().describe('Beast tier (1-5)'),
        name: z.string().optional().describe('Beast name to search for (partial match)'),
        type: z.enum(['Magical', 'Hunter', 'Brute']).optional().describe('Beast type'),
      }),
      handler: async (args) => {
        const beasts = await client.searchBeasts(args);
        return {
          count: beasts.length,
          beasts: beasts.slice(0, 20), // Limit results
        };
      },
    },
    {
      name: 'search_obstacles',
      description: 'Search for obstacles by various criteria',
      inputSchema: z.object({
        tier: z.number().min(1).max(5).optional().describe('Obstacle tier (1-5)'),
        name: z.string().optional().describe('Obstacle name to search for (partial match)'),
        type: z.enum(['Magical', 'Sharp', 'Crushing']).optional().describe('Obstacle type'),
        damageType: z.enum(['Physical', 'Magic', 'Fire', 'Ice', 'Poison', 'Lightning']).optional().describe('Damage type'),
      }),
      handler: async (args) => {
        const obstacles = await client.searchObstacles(args);
        return {
          count: obstacles.length,
          obstacles: obstacles.slice(0, 20), // Limit results
        };
      },
    },
    {
      name: 'get_game_constants',
      description: 'Get various game constants and configuration values',
      inputSchema: z.object({
        category: z.enum([
          'stats',
          'combat',
          'items',
          'beasts',
          'levels',
          'market',
        ]).describe('Category of constants to retrieve'),
      }),
      handler: async ({ category }) => {
        // Return relevant game constants based on category
        const constants: Record<string, any> = {
          stats: {
            startingStats: {
              health: 100,
              strength: 1,
              dexterity: 1,
              vitality: 1,
              intelligence: 1,
              wisdom: 1,
              charisma: 1,
            },
            maxStatValue: 31,
            statUpgradesPerLevel: 1,
          },
          combat: {
            criticalHitMultiplier: 1.5,
            fleeBaseChance: 20,
            minDamage: 1,
            combatTurnDuration: 30, // seconds
          },
          items: {
            tiers: 5,
            maxItemsEquipped: 8,
            itemSlots: ['Hand', 'Chest', 'Head', 'Waist', 'Foot', 'Neck', 'Ring'],
          },
          beasts: {
            totalBeasts: 75,
            tiers: 5,
            beastsPerTier: 15,
            specialAbilities: 3,
          },
          levels: {
            maxLevel: 100,
            xpMultiplier: 1.5,
            xpPerLevel: 'exponential',
          },
          market: {
            basePriceByTier: {
              1: 10,
              2: 25,
              3: 50,
              4: 100,
              5: 250,
            },
            refreshCooldown: 300, // seconds
          },
        };
        
        return constants[category] || { error: 'Invalid category' };
      },
    },
    {
      name: 'get_combat_log',
      description: 'Get recent combat events for an adventurer',
      inputSchema: z.object({
        adventurerId: z.string().describe('Adventurer ID to get combat log for'),
        limit: z.number().min(1).max(50).default(10).describe('Number of events to return'),
      }),
      handler: async ({ adventurerId, limit }) => {
        // This would typically fetch from a combat log table
        // For now, return a structured response format
        return {
          adventurerId,
          message: 'Combat log functionality requires Torii indexer integration',
          events: [],
        };
      },
    },
  ];
}