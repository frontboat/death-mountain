import { useEffect, useState, useCallback, useRef } from "react";
import { useGameDirector } from "../desktop/contexts/GameDirector";
import { createGameAgent, syncGameState, DaydreamsGameIntegration } from "./gameIntegration";
import { useGameStore } from "../stores/gameStore";

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
}

/**
 * React hook for integrating Daydreams AI with the Death Mountain game
 */
export const useDaydreamsGame = (options: UseDaydreamsGameOptions) => {
  const { playerId, sessionId, autoSync = true, apiKey } = options;
  
  // Get the existing game director and game state
  const gameDirector = useGameDirector();
  const { gameId, adventurer, bag, beast } = useGameStore();
  
  // State for the Daydreams integration
  const [state, setState] = useState<DaydreamsGameState>({
    agent: null,
    isInitialized: false,
    isLoading: true,
    error: null,
    lastResponse: null,
  });

  // Ref to prevent multiple initializations
  const initializationRef = useRef(false);
  const lastSyncRef = useRef<number>(0);

  // Initialize the Daydreams agent
  const initializeAgent = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Create the Daydreams agent
      const agent = await createGameAgent({
        apiKey,
      });

      // Initialize with the GameDirector
      await agent.initializeWithGameDirector(gameDirector);

      setState(prev => ({
        ...prev,
        agent,
        isInitialized: true,
        isLoading: false,
      }));

      console.log("Daydreams agent initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Daydreams agent:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      }));
      initializationRef.current = false; // Allow retry
    }
  }, [gameDirector, apiKey]);

  // Sync game state with Daydreams
  const syncState = useCallback(async () => {
    if (!state.agent || !autoSync) return;

    const now = Date.now();
    // Throttle syncing to once every 5 seconds
    if (now - lastSyncRef.current < 5000) return;

    try {
      await syncGameState(
        state.agent.agent,
        playerId,
        {
          adventurer,
          bag,
          beast,
          gameId,
        },
        sessionId
      );
      lastSyncRef.current = now;
    } catch (error) {
      console.warn("Failed to sync game state:", error);
    }
  }, [state.agent, playerId, sessionId, adventurer, bag, beast, gameId, autoSync]);

  // Send a message to the AI
  const sendMessage = useCallback(async (message: string) => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

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
  }, [state.agent, playerId, sessionId]);

  // Get game status from AI
  const getGameStatus = useCallback(async () => {
    if (!state.agent) {
      throw new Error("Agent not initialized");
    }

    return await state.agent.getGameStatus(playerId, sessionId);
  }, [state.agent, playerId, sessionId]);

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
    if (!state.isInitialized && !state.isLoading && !initializationRef.current) {
      initializeAgent();
    }
  }, [initializeAgent, state.isInitialized, state.isLoading]);

  // Auto-sync game state when it changes
  useEffect(() => {
    syncState();
  }, [syncState, adventurer, bag, beast, gameId]);

  return {
    // State
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
    error: state.error,
    lastResponse: state.lastResponse,

    // Methods
    sendMessage,
    getGameStatus,
    getAdvice,
    explainMechanic,
    syncState,

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
