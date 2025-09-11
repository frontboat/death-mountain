import { createDreams } from "@daydreamsai/core";
import { createOpenAI } from "@ai-sdk/openai";
import { gameContext } from "./gameContext";
import * as z from "zod";

// Unified interface that works with both desktop and mobile GameDirector
interface UnifiedGameDirector {
  executeGameAction: (action: any) => void;
  actionFailed: number;
  spectating: boolean;
  eventsProcessed: number;
  // Optional properties for desktop
  videoQueue?: string[];
  setVideoQueue?: (queue: string[]) => void;
}

/**
 * Interface for integrating Daydreams with the existing GameDirector
 */
export interface DaydreamsGameIntegration {
  agent: any; // The Daydreams agent
  initializeWithGameDirector: (gameDirector: UnifiedGameDirector) => Promise<void>;
  sendMessage: (playerId: string, message: string, sessionId?: string) => Promise<any>;
  getGameStatus: (playerId: string, sessionId?: string) => Promise<any>;
  getContextState: (playerId: string, sessionId?: string) => Promise<any>;
}

/**
 * Create a Daydreams agent integrated with the Death Mountain game
 */
export const createGameAgent = async (options?: {
  model?: any;
  apiKey?: string;
}): Promise<DaydreamsGameIntegration> => {
  
  console.log("🤖 createGameAgent called with options:", {
    hasModel: !!options?.model,
    hasApiKey: !!options?.apiKey,
    envApiKey: !!import.meta.env.VITE_OPENAI_API_KEY,
  });

  // Use API key from options or environment
  const apiKey = options?.apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env.local file");
  }
  
  // Create the Daydreams agent
  console.log("🤖 Creating OpenAI client (browser) with API key:", apiKey ? "✅ Present" : "❌ Missing");

  // Configure OpenAI client explicitly with the provided API key (no env access in browser)
  const openaiClient = createOpenAI({ apiKey });

  const agent = createDreams({
    model: openaiClient("gpt-4o-mini"),
    contexts: [gameContext],
    inputs: {
      text: {
        schema: z.string(),
        description: "Text input from user",
      },
    },
    outputs: {
      text: {
        schema: z.string(),
        description: "Text response to user",
      },
    },
  });

  // Start the agent with timeout
  console.log("🤖 Starting agent...");
  await Promise.race([
    agent.start(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Agent initialization timeout")), 30000)
    )
  ]);
  console.log("🤖 Agent started successfully!");

  const integration: DaydreamsGameIntegration = {
    agent,

    /**
     * Initialize the agent with a reference to the GameDirector
     */
    initializeWithGameDirector: async (gameDirector: UnifiedGameDirector) => {
      // Store the GameDirector reference in the agent's memory system
      // This allows actions to access the GameDirector functionality
      await agent.memory.remember("gameDirector", {
        scope: "global",
        type: "system",
        metadata: {
          component: "GameDirector",
          initialized: true,
          timestamp: Date.now(),
        },
      });

      // Store the actual GameDirector instance
      // Note: In a real implementation, you might want to create a more sophisticated
      // bridge pattern to avoid direct coupling
      (agent as any)._gameDirector = gameDirector;
    },

    /**
     * Send a message to the agent and get a response
     */
    sendMessage: async (playerId: string, message: string, sessionId?: string) => {
      try {
        // Get or create the context for this player
        const contextState = await agent.getContext({
          context: gameContext,
          args: { playerId, sessionId },
        });

        // Inject the GameDirector reference into the context memory
        if ((agent as any)._gameDirector) {
          contextState.memory.gameDirector = (agent as any)._gameDirector;
        }

        // Send the message to the agent
        const result = await agent.send({
          context: gameContext,
          args: { playerId, sessionId },
          input: { type: "text", data: message },
        });

        // Extract the response robustly from returned results
        const out = result.find(
          (r: any) => r?.ref === "text" || r?.ref === "output" || r?.name === "text"
        );
        let response: any = out && "data" in out ? (out as any).data : null;
        if (response && typeof response === "object" && "content" in response) {
          response = (response as any).content;
        }
        if (!response) {
          response = "I couldn't process your request. Please try again.";
        }

        // Update the game history
        contextState.memory.gameHistory.push({
          action: "chat_message",
          timestamp: Date.now(),
          success: true,
          details: {
            message,
            response,
          },
        });

        return {
          success: true,
          response,
          playerId,
          sessionId,
          gameStatus: {
            gameStarted: contextState.memory.gameStarted,
            currentGameId: contextState.memory.currentGameId,
            lastAction: contextState.memory.lastAction,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          response: "Sorry, I encountered an error processing your request.",
          playerId,
          sessionId,
        };
      }
    },

    /**
     * Get the current game status for a player
     */
    getGameStatus: async (playerId: string, sessionId?: string) => {
      try {
        const contextState = await agent.getContext({
          context: gameContext,
          args: { playerId, sessionId },
        });

        return {
          success: true,
          playerId,
          sessionId,
          gameStarted: contextState.memory.gameStarted,
          currentGameId: contextState.memory.currentGameId,
          lastAction: contextState.memory.lastAction,
          lastActionTime: contextState.memory.lastActionTime,
          adventurerStats: contextState.memory.adventurerStats,
          preferences: contextState.memory.preferences,
          totalActions: contextState.memory.gameHistory.length,
          recentActions: contextState.memory.gameHistory.slice(-10),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          playerId,
          sessionId,
        };
      }
    },

    /**
     * Return the full Daydreams context state (args, memory, history)
     */
    getContextState: async (playerId: string, sessionId?: string) => {
      try {
        const contextState = await agent.getContext({
          context: gameContext,
          args: { playerId, sessionId },
        });

        // Return a JSON-serializable snapshot
        return {
          success: true,
          playerId,
          sessionId,
          args: contextState.args,
          memory: contextState.memory,
          // recent actions for convenience
          recentActions: contextState.memory?.gameHistory?.slice?.(-25) || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          playerId,
          sessionId,
        };
      }
    },
  };

  return integration;
};

