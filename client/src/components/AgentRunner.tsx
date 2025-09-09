import React, { useEffect, useRef, useState } from "react";
import { useAgent } from "@/contexts/AgentContext";
import { useGameStore } from "@/stores/gameStore";
import { ContextEngine } from "@/agent/contextEngine";
import { convertStoreToServiceGameState } from "@/agent/gameStateConverter";

export const AgentRunner: React.FC = () => {
  const { agent, lootSurvivorContext } = useAgent();
  const gameState = useGameStore();
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const lastActionCount = useRef<number | undefined>();

  useEffect(() => {
    const runAgent = async () => {
      if (
        !agent ||
        isAgentRunning ||
        !gameState.gameId ||
        !gameState.adventurer ||
        !lootSurvivorContext ||
        isProcessingAction
      ) {
        return;
      }

      // Only run if action count has changed
      if (gameState.adventurer.action_count === lastActionCount.current) {
        return;
      }

      setIsAgentRunning(true);
      setIsProcessingAction(true);
      lastActionCount.current = gameState.adventurer.action_count;

      try {
        // Convert the current store state to service format
        const convertedState = convertStoreToServiceGameState(gameState);
        
        if (!convertedState) {
          console.warn("Could not convert game state");
          return;
        }
        
        // Generate XML context from current state (not fresh from blockchain)
        const xmlContext = ContextEngine.generateContext(convertedState);
        console.log("Generated XML Context:", xmlContext.content);
        console.log("Game Phase:", xmlContext.phase);
        
        // Use the converted state for agent memory
        const freshState = convertedState;

        // Update context with fresh blockchain state
        const contextState = await agent.getContext({
          context: lootSurvivorContext,
          args: { gameId: gameState.gameId },
        });

        // @ts-ignore - Memory type mismatch but it works
        contextState.memory.currentGameState = freshState;

        // The send method expects this structure - use fresh state
        const result = await agent.send({
          context: lootSurvivorContext,
          args: { gameId: gameState.gameId },
          input: {
            type: "game_state_update",
            data: { 
              gameState: freshState // Pass the FRESH state from blockchain
            },
          },
        });

        console.log("Agent processing complete:", result);

        // Wait longer for blockchain transaction to fully settle
        // This prevents "Action was reverted" errors from acting too quickly
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } catch (error) {
        console.error("Error running agent:", error);
      } finally {
        setIsAgentRunning(false);
        setIsProcessingAction(false);
      }
    };

    // Delay before running to allow blockchain state to fully sync
    const timeoutId = setTimeout(runAgent, 10000);

    return () => clearTimeout(timeoutId);
  }, [
    agent,
    gameState,
    isAgentRunning,
    isProcessingAction,
    lootSurvivorContext,
  ]);

  return isAgentRunning ? (
    <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded">
      AI is thinking...
    </div>
  ) : null;
};
