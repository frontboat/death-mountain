import React, { useEffect, useRef, useState } from "react";
import { useAgent } from "@/contexts/AgentContext";
import { useGameStore } from "@/stores/gameStore";
import { GameState } from "@/stores/gameStore";

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
        // Update context with current game state
        const contextState = await agent.getContext({
          context: lootSurvivorContext,
          args: { gameId: gameState.gameId },
        });

        contextState.memory.currentGameState = gameState;

        // The send method expects this structure
        const result = await agent.send({
          context: lootSurvivorContext,
          args: { gameId: gameState.gameId },
          input: {
            type: "game_state_update",
            data: { gameState: gameState }, // This matches your schema
          },
        });

        console.log("Agent processing complete:", result);

        // Wait for UI to update before allowing next action
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Error running agent:", error);
      } finally {
        setIsAgentRunning(false);
        setIsProcessingAction(false);
      }
    };

    // Delay before running to allow UI updates
    const timeoutId = setTimeout(runAgent, 2000);

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
