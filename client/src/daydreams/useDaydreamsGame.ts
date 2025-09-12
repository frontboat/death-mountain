import { useEffect, useState, useCallback, useRef } from "react";
import { createGameAgent, syncGameState, DaydreamsGameIntegration } from "./gameIntegration";
import { useGameStore } from "../stores/gameStore";

// Import both GameDirector hooks
import { useGameDirector as useDesktopGameDirector } from "../desktop/contexts/GameDirector";
import { useGameDirector as useMobileGameDirector } from "../mobile/contexts/GameDirector";
import { useUIStore } from "../stores/uiStore";

// Hook to get the appropriate GameDirector based on current UI mode
const useGameDirector = () => {
  const { useMobileClient } = useUIStore();
  
  try {
    // Use the appropriate GameDirector based on UI mode
    if (useMobileClient) {
      return useMobileGameDirector();
    } else {
      return useDesktopGameDirector();
    }
  } catch (error) {
    console.warn("[Daydreams] Failed to load GameDirector:", error);
    // Try fallback
    try {
      return useDesktopGameDirector();
    } catch (fallbackError) {
      console.error("[Daydreams] Both GameDirectors failed:", fallbackError);
      return null;
    }
  }
};

interface DaydreamsGameState {
  agent: DaydreamsGameIntegration | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  lastResponse: string | null;
}

interface UseDaydreamsGameOptions {
  playerId: string;
  sessionId?: string;
  autoSync?: boolean;
  apiKey?: string;
  pollIntervalMs?: number; // optional periodic sync interval
}

/**
 * React hook for integrating Daydreams AI with the Death Mountain game
 */
