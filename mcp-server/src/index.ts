import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { GameDataClient } from './clients/gameData.js';
import { createGameDataTools } from './tools/gameData.js';
import { createGameMechanicsTools } from './tools/gameMechanics.js';
import { createSearchTools } from './tools/search.js';
import { createAdventurerTools } from './tools/adventurer.js';
import { createCombatSimulationTools } from './tools/combatSimulation.js';
import { createMarketTools } from './tools/market.js';
import { createExplorationTools } from './tools/exploration.js';

const server = new Server(
  {
    name: 'loot-survivor-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const gameDataClient = new GameDataClient(
  process.env.TORII_URL || 'https://api.cartridge.gg/x/sepolia/loot-survivor-v2/torii',
  process.env.CHAIN || 'sepolia'
);

const gameDataTools = createGameDataTools(gameDataClient);
const gameMechanicsTools = createGameMechanicsTools();
const searchTools = createSearchTools(gameDataClient);
const adventurerTools = createAdventurerTools(gameDataClient);
const combatSimulationTools = createCombatSimulationTools(gameDataClient);
const marketTools = createMarketTools(gameDataClient);
const explorationTools = createExplorationTools(gameDataClient);

const allTools = [
  ...gameDataTools,
  ...gameMechanicsTools,
  ...searchTools,
  ...adventurerTools,
  ...combatSimulationTools,
  ...marketTools,
  ...explorationTools,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = allTools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Tool ${name} not found`);
  }

  try {
    const validatedArgs = tool.inputSchema.parse(args);
    const result = await tool.handler(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid arguments: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Loot Survivor MCP Server running...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});