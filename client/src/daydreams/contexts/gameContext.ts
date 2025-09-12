import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { explorationContext } from "./explorationContext";
import { combatContext } from "./combatContext";
import { levelUpContext } from "./levelUpContext";

interface GameMemory {
  // Core game state
  currentGameId?: number;
  gameStarted: boolean;
  gameDirector?: any; // Reference to the GameDirector
  
  // Full game state snapshot fields (synced from game store)
  gameSettings?: any;
  metadata?: any;
  adventurer?: any;
  adventurerState?: any;
  bag?: any[];
  beast?: any;
  marketItemIds?: number[];
  battleEvent?: any;
  quest?: any;
  collectable?: any;
  collectableTokenURI?: string | null;
  collectableCount?: number;
  selectedStats?: any;
  
  // Game tracking
  lastAction?: string;
  lastActionTime?: number;
  gameHistory: Array<{
    action: string;
    timestamp: number;
    success: boolean;
    details?: any;
  }>;
  
  // Current phase tracking
  currentPhase: "pre-game" | "exploration" | "combat" | "level-up";
}

/**
 * Main game context that composes exploration, combat, and level-up contexts
 * based on the current game phase
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
    currentPhase: "pre-game",
  }),
  
  render: (state) => {
    const { memory } = state;
    
    // Determine current phase based on game state
    let phase: string = "pre-game";
    
    if (!memory.gameStarted || !memory.adventurer) {
      phase = "pre-game";
    } else if (memory.adventurer?.stat_upgrades_available > 0) {
      phase = "level-up";
    } else if (memory.beast && (memory.adventurer?.beast_health ?? 0) > 0) {
      phase = "combat";
    } else {
      phase = "exploration";
    }
    
    // Update phase tracking
    if (memory.currentPhase !== phase) {
      memory.currentPhase = phase as any;
    }
    
    // Return phase-specific render
    if (phase === "pre-game") {
      return `<phase>pre-game</phase>
  <player>${state.args.playerId}</player>
  <status>No active game. Use start-game action to begin.</status>`;
    }
    
    // The composed contexts will handle their own rendering
    return `<phase>${phase}</phase>
  <game_id>${memory.currentGameId || "none"}</game_id>
  <player>${state.args.playerId}</player>`;
  },
  
  instructions: `You are an AI assistant for the Death Mountain dungeon crawler game.
  
The game has three main phases that cycle:
1. LEVEL UP - When stat points are available (MUST be done first)
2. COMBAT - When a beast is present
3. EXPLORATION - Default phase when no beast or stat points

Current phase determines available actions. Help the player make strategic decisions based on the current game state.`,
  
  // Lifecycle hooks
  setup: async (args, settings, agent) => {
    agent.logger.info(
      `Setting up Death Mountain game context for player: ${args.playerId}`
    );
    return {
      setupTime: Date.now(),
      playerId: args.playerId,
    };
  },
  
  onStep: async (ctx) => {
    // Determine and track current phase
    let phase: string;
    
    if (!ctx.memory.gameStarted || !ctx.memory.adventurer) {
      phase = "pre-game";
    } else if (ctx.memory.adventurer?.stat_upgrades_available > 0) {
      phase = "level-up";
    } else if (ctx.memory.beast && (ctx.memory.adventurer?.beast_health ?? 0) > 0) {
      phase = "combat";
    } else {
      phase = "exploration";
    }
    
    if (ctx.memory.currentPhase !== phase) {
      ctx.memory.currentPhase = phase as any;
      // console.log(`[Daydreams] Phase changed: ${phase}`);
    }
  },
  
  onRun: async (ctx) => {
    // console.log(`[Daydreams] Context run completed for player: ${ctx.args.playerId}`);
  },
  
  onError: async (error, ctx) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Daydreams] Error for player ${ctx.args.playerId}:`,
      message
    );
    
    // Add error to game history
    ctx.memory.gameHistory.push({
      action: "error",
      timestamp: Date.now(),
      success: false,
      details: {
        error: message,
        phase: ctx.memory.currentPhase,
      },
    });
  },
})
// Compose the three phase-specific contexts
.use((state) => {
  const contexts = [];
  const gameId = state.memory.currentGameId;
  const playerId = state.args.playerId;
  
  // If no game started, no composed contexts needed
  if (!state.memory.gameStarted || !state.memory.adventurer) {
    return contexts;
  }
  
  // Determine which context to use based on game phase
  // Priority: Level-up > Combat > Exploration
  
  if (state.memory.adventurer?.stat_upgrades_available > 0) {
    // Level-up phase - MUST allocate points before anything else
    contexts.push({
      context: levelUpContext,
      args: { gameId: gameId || 0, playerId },
    });
  } else if (state.memory.beast && (state.memory.adventurer?.beast_health ?? 0) > 0) {
    // Combat phase - beast is present
    contexts.push({
      context: combatContext,
      args: { gameId: gameId || 0, playerId },
    });
  } else {
    // Exploration phase - default when no beast or stat points
    contexts.push({
      context: explorationContext,
      args: { gameId: gameId || 0, playerId },
    });
  }
  
  return contexts;
})
// Add the start-game action (always available)
.setActions([
  action({
    name: "start-game",
    description: "Start a new adventure game",
    schema: z.object({
      gameId: z.number().positive().describe("Unique game/adventurer ID"),
      settings: z.object({
        settings_id: z.number().describe("Settings ID"),
        game_seed: z.number().describe("Game seed for randomization"),
        game_seed_until_xp: z.number().describe("XP threshold for seed usage"),
        adventurer: z.object({
          xp: z.number().describe("Starting XP"),
        }).describe("Adventurer configuration"),
      }).optional().describe("Game settings (uses defaults if not provided)"),
    }),
    handler: async ({ gameId, settings }, ctx) => {
      const gameDirector = ctx.memory.gameDirector;
      if (!gameDirector) {
        return {
          success: false,
          error: "GameDirector not available",
          message: "Game director context is not initialized",
        };
      }
      
      // Use default settings if not provided
      const gameSettings = settings || {
        settings_id: 1,
        game_seed: 0,
        game_seed_until_xp: 0,
        adventurer: { xp: 0 },
      };
      
      try {
        await gameDirector.executeGameAction({
          type: "start_game",
          gameId,
          settings: gameSettings,
        });
        
        // Update memory with game state
        ctx.memory.currentGameId = gameId;
        ctx.memory.gameStarted = true;
        ctx.memory.lastAction = "start_game";
        ctx.memory.lastActionTime = Date.now();
        ctx.memory.currentPhase = "exploration"; // Will be updated based on actual state
        
        // Add to game history
        ctx.memory.gameHistory.push({
          action: "start_game",
          timestamp: Date.now(),
          success: true,
          details: { gameId, settings: gameSettings },
        });
        
        return {
          success: true,
          message: `Game started successfully with ID ${gameId}`,
          gameId,
          settings: gameSettings,
        };
      } catch (error) {
        // Add to game history
        ctx.memory.gameHistory.push({
          action: "start_game",
          timestamp: Date.now(),
          success: false,
          details: { error: error instanceof Error ? error.message : "Unknown error" },
        });
        
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          message: "Failed to start game",
        };
      }
    },
  }),
  
  action({
    name: "get-game-status",
    description: "Get current game status and phase",
    schema: z.object({}),
    handler: async (_, ctx) => {
      const { memory } = ctx;
      
      if (!memory.gameStarted || !memory.adventurer) {
        return {
          phase: "pre-game",
          message: "No active game. Use start-game to begin.",
        };
      }
      
      const phase = memory.currentPhase;
      const adventurer = memory.adventurer;
      
      return {
        phase,
        gameId: memory.currentGameId,
        adventurer: {
          health: adventurer.health,
          level: adventurer.level,
          gold: adventurer.gold,
          xp: adventurer.xp,
          statPointsAvailable: adventurer.stat_upgrades_available || 0,
        },
        beast: memory.beast ? {
          name: memory.beast.name,
          health: memory.beast.health,
          level: memory.beast.level,
        } : null,
        message: `Currently in ${phase} phase`,
      };
    },
  }),
]);

export default gameContext;