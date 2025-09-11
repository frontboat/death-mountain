import { context } from "@daydreamsai/core";
import * as z from "zod";
import { gameActions } from "./gameActions";

// Interface for the game memory
interface GameMemory {
  currentGameId?: number;
  gameStarted: boolean;
  lastAction?: string;
  lastActionTime?: number;
  gameDirector?: any; // Reference to the GameDirector context
  adventurerStats?: {
    health: number;
    xp: number;
    gold: number;
    level: number;
  };
  gameHistory: Array<{
    action: string;
    timestamp: number;
    success: boolean;
    details?: any;
  }>;
  preferences: {
    autoExplore: boolean;
    autoAttack: boolean;
    preferredStats: string[];
  };
}

/**
 * Game context that manages the state and actions for the Death Mountain game
 */
export const gameContext = context<GameMemory>({
  type: "death-mountain-game",
  
  schema: z.object({
    playerId: z.string().describe("Unique identifier for the player"),
    sessionId: z.string().optional().describe("Optional session identifier"),
  }),

  create: (): GameMemory => ({
    gameStarted: false,
    gameHistory: [],
    preferences: {
      autoExplore: false,
      autoAttack: false,
      preferredStats: ["strength", "vitality", "dexterity"],
    },
  }),

  render: (state) => {
    const { memory } = state;
    const recentActions = memory.gameHistory.slice(-5);
    
    return `
Death Mountain Game Session
Player: ${state.args.playerId}
${state.args.sessionId ? `Session: ${state.args.sessionId}` : ""}

Game Status:
- Game Started: ${memory.gameStarted ? "Yes" : "No"}
- Current Game ID: ${memory.currentGameId || "None"}
- Last Action: ${memory.lastAction || "None"}
- Last Action Time: ${memory.lastActionTime ? new Date(memory.lastActionTime).toLocaleString() : "Never"}

${memory.adventurerStats ? `
Adventurer Stats:
- Health: ${memory.adventurerStats.health}
- XP: ${memory.adventurerStats.xp}
- Gold: ${memory.adventurerStats.gold}
- Level: ${memory.adventurerStats.level}
` : "No adventurer stats available"}

Player Preferences:
- Auto Explore: ${memory.preferences.autoExplore ? "Enabled" : "Disabled"}
- Auto Attack: ${memory.preferences.autoAttack ? "Enabled" : "Disabled"}
- Preferred Stats: ${memory.preferences.preferredStats.join(", ")}

Recent Actions (${recentActions.length}):
${recentActions.length > 0 
  ? recentActions.map(action => 
      `- ${action.action} (${new Date(action.timestamp).toLocaleTimeString()}) - ${action.success ? "✅" : "❌"}`
    ).join("\n")
  : "No recent actions"}

Total Actions Taken: ${memory.gameHistory.length}
    `.trim();
  },

  instructions: `You are an AI assistant that helps players navigate the Death Mountain game. 

You can help players with:
1. Starting new games and configuring settings
2. Exploring dungeons and making strategic decisions
3. Managing combat with beasts (attack or flee)
4. Purchasing items and potions from the market
5. Allocating stat points for character progression
6. Managing inventory (equipping and dropping items)
7. Providing game status and strategic advice

Key Game Mechanics:
- Players control an adventurer exploring a dangerous dungeon
- Combat is turn-based against various beasts
- Items and equipment improve adventurer capabilities
- Stat points can be allocated to improve different attributes
- Gold is earned through exploration and combat
- Health potions can be purchased to heal the adventurer

Be helpful, strategic, and engaging. Provide clear explanations of game mechanics when needed.
Always consider the player's current game state when making recommendations.`,

  // Lifecycle hooks
  setup: async (args, settings, agent) => {
    agent.logger.info(`Setting up Death Mountain game context for player: ${args.playerId}`);
    return {
      setupTime: Date.now(),
      playerId: args.playerId,
    };
  },

  onStep: async (ctx) => {
    // Update any real-time game state if needed
    // This could sync with the actual game state from the blockchain
  },

  onRun: async (ctx) => {
    // Log the completion of a run/conversation
    ctx.agent.logger.info(`Game context run completed for player: ${ctx.args.playerId}`);
  },

  onError: async (error, ctx) => {
    ctx.agent.logger.error(`Error in game context for player ${ctx.args.playerId}:`, error);
    
    // Add error to game history
    ctx.memory.gameHistory.push({
      action: "error",
      timestamp: Date.now(),
      success: false,
      details: {
        error: error.message,
        stack: error.stack,
      },
    });
  },
}).setActions(gameActions);

export default gameContext;
