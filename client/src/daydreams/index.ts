// Main integration exports
export { createGameAgent, syncGameState, useDaydreamsIntegration } from "./gameIntegration";
export type { DaydreamsGameIntegration } from "./gameIntegration";

// Contexts - the new modular architecture
export { gameContext } from "./contexts/gameContext";
export { explorationContext } from "./contexts/explorationContext";
export { combatContext } from "./contexts/combatContext";
export { levelUpContext } from "./contexts/levelUpContext";

// Episode hooks and analytics
export { gameEpisodeHooks, analyzeGameHistory } from "./episodeHooks";

// React hooks and components
export { useDaydreamsGame, useGameCommands } from "./useDaydreamsGame";
export { default as GameAIAssistant } from "./GameAIAssistant";

// Re-export types for convenience
export type { GameAction, Stats, ItemPurchase } from "../types/game";
