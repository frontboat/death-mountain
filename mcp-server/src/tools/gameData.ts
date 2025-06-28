import { z } from 'zod';
import { GameDataClient } from '../clients/gameData.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

export function createGameDataTools(client: GameDataClient): Tool[] {
  return [
    {
      name: 'get_adventurer',
      description: 'Get detailed information about an adventurer by ID',
      inputSchema: z.object({
        adventurerId: z.string().describe('The adventurer ID to look up'),
      }),
      handler: async ({ adventurerId }) => {
        const adventurer = await client.getAdventurer(adventurerId);
        if (!adventurer) {
          return { error: 'Adventurer not found' };
        }
        return adventurer;
      },
    },
    {
      name: 'get_leaderboard',
      description: 'Get the current game leaderboard sorted by XP',
      inputSchema: z.object({
        limit: z.number().min(1).max(100).default(10).describe('Number of entries to return'),
      }),
      handler: async ({ limit }) => {
        const leaderboard = await client.getLeaderboard(limit);
        return {
          count: leaderboard.length,
          adventurers: leaderboard,
        };
      },
    },
    {
      name: 'get_beast',
      description: 'Get information about a specific beast',
      inputSchema: z.object({
        beastId: z.number().describe('The beast ID to look up'),
        level: z.number().min(1).max(100).optional().default(1).describe('Beast level (affects health and gold reward)'),
      }),
      handler: async ({ beastId, level }) => {
        const beast = await client.getBeast(beastId, level);
        if (!beast) {
          return { error: 'Beast not found' };
        }
        return beast;
      },
    },
    {
      name: 'get_item',
      description: 'Get information about a specific item',
      inputSchema: z.object({
        itemId: z.number().describe('The item ID to look up'),
      }),
      handler: async ({ itemId }) => {
        const item = await client.getItem(itemId);
        if (!item) {
          return { error: 'Item not found' };
        }
        return item;
      },
    },
    {
      name: 'get_obstacle',
      description: 'Get information about a specific obstacle',
      inputSchema: z.object({
        obstacleId: z.number().describe('The obstacle ID to look up'),
        level: z.number().min(1).max(100).optional().default(1).describe('Level context (affects damage calculation)'),
      }),
      handler: async ({ obstacleId, level }) => {
        const obstacle = await client.getObstacle(obstacleId, level);
        if (!obstacle) {
          return { error: 'Obstacle not found' };
        }
        return obstacle;
      },
    },
  ];
}