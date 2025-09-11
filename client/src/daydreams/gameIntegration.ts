import { createDreams } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import { gameContext } from "./gameContext";
import { GameDirectorContext } from "../desktop/contexts/GameDirector";

/**
 * Interface for integrating Daydreams with the existing GameDirector
 */
export interface DaydreamsGameIntegration {
  agent: any; // The Daydreams agent
  initializeWithGameDirector: (gameDirector: GameDirectorContext) => Promise<void>;
  sendMessage: (playerId: string, message: string, sessionId?: string) => Promise<any>;
  getGameStatus: (playerId: string, sessionId?: string) => Promise<any>;
}

/**
 * Create a Daydreams agent integrated with the Death Mountain game
 */
export const createGameAgent = async (options?: {
  model?: any;
  apiKey?: string;
}): Promise<DaydreamsGameIntegration> => {
  
  // Create the Daydreams agent
  const agent = createDreams({
    model: options?.model || openai("gpt-4o-mini"),
    contexts: [gameContext],
    instructions: `You are an AI assistant for the Death Mountain game. 
    Help players navigate the dungeon, make strategic decisions, and understand game mechanics.
    You have access to all game actions through the integrated system.`,
  });

  // Start the agent
  await agent.start();

  const integration: DaydreamsGameIntegration = {
    agent,

    /**
     * Initialize the agent with a reference to the GameDirector
     */
    initializeWithGameDirector: async (gameDirector: GameDirectorContext) => {
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

        // Extract the response
        const output = result.find((r) => r.ref === "output");
        const response = output && "data" in output 
          ? output.data 
          : "I couldn't process your request. Please try again.";

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
    adventurer?: any;
    bag?: any;
    beast?: any;
    gameId?: number;
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