/**
 * Hook to integrate Daydreams with the existing React GameDirector context
 */
export const useDaydreamsIntegration = () => {
  // This would be used in your React components to initialize the integration
  // Example usage:
  // const { sendMessage, getGameStatus } = useDaydreamsIntegration();
  
  return {
    createAgent: createGameAgent,
    // Add more integration utilities as needed
  };
};

/**
 * Utility to sync game state from the blockchain to Daydreams context
 */
export const syncGameState = async (
  agent: any,
  playerId: string,
  gameState: {
    gameId?: number;
    metadata?: any;
    adventurer?: any;
    adventurerState?: any;
    bag?: any;
    beast?: any;
    marketItemIds?: number[];
    battleEvent?: any;
    collectable?: any;
    collectableTokenURI?: string | null;
    collectableCount?: number;
    selectedStats?: any;
  },
  sessionId?: string
) => {
  try {
    const contextState = await agent.getContext({
      context: gameContext,
      args: { playerId, sessionId },
    });

    // Update adventurer stats if available
    if (gameState.adventurer) {
      contextState.memory.adventurerStats = {
        health: gameState.adventurer.health || 0,
        xp: gameState.adventurer.xp || 0,
        gold: gameState.adventurer.gold || 0,
        level: Math.floor((gameState.adventurer.xp || 0) / 1000) + 1, // Example level calculation
      };
    }

    // Update game ID
    if (gameState.gameId) {
      contextState.memory.currentGameId = gameState.gameId;
      contextState.memory.gameStarted = true;
    }

    // Store full snapshot
    contextState.memory.metadata = gameState.metadata ?? contextState.memory.metadata;
    contextState.memory.adventurer = gameState.adventurer ?? contextState.memory.adventurer;
    contextState.memory.adventurerState = gameState.adventurerState ?? contextState.memory.adventurerState;
    contextState.memory.bag = gameState.bag ?? contextState.memory.bag;
    contextState.memory.beast = gameState.beast ?? contextState.memory.beast;
    contextState.memory.marketItemIds = gameState.marketItemIds ?? contextState.memory.marketItemIds;
    contextState.memory.battleEvent = gameState.battleEvent ?? contextState.memory.battleEvent;
    contextState.memory.collectable = gameState.collectable ?? contextState.memory.collectable;
    contextState.memory.collectableTokenURI = gameState.collectableTokenURI ?? contextState.memory.collectableTokenURI;
    contextState.memory.collectableCount = gameState.collectableCount ?? contextState.memory.collectableCount;
    contextState.memory.selectedStats = gameState.selectedStats ?? contextState.memory.selectedStats;

    // Add sync event to history
    contextState.memory.gameHistory.push({
      action: "sync_game_state",
      timestamp: Date.now(),
      success: true,
      details: {
        syncedFields: Object.keys(gameState),
        gameId: gameState.gameId,
      },
    });

    return {
      success: true,
      message: "Game state synced successfully",
      syncedFields: Object.keys(gameState),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to sync game state",
    };
  }
};

export default createGameAgent;
