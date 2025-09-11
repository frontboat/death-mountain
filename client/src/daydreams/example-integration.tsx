import React from "react";
import { GameAIAssistant } from "./GameAIAssistant";
import { useDaydreamsGame } from "./useDaydreamsGame";
import { useAccount } from "@starknet-react/core";

/**
 * Example of how to integrate the Daydreams AI Assistant with your existing game
 * Add this component to your main game page or layout
 */
export const GameWithAI: React.FC = () => {
  const { address } = useAccount();

  // You can also use the hook directly for more control
  const {
    sendMessage,
    getAdvice,
    isInitialized,
    error,
  } = useDaydreamsGame({
    playerId: address || "anonymous",
    sessionId: `session-${Date.now()}`,
    autoSync: true,
  });

  const handleAskAI = async () => {
    if (!isInitialized) return;
    
    try {
      const response = await sendMessage("What's the best strategy for my current situation?");
      console.log("AI Response:", response);
    } catch (err) {
      console.error("Failed to get AI response:", err);
    }
  };

  return (
    <div className="relative">
      {/* Your existing game UI goes here */}
      <div className="game-content">
        {/* Game interface, GameDirector provider, etc. */}
      </div>

      {/* Add the AI Assistant - it will appear as a floating chat widget */}
      {address && (
        <GameAIAssistant 
          playerId={address}
          sessionId={`game-${address}`}
          className="z-50" // Ensure it appears above other UI elements
        />
      )}

      {/* Optional: Add a quick AI advice button to your existing UI */}
      <div className="fixed top-4 right-4">
        <button
          onClick={handleAskAI}
          disabled={!isInitialized}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg"
        >
          🧠 Ask AI
        </button>
        {error && (
          <div className="text-red-400 text-xs mt-1">
            AI Error: {error}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Example of integrating AI commands into your existing game buttons
 */
export const EnhancedGameControls: React.FC = () => {
  const { address } = useAccount();
  const { sendMessage, isInitialized } = useDaydreamsGame({
    playerId: address || "anonymous",
  });

  const handleSmartExplore = async () => {
    // Let AI decide the best exploration strategy
    await sendMessage("Explore the dungeon using the best strategy for my current stats and situation");
  };

  const handleSmartCombat = async () => {
    // Let AI handle combat decisions
    await sendMessage("Handle this combat encounter with the optimal strategy");
  };

  const handleSmartUpgrade = async () => {
    // Let AI decide stat upgrades
    await sendMessage("Allocate my stat points using the optimal build for my playstyle");
  };

  return (
    <div className="flex gap-2 p-4">
      <button
        onClick={handleSmartExplore}
        disabled={!isInitialized}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
      >
        🤖 Smart Explore
      </button>
      <button
        onClick={handleSmartCombat}
        disabled={!isInitialized}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
      >
        🤖 Smart Combat
      </button>
      <button
        onClick={handleSmartUpgrade}
        disabled={!isInitialized}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        🤖 Smart Upgrade
      </button>
    </div>
  );
};

export default GameWithAI;
