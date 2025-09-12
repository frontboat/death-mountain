import { createDreams } from "@daydreamsai/core";
import { createOpenAI } from "@ai-sdk/openai";
import { gameContext } from "./contexts/gameContext";
import { explorationContext } from "./contexts/explorationContext";
import { combatContext } from "./contexts/combatContext";
import { levelUpContext } from "./contexts/levelUpContext";
import { gameEpisodeHooks, analyzeGameHistory } from "./episodeHooks";
import { processGameEvent, getEventTitle, GameEvent } from "@/utils/events";
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
  getRecentEpisodes: (playerId: string, limit?: number) => Promise<any>;
  findSimilarSituations: (playerId: string, query: string, limit?: number) => Promise<any>;
  analyzeStrategies: (playerId: string, situation: string) => Promise<any>;
}

/**
 * Create a Daydreams agent integrated with the Death Mountain game
 */
export const createGameAgent = async (options?: {
  model?: any;
  apiKey?: string;
}): Promise<DaydreamsGameIntegration> => {
  
  // Log initialization details if needed for debugging
  // console.log("[Daydreams] Creating agent with options:", {
  //   hasModel: !!options?.model,
  //   hasApiKey: !!options?.apiKey,
  // });

  // Use API key from options or environment
  const apiKey = options?.apiKey || import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env.local file");
  }
  
  // Create the Daydreams agent
  console.log("[Daydreams] Step 1: Creating OpenAI client");

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
    episodeHooks: gameEpisodeHooks,
    episodicMemory: {
      enabled: true,
      maxEpisodesPerContext: 100, // Keep last 100 episodes per player
      minEpisodeGap: 1000, // Minimum 1 second between episodes
      indexing: {
        enabled: true,
        contentMode: "summary+logs", // Index both summary and logs for better search
      },
    },
  });

  // Start the agent with timeout
  console.log("[Daydreams] Step 2: Starting agent core");
  await Promise.race([
    agent.start(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Agent initialization timeout")), 30000)
    )
  ]);
  console.log("[Daydreams] Step 3: Agent core started");

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
      
      console.log("[Daydreams] GameDirector connected");
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
    
    /**
     * Get recent episodes for a player's game history
     */
    getRecentEpisodes: async (playerId: string, limit: number = 10) => {
      try {
        const contextId = `${gameContext.type}:${playerId}`;
        const episodes = await agent.memory.episodes.getByContext(contextId, limit);
        
        return {
          success: true,
          episodes: episodes.map((ep: any) => ({
            id: ep.id,
            type: ep.type,
            summary: ep.summary,
            timestamp: ep.timestamp,
            duration: ep.duration,
            metadata: ep.metadata,
          })),
          total: episodes.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          episodes: [],
        };
      }
    },
    
    /**
     * Find similar past game situations using vector search
     */
    findSimilarSituations: async (playerId: string, query: string, limit: number = 5) => {
      try {
        const contextId = `${gameContext.type}:${playerId}`;
        const similar = await agent.memory.episodes.findSimilar(contextId, query, limit);
        
        return {
          success: true,
          query,
          situations: similar.map((ep: any) => ({
            id: ep.id,
            type: ep.type,
            summary: ep.summary,
            similarity: ep.similarity,
            metadata: ep.metadata,
            timestamp: ep.timestamp,
          })),
          total: similar.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          situations: [],
        };
      }
    },
    
    /**
     * Analyze past strategies for a given situation
     */
    analyzeStrategies: async (playerId: string, situation: string) => {
      try {
        const contextId = `${gameContext.type}:${playerId}`;
        const analysis = await analyzeGameHistory(agent, contextId, situation, 20);
        
        // Convert strategy map to array for easier consumption
        const strategies = Array.from(analysis.commonStrategies.entries())
          .map(([strategy, count]) => ({ strategy, count }))
          .sort((a, b) => b.count - a.count);
        
        return {
          success: true,
          situation,
          analysis: {
            episodesAnalyzed: analysis.totalEpisodes,
            successRate: Math.round(analysis.successRate * 100),
            commonStrategies: strategies,
            bestOutcomes: analysis.bestOutcomes.slice(0, 3), // Top 3 best outcomes
            recommendation: analysis.successRate > 0.6 
              ? "This situation has been handled successfully before"
              : "This situation has been challenging - consider a different approach",
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
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
 * Process and store game events in the agent's memory
 */
export const processGameEvents = async (
  agent: any,
  playerId: string,
  events: any[],
  sessionId?: string
) => {
  try {
    const contextState = await agent.getContext({
      context: gameContext,
      args: { playerId, sessionId },
    });

    // Check if events are already processed GameEvent objects or raw events
    const processedEvents = events.map((event: any) => {
      try {
        // If event already has a 'type' field and no 'details' field, it's already processed
        if (event.type && !event.details) {
          return event as GameEvent; // Already a GameEvent, use as-is
        }
        // Otherwise, it's a raw event that needs processing
        return processGameEvent(event);
      } catch (error) {
        console.warn("[Daydreams] Failed to process event:", event, error);
        return null;
      }
    }).filter(Boolean) as GameEvent[];

    // Initialize recentEvents if not present
    if (!contextState.memory.recentEvents) {
      contextState.memory.recentEvents = [];
    }

    // Deduplicate events by action_count before adding
    const existingActionCounts = new Set(contextState.memory.recentEvents.map(e => e.action_count));
    const newUniqueEvents = processedEvents.filter(e => !existingActionCounts.has(e.action_count));
    
    // Add new events to the BEGINNING (newest first) and keep only 50
    contextState.memory.recentEvents = [...newUniqueEvents, ...contextState.memory.recentEvents].slice(0, 50);

    // Add events to game history with titles
    for (const event of processedEvents) {
      contextState.memory.gameHistory.push({
        action: event.type,
        timestamp: Date.now(),
        success: true,
        details: {
          title: getEventTitle(event),
          event,
        },
      });
    }

    // Update phase-specific contexts based on events
    const gameId = contextState.memory.currentGameId;
    if (gameId) {
      for (const event of processedEvents) {
        // Update exploration context with discovery/obstacle events
        if (['discovery', 'obstacle', 'buy_items', 'market_items'].includes(event.type)) {
          const exploreCtx = await agent.getContext({
            context: explorationContext,
            args: { gameId, playerId },
          });
          if (!exploreCtx.memory.recentEvents) {
            exploreCtx.memory.recentEvents = [];
          }
          // Avoid duplicates by checking action_count
          if (!exploreCtx.memory.recentEvents.some(e => e.action_count === event.action_count)) {
            exploreCtx.memory.recentEvents.unshift(event); // Add to beginning (newest first)
            exploreCtx.memory.recentEvents = exploreCtx.memory.recentEvents.slice(0, 30); // Keep last 30
          }
        }

        // Update combat context with battle events
        if (['attack', 'beast_attack', 'flee', 'ambush', 'beast', 'defeated_beast', 'fled_beast'].includes(event.type)) {
          const combatCtx = await agent.getContext({
            context: combatContext,
            args: { gameId, playerId },
          });
          if (!combatCtx.memory.recentEvents) {
            combatCtx.memory.recentEvents = [];
          }
          // Avoid duplicates by checking action_count
          if (!combatCtx.memory.recentEvents.some(e => e.action_count === event.action_count)) {
            combatCtx.memory.recentEvents.unshift(event); // Add to beginning (newest first)
            combatCtx.memory.recentEvents = combatCtx.memory.recentEvents.slice(0, 30); // Keep last 30
          }
        }

        // Update level-up context
        if (event.type === 'level_up' || event.type === 'stat_upgrade') {
          const levelCtx = await agent.getContext({
            context: levelUpContext,
            args: { gameId, playerId },
          });
          if (!levelCtx.memory.recentEvents) {
            levelCtx.memory.recentEvents = [];
          }
          // Avoid duplicates by checking action_count
          if (!levelCtx.memory.recentEvents.some(e => e.action_count === event.action_count)) {
            levelCtx.memory.recentEvents.unshift(event); // Add to beginning (newest first)
            levelCtx.memory.recentEvents = levelCtx.memory.recentEvents.slice(0, 30); // Keep last 30
          }
        }
      }
    }

    return processedEvents;
  } catch (error) {
    console.error("[Daydreams] Failed to process events:", error);
    return [];
  }
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
    exploreLog?: any;
    events?: any[];
    collectable?: any;
    collectableTokenURI?: string | null;
    collectableCount?: number;
    selectedStats?: any;
    gameDirector?: any;
  },
  sessionId?: string
) => {
  try {
    const contextState = await agent.getContext({
      context: gameContext,
      args: { playerId, sessionId },
    });

    // Update game ID
    if (gameState.gameId !== undefined) {
      contextState.memory.currentGameId = gameState.gameId;
      contextState.memory.gameStarted = true;
    }

    // Store full snapshot in main context
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
    contextState.memory.gameDirector = gameState.gameDirector ?? contextState.memory.gameDirector;

    // Process any new events
    if (gameState.events && gameState.events.length > 0) {
      await processGameEvents(agent, playerId, gameState.events, sessionId);
    }

    // Sync to appropriate phase-specific context
    const gameId = contextState.memory.currentGameId;
    if (contextState.memory.gameStarted && contextState.memory.adventurer && gameId) {
      // Determine current phase and sync to the right context
      if (contextState.memory.adventurer?.stat_upgrades_available > 0) {
        // Level-up context
        const levelCtx = await agent.getContext({
          context: levelUpContext,
          args: { gameId, playerId },
        });
        levelCtx.memory.adventurer = contextState.memory.adventurer;
        levelCtx.memory.selectedStats = contextState.memory.selectedStats;
        levelCtx.memory.gameDirector = contextState.memory.gameDirector;
      } else if (contextState.memory.beast && (contextState.memory.adventurer?.beast_health ?? 0) > 0) {
        // Combat context
        const combatCtx = await agent.getContext({
          context: combatContext,
          args: { gameId, playerId },
        });
        combatCtx.memory.adventurer = contextState.memory.adventurer;
        combatCtx.memory.adventurerState = contextState.memory.adventurerState;
        combatCtx.memory.beast = contextState.memory.beast;
        combatCtx.memory.battleEvent = contextState.memory.battleEvent;
        combatCtx.memory.bag = contextState.memory.bag;
        combatCtx.memory.gameDirector = contextState.memory.gameDirector;
      } else {
        // Exploration context
        const exploreCtx = await agent.getContext({
          context: explorationContext,
          args: { gameId, playerId },
        });
        exploreCtx.memory.currentGameId = contextState.memory.currentGameId;
        exploreCtx.memory.gameStarted = contextState.memory.gameStarted;
        exploreCtx.memory.adventurer = contextState.memory.adventurer;
        exploreCtx.memory.adventurerState = contextState.memory.adventurerState;
        exploreCtx.memory.bag = contextState.memory.bag;
        exploreCtx.memory.marketItemIds = contextState.memory.marketItemIds;
        exploreCtx.memory.gameDirector = contextState.memory.gameDirector;
      }
    }

    // Add sync event to history
    contextState.memory.gameHistory.push({
      action: "sync_game_state",
      timestamp: Date.now(),
      success: true,
      details: {
        syncedFields: Object.keys(gameState),
        gameId: gameState.gameId,
        phase: contextState.memory.currentPhase,
      },
    });

    return {
      success: true,
      message: "Game state synced successfully",
      syncedFields: Object.keys(gameState),
      currentPhase: contextState.memory.currentPhase,
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