export const useDaydreamsGame = (options: UseDaydreamsGameOptions) => {
  const { playerId, sessionId, autoSync = true, apiKey = import.meta.env.VITE_OPENAI_API_KEY, pollIntervalMs = 5000 } = options;
  
  // Get the existing game director and game state
  const gameDirector = useGameDirector();
  const {
    gameId,
    gameSettings,
    adventurer,
    adventurerState,
    bag,
    beast,
    marketItemIds,
    newMarket,
    metadata,
    exploreLog,
    battleEvent,
    quest,
    collectable,
    collectableTokenURI,
    collectableCount,
    selectedStats,
  } = useGameStore();
  
  // State for the Daydreams integration
  const [state, setState] = useState<DaydreamsGameState>({
    agent: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    lastResponse: null,
  });

  // Ref to prevent multiple initializations
  const initializationRef = useRef(false);
  const lastSyncRef = useRef<number>(0); // retained but unused after removing throttle
  const lastEventProcessedRef = useRef<number>(0); // Track last processed event

  // Initialize the Daydreams agent
  const initializeAgent = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log("[Daydreams] Initializing AI assistant for player:", playerId);

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!gameDirector) {
        throw new Error("GameDirector not available");
      }

      if (!apiKey) {
        throw new Error("OpenAI API key is missing. Set VITE_OPENAI_API_KEY or pass apiKey option.");
      }

      // Create the Daydreams agent
      const agent = await createGameAgent({
        apiKey,
      });

      // Initialize with the GameDirector
      console.log("[Daydreams] Step 4: Connecting to game engine");
      await agent.initializeWithGameDirector(gameDirector);

      setState(prev => ({
        ...prev,
        agent,
        isInitialized: true,
        isLoading: false,
      }));

      console.log("[Daydreams] Step 5: AI assistant ready");
    } catch (error) {
      console.error("[Daydreams] Initialization failed:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      }));
      initializationRef.current = false; // Allow retry
    }
  }, [gameDirector, apiKey, playerId]);

  // Sync game state with Daydreams
  const syncState = useCallback(async (force: boolean = false) => {
    if (!state.agent || !autoSync) return;

    try {
      // Collect all recent events - these are REAL processed GameEvents from the blockchain
      let events: any[] = [];
      
      // exploreLog is an array of exploration events (discoveries, obstacles, defeated beasts, etc.)
      // The log appears to be stored with newest first and may contain duplicates
      if (exploreLog && exploreLog.length > 0) {
        // Deduplicate by action_count and take the most recent (first) 10 unique events
        const uniqueExploreEvents = Array.from(
          new Map(exploreLog.map(e => [e.action_count, e])).values()
        ).slice(0, 10);
        events.push(...uniqueExploreEvents);
      }
      
      // battleEvent is the most recent combat event
      if (battleEvent) {
        events.push(battleEvent);
      }

      await syncGameState(
        state.agent.agent,
        playerId,
        {
          gameId: gameId || undefined,
          metadata,
          adventurer,
          adventurerState,
          bag,
          beast,
          marketItemIds,
          battleEvent,
          exploreLog,
          events, // These are actual GameEvent objects with type, xp_reward, gold_reward, etc.
          collectable,
          collectableTokenURI,
          collectableCount,
          selectedStats,
        },
        sessionId
      );
      // keep timestamp updated if needed for future diagnostics
      lastSyncRef.current = Date.now();
    } catch (error) {
      console.warn("[Daydreams] State sync failed:", error);
    }
  }, [
    state.agent,
    playerId,
    sessionId,
    gameId,
    gameSettings,
    metadata,
    adventurer,
    adventurerState,
    bag,
    beast,
    marketItemIds,
    newMarket,
    exploreLog,
    battleEvent,
    quest,
    collectable,
    collectableTokenURI,
    collectableCount,
    selectedStats,
    autoSync,
    gameDirector,
  ]);

  // Send a message to the AI
  const sendMessage = useCallback(async (message: string) => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Ensure AI memory is up to date before sending
      await syncState(true);

      const result = await state.agent.sendMessage(playerId, message, sessionId);

      setState(prev => ({
        ...prev,
        lastResponse: result.response,
        isLoading: false,
        error: result.success ? null : result.error || "Unknown error",
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      throw error;
    }
  }, [state.agent, playerId, sessionId, syncState]);

  // Get game status from AI
  const getGameStatus = useCallback(async () => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }

    return await state.agent.getGameStatus(playerId, sessionId);
  }, [state.agent, playerId, sessionId]);

  // Fetch full Daydreams context state
  const getContextState = useCallback(async () => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }

    return await state.agent.getContextState(playerId, sessionId);
  }, [state.agent, playerId, sessionId]);

  // Snapshot the entire current game store state
  const getGameStateSnapshot = useCallback(() => {
    return {
      gameId,
      gameSettings,
      metadata,
      adventurer,
      adventurerState,
      bag,
      beast,
      marketItemIds,
      newMarket,
      exploreLog,
      battleEvent,
      quest,
      collectable,
      collectableTokenURI,
      collectableCount,
      selectedStats,
    };
  }, [
    gameId,
    gameSettings,
    metadata,
    adventurer,
    adventurerState,
    bag,
    beast,
    marketItemIds,
    newMarket,
    exploreLog,
    battleEvent,
    quest,
    collectable,
    collectableTokenURI,
    collectableCount,
    selectedStats,
  ]);

  // Ask AI for strategic advice
  const getAdvice = useCallback(async (situation?: string) => {
    const baseMessage = "What should I do next in the game?";
    const message = situation 
      ? `${baseMessage} Current situation: ${situation}`
      : baseMessage;
    
    return await sendMessage(message);
  }, [sendMessage]);

  // Ask AI to explain game mechanics
  const explainMechanic = useCallback(async (mechanic: string) => {
    const message = `Can you explain how ${mechanic} works in the game?`;
    return await sendMessage(message);
  }, [sendMessage]);

  // Initialize agent when component mounts
  useEffect(() => {
    if (!state.isInitialized && !initializationRef.current) {
      initializeAgent();
    }
  }, [initializeAgent, state.isInitialized]);

  // Auto-sync game state when it changes
  useEffect(() => {
    syncState();
  }, [syncState, adventurer, bag, beast, gameId]);

  // Periodic background sync (independent of state changes)
  useEffect(() => {
    if (!state.isInitialized || !autoSync) return;
    const interval = setInterval(() => {
      // Force to bypass throttle and keep AI memory fresh
      syncState(true);
    }, Math.max(1000, pollIntervalMs));
    return () => clearInterval(interval);
  }, [state.isInitialized, autoSync, pollIntervalMs, syncState]);

  // Episode-related methods
  const getRecentGames = useCallback(async (limit: number = 10) => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }
    return await state.agent.getRecentEpisodes(playerId, limit);
  }, [state.agent, playerId]);

  const findSimilarGames = useCallback(async (query: string, limit: number = 5) => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }
    return await state.agent.findSimilarSituations(playerId, query, limit);
  }, [state.agent, playerId]);

  const analyzeStrategy = useCallback(async (situation: string) => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }
    return await state.agent.analyzeStrategies(playerId, situation);
  }, [state.agent, playerId]);

  return {
    // State
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    lastResponse: state.lastResponse,

    // Core Methods
    sendMessage,
    getGameStatus,
    getAdvice,
    explainMechanic,
    syncState,
    getContextState,
    getGameStateSnapshot,

    // Episode Methods
    getRecentGames,
    findSimilarGames,
    analyzeStrategy,

    // Utility methods
    retry: () => {
      initializationRef.current = false;
      setState(prev => ({ ...prev, error: null, isLoading: false }));
      initializeAgent();
    },
  };
};

/**
 * Hook for getting pre-built game commands
 */
export const useGameCommands = (sendMessage: (message: string) => Promise<any>) => {
  return {
    startGame: (gameId: number, settings?: any) => 
      sendMessage(`Start a new game with ID ${gameId}${settings ? ` using these settings: ${JSON.stringify(settings)}` : ""}`),
    
    explore: (untilBeast = false) => 
      sendMessage(`Explore the dungeon${untilBeast ? " until I find a beast" : ""}`),
    
    attack: (untilDeath = false) => 
      sendMessage(`Attack the beast${untilDeath ? " until death" : ""}`),
    
    flee: (untilDeath = false) => 
      sendMessage(`Flee from the beast${untilDeath ? " until successful or death" : ""}`),
    
    buyPotions: (count: number) => 
      sendMessage(`Buy ${count} health potions`),
    
    upgradeStats: (stats: string[]) => 
      sendMessage(`Upgrade my ${stats.join(", ")} stats`),
    
    equipItems: (itemIds: number[]) => 
      sendMessage(`Equip items with IDs: ${itemIds.join(", ")}`),
    
    dropItems: (itemIds: number[]) => 
      sendMessage(`Drop items with IDs: ${itemIds.join(", ")}`),
    
    getStatus: () => 
      sendMessage("What's my current game status?"),
    
    getAdvice: (situation?: string) => 
      sendMessage(situation 
        ? `What should I do in this situation: ${situation}?`
        : "What should I do next?"),
  };
};

export default useDaydreamsGame;
