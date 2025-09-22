import type { Adventurer, Beast, GameSettingsData, Item, ItemPurchase, Stats } from "@/types/game";
import type { GameEvent } from "@/utils/events";

export interface LootSurvivorState {
  gameId: number;
  adventurer: Adventurer;
  bag: Item[];
  beast: Beast | null;
  market: number[];
  collectable?: Beast | null;
}

export interface ActionOutcome {
  events: GameEvent[];
  state: LootSurvivorState;
}

export interface LootSurvivorRuntime {
  ensureGame(options: {
    gameId?: number;
    settings?: GameSettingsData | null;
    name?: string;
  }): Promise<LootSurvivorState>;
  getState(gameId: number): Promise<LootSurvivorState>;
  explore(gameId: number, options: { untilBeast?: boolean }): Promise<ActionOutcome>;
  attack(gameId: number, options: { untilDeath?: boolean }): Promise<ActionOutcome>;
  flee(gameId: number, options: { untilDeath?: boolean }): Promise<ActionOutcome>;
  equip(gameId: number, items: number[]): Promise<ActionOutcome>;
  drop(gameId: number, items: number[]): Promise<ActionOutcome>;
  buyItems(gameId: number, potions: number, items: ItemPurchase[]): Promise<ActionOutcome>;
  selectStatUpgrades(gameId: number, stats: Stats): Promise<ActionOutcome>;
}

export interface LootSurvivorAgentMemory {
  state: LootSurvivorState;
  history: GameEvent[];
  lastAction?: string;
  failures: number;
  autoBattle: boolean;
}

export interface LootSurvivorContextOptions {
  runtime: LootSurvivorRuntime;
}
