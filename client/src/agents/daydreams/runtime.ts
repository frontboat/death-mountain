import type { GameSettingsData, ItemPurchase, Stats } from "@/types/game";
import type { GameEvent } from "@/utils/events";
import type { ActionOutcome, LootSurvivorRuntime, LootSurvivorState } from "./types";

export interface SystemCallsAdapter {
  ensureGame(options: {
    gameId?: number;
    settings?: GameSettingsData | null;
    name?: string;
  }): Promise<LootSurvivorState>;
  getState(gameId: number): Promise<LootSurvivorState>;
  explore(gameId: number, tillBeast: boolean): Promise<GameEvent[]>;
  attack(gameId: number, untilDeath: boolean): Promise<GameEvent[]>;
  flee(gameId: number, untilDeath: boolean): Promise<GameEvent[]>;
  equip(gameId: number, items: number[]): Promise<GameEvent[]>;
  drop(gameId: number, items: number[]): Promise<GameEvent[]>;
  buyItems(gameId: number, potions: number, items: ItemPurchase[]): Promise<GameEvent[]>;
  selectStatUpgrades(gameId: number, stats: Stats): Promise<GameEvent[]>;
}

export class SystemCallsRuntime implements LootSurvivorRuntime {
  constructor(private readonly adapter: SystemCallsAdapter) {}

  ensureGame(options: { gameId?: number; settings?: GameSettingsData | null; name?: string; }): Promise<LootSurvivorState> {
    return this.adapter.ensureGame(options);
  }

  getState(gameId: number): Promise<LootSurvivorState> {
    return this.adapter.getState(gameId);
  }

  async explore(gameId: number, options: { untilBeast?: boolean }): Promise<ActionOutcome> {
    const events = await this.adapter.explore(gameId, options.untilBeast ?? false);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }

  async attack(gameId: number, options: { untilDeath?: boolean }): Promise<ActionOutcome> {
    const events = await this.adapter.attack(gameId, options.untilDeath ?? false);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }

  async flee(gameId: number, options: { untilDeath?: boolean }): Promise<ActionOutcome> {
    const events = await this.adapter.flee(gameId, options.untilDeath ?? false);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }

  async equip(gameId: number, items: number[]): Promise<ActionOutcome> {
    const events = await this.adapter.equip(gameId, items);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }

  async drop(gameId: number, items: number[]): Promise<ActionOutcome> {
    const events = await this.adapter.drop(gameId, items);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }

  async buyItems(gameId: number, potions: number, items: ItemPurchase[]): Promise<ActionOutcome> {
    const events = await this.adapter.buyItems(gameId, potions, items);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }

  async selectStatUpgrades(gameId: number, stats: Stats): Promise<ActionOutcome> {
    const events = await this.adapter.selectStatUpgrades(gameId, stats);
    const state = await this.adapter.getState(gameId);
    return { events, state };
  }
}

export const createSystemCallsRuntime = (adapter: SystemCallsAdapter): LootSurvivorRuntime =>
  new SystemCallsRuntime(adapter);
