import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { GameStateService } from "@/services/GameStateService";
import { SimpleAgent } from "@/agent/simpleAgent";
import { useSystemCalls } from "@/dojo/useSystemCalls";

export const SimpleAgentRunner: React.FC = () => {
  const gameState = useGameStore();
  const systemCalls = useSystemCalls();
  const [isRunning, setIsRunning] = useState(false);
  const agentRef = useRef<SimpleAgent | null>(null);
  const lastActionCount = useRef<number | undefined>();

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new SimpleAgent(systemCalls);
    }
  }, [systemCalls]);

  // Run agent when game state changes
  useEffect(() => {
    const runAgent = async () => {
      if (
        !agentRef.current ||
        isRunning ||
        !gameState.gameId ||
        !gameState.adventurer
      ) {
        return;
      }

      // Only run if action count has changed
      if (gameState.adventurer.action_count === lastActionCount.current) {
        return;
      }

      setIsRunning(true);
      lastActionCount.current = gameState.adventurer.action_count;

      try {
        // Fetch fresh state from blockchain
        const freshState = await GameStateService.getFreshGameState(gameState.gameId);
        console.log("[SimpleAgentRunner] Fresh state phase:", freshState.phase);
        
        // Process with simple agent
        await agentRef.current.processGameState(freshState);
        
        // Wait for blockchain to settle
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error("[SimpleAgentRunner] Error:", error);
      } finally {
        setIsRunning(false);
      }
    };

    // Delay before running to allow state to settle
    const timeoutId = setTimeout(runAgent, 3000);
    return () => clearTimeout(timeoutId);

  }, [
    gameState.gameId,
    gameState.adventurer,
    isRunning
  ]);

  return isRunning ? (
    <div className="fixed top-4 right-4 bg-black/80 text-white px-4 py-2 rounded">
      AI Agent is thinking...
    </div>
  ) : null;
};