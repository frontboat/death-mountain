import { useMemo } from "react";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { useDynamicConnector } from "@/contexts/starknet";
import { useStarknetApi } from "@/api/starknet";
import type { GameEvent } from "@/utils/events";
import { createSystemCallsRuntime, type SystemCallsAdapter } from "./runtime";
import { mapRawStateToLootSurvivorState, type RawGameState } from "./state";
import type { LootSurvivorRuntime } from "./types";

export const useLootSurvivorRuntime = (): LootSurvivorRuntime | null => {
  const {
    executeAction,
    explore,
    attack,
    flee,
    equip,
    drop,
    buyItems,
    selectStatUpgrades,
    requestRandom,
  } = useSystemCalls();
  const gameId = useGameStore((state) => state.gameId);
  const adventurer = useGameStore((state) => state.adventurer);
  const { currentNetworkConfig } = useDynamicConnector();
  const { getGameState } = useStarknetApi();

  return useMemo(() => {
    if (!gameId) {
      return null;
    }

    const callWithEvents = async (calls: any[]): Promise<GameEvent[]> => {
      const events = await executeAction(calls, () => {});
      return (events ?? []) as GameEvent[];
    };

    const loadState = async (targetGameId: number) => {
      const raw = (await getGameState(targetGameId)) as RawGameState | null;
      if (!raw) {
        throw new Error("Unable to load Loot Survivor game state");
      }
      return mapRawStateToLootSurvivorState(targetGameId, raw);
    };

    const adapter: SystemCallsAdapter = {
      ensureGame: async ({ gameId: overrideId }) => loadState(overrideId ?? gameId),
      getState: loadState,
      explore: async (target, tillBeast) => {
        const calls = [] as any[];
        if (currentNetworkConfig.vrf) {
          calls.push(requestRandom());
        }
        calls.push(explore(target, tillBeast));
        return callWithEvents(calls);
      },
      attack: async (target, untilDeath) => {
        const calls = [] as any[];
        if (currentNetworkConfig.vrf) {
          calls.push(requestRandom());
        }
        calls.push(attack(target, untilDeath));
        return callWithEvents(calls);
      },
      flee: async (target, untilDeath) => {
        const calls = [] as any[];
        if (currentNetworkConfig.vrf) {
          calls.push(requestRandom());
        }
        calls.push(flee(target, untilDeath));
        return callWithEvents(calls);
      },
      equip: async (target, items) => {
        const calls = [] as any[];
        if (currentNetworkConfig.vrf && (adventurer?.beast_health ?? 0) > 0) {
          calls.push(requestRandom());
        }
        calls.push(equip(target, items));
        return callWithEvents(calls);
      },
      drop: async (target, items) => callWithEvents([drop(target, items)]),
      buyItems: async (target, potions, items) => callWithEvents([buyItems(target, potions, items)]),
      selectStatUpgrades: async (target, stats) => callWithEvents([selectStatUpgrades(target, stats)]),
    };

    return createSystemCallsRuntime(adapter);
  }, [
    executeAction,
    explore,
    attack,
    flee,
    equip,
    drop,
    buyItems,
    selectStatUpgrades,
    requestRandom,
    currentNetworkConfig.vrf,
    gameId,
    adventurer?.beast_health,
    getGameState,
  ]);
};
