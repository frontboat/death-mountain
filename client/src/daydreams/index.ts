// Main integration exports
export { default as createGameAgent } from "./gameIntegration";
export type { DaydreamsGameIntegration } from "./gameIntegration";
export { createGameAgent, syncGameState, useDaydreamsIntegration } from "./gameIntegration";

// Context and actions
export { default as gameContext } from "./gameContext";
export { gameActions } from "./gameActions";
export * from "./gameActions";

// React hooks and components
export { useDaydreamsGame, useGameCommands } from "./useDaydreamsGame";
export { default as GameAIAssistant } from "./GameAIAssistant";

// Re-export types for convenience
export type { GameAction, Stats, ItemPurchase } from "../types/game";
