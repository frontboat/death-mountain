import { useStarknetApi } from "@/api/starknet";
import { useDynamicConnector } from "@/contexts/starknet";
import { useGameEvents } from "@/dojo/useGameEvents";
import { Settings } from "@/dojo/useGameSettings";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { useGameStore } from "@/stores/gameStore";
import { GameAction, Item } from "@/types/game";
import { streamIds } from "@/utils/cloudflare";
import {
  BattleEvents,
  ExplorerReplayEvents,
  GameEvent,
  getVideoId,
  processGameEvent,
} from "@/utils/events";
import { getNewItemsEquipped, incrementBeastsCollected } from "@/utils/game";
import { delay } from "@/utils/utils";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useAnalytics } from "@/utils/analytics";
import { useMarketStore } from "@/stores/marketStore";
import { useUIStore } from "@/stores/uiStore";
import { JACKPOT_BEASTS } from "@/constants/beast";
import { useSnackbar } from "notistack";
import {
  createLootSurvivorAgent,
  resolveAgentModel,
  type ActionOutcome,
  type LootSurvivorRuntime,
  type LootSurvivorState,
} from "@/agents/daydreams";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => Promise<GameEvent[]>;
  actionFailed: number;
  videoQueue: string[];
  setVideoQueue: (videoQueue: string[]) => void;
  setSpectating: (spectating: boolean) => void;
  spectating: boolean;
  processEvent: (event: any, skipDelay?: boolean) => void;
  eventsProcessed: number;
  setEventQueue: (events: any) => void;
  setEventsProcessed: (eventsProcessed: number) => void;
  setSkipCombat: (skipCombat: boolean) => void;
  skipCombat: boolean;
  setShowSkipCombat: (showSkipCombat: boolean) => void;
  showSkipCombat: boolean;
}

const GameDirectorContext = createContext<GameDirectorContext>(
  {} as GameDirectorContext
);

const VRF_ENABLED = true;

/**
 * Wait times for events in milliseconds
 */
const delayTimes: any = {
  attack: 2000,
  beast_attack: 2000,
  flee: 1000,
};

const ExplorerLogEvents = [
  "discovery",
  "obstacle",
  "defeated_beast",
  "fled_beast",
  "stat_upgrade",
  "buy_items",
];

export const GameDirector = ({ children }: PropsWithChildren) => {
  const { currentNetworkConfig } = useDynamicConnector();
  const {
    startGame,
    executeAction,
    requestRandom,
    explore,
    attack,
    flee,
    buyItems,
    selectStatUpgrades,
    equip,
    drop,
    claimBeast,
  } = useSystemCalls();
  const { getSettingsDetails, getTokenMetadata, getGameState } =
    useStarknetApi();
  const { getGameEvents } = useGameEvents();
  const { gameStartedEvent } = useAnalytics();

  const {
    gameId,
    adventurer,
    adventurerState,
    collectable,
    setAdventurer,
    setBag,
    setBeast,
    setExploreLog,
    setBattleEvent,
    newInventoryItems,
    setMarketItemIds,
    setNewMarket,
    setNewInventoryItems,
    metadata,
    gameSettings,
    setGameSettings,
    setShowInventory,
    setShowOverlay,
    setCollectable,
    setMetadata,
    setClaimInProgress,
    autoPlayEnabled,
    setAutoPlayEnabled,
    agentRunning,
    setAgentRunning,
  } = useGameStore();
  const { setIsOpen } = useMarketStore();
  const { skipAllAnimations, skipIntroOutro } = useUIStore();
  const { enqueueSnackbar } = useSnackbar();

  const [VRFEnabled, setVRFEnabled] = useState(VRF_ENABLED);
  const [spectating, setSpectating] = useState(false);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [eventsProcessed, setEventsProcessed] = useState(0);
  const [videoQueue, setVideoQueue] = useState<string[]>([]);

  const [skipCombat, setSkipCombat] = useState(false);
  const [showSkipCombat, setShowSkipCombat] = useState(false);
  const [beastDefeated, setBeastDefeated] = useState(false);
  const eventsProcessedRef = useRef(eventsProcessed);
  const agentAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    eventsProcessedRef.current = eventsProcessed;
  }, [eventsProcessed]);

  useEffect(() => {
    if (gameId && !metadata) {
      getTokenMetadata(gameId).then((metadata) => {
        setMetadata(metadata);
      });
    }
  }, [gameId, metadata]);

  useEffect(() => {
    if (gameId && metadata && !gameSettings) {
      getSettingsDetails(metadata.settings_id).then((settings) => {
        setGameSettings(settings);
        setVRFEnabled(currentNetworkConfig.vrf && settings.game_seed === 0);
        initializeGame(settings, currentNetworkConfig.name);
      });
    }
  }, [metadata, gameId]);

  useEffect(() => {
    if (!gameSettings || !adventurer || VRFEnabled) return;

    if (
      currentNetworkConfig.vrf &&
      gameSettings.game_seed_until_xp !== 0 &&
      adventurer.xp >= gameSettings.game_seed_until_xp
    ) {
      setVRFEnabled(true);
    }
  }, [gameSettings, adventurer]);

  useEffect(() => {
    const processNextEvent = async () => {
      if (eventQueue.length > 0 && !isProcessing) {
        setIsProcessing(true);
        const event = eventQueue[0];
        await processEvent(event, skipCombat);
        setEventQueue((prev) => prev.slice(1));
        setIsProcessing(false);
        setEventsProcessed((prev) => prev + 1);
      }
    };

    processNextEvent();
  }, [eventQueue, isProcessing]);

  useEffect(() => {
    if (beastDefeated && collectable && currentNetworkConfig.beasts) {
      incrementBeastsCollected(gameId!);
      setClaimInProgress(true);
      claimBeast(gameId!, collectable);
    }
  }, [beastDefeated]);

  const initializeGame = async (settings: Settings, mode: string) => {
    if (spectating) return;

    const gameState = await getGameState(gameId!);

    if (gameState) {
      restoreGameState(gameState);
    } else {
      executeGameAction({ type: "start_game", gameId: gameId!, settings });
      gameStartedEvent({
        adventurerId: gameId!,
        dungeon: mode,
        settingsId: settings.settings_id,
      });
    }
  };

  const restoreGameState = async (gameState: any) => {
    const gameEvents = await getGameEvents(gameId!);

    gameEvents.forEach((event: GameEvent) => {
      if (ExplorerLogEvents.includes(event.type)) {
        setExploreLog(event);
      }
    });

    setAdventurer(gameState.adventurer);
    setBag(
      Object.values(gameState.bag).filter(
        (item: any) => typeof item === "object" && item.id !== 0
      ) as Item[]
    );
    setMarketItemIds(gameState.market);

    if (gameState.adventurer.beast_health > 0) {
      let beast = processGameEvent({
        action_count: 0,
        details: { beast: gameState.beast },
      }).beast!;
      setBeast(beast);
      setCollectable(beast.isCollectable ? beast : null);
    }

    if (gameState.adventurer.stat_upgrades_available > 0) {
      setShowInventory(true);
    }
  };

  const processEvent = async (event: any, skipDelay: boolean = false) => {
    if (event.type === "adventurer") {
      setAdventurer(event.adventurer!);
      setSkipCombat(false);
      setShowSkipCombat(false);

      if (event.adventurer!.health === 0 && !skipDelay && !skipIntroOutro) {
        setShowOverlay(false);
        setVideoQueue((prev) => [...prev, streamIds.death]);
      }

      if (
        !skipDelay &&
        event.adventurer!.item_specials_seed &&
        event.adventurer!.item_specials_seed !== adventurer?.item_specials_seed &&
        !skipAllAnimations
      ) {
        setShowOverlay(false);
        setVideoQueue((prev) => [...prev, streamIds.specials_unlocked]);
        setShowInventory(true);
      }

      if (event.adventurer!.stat_upgrades_available > 0) {
        setShowInventory(true);
      }

      if (
        event.adventurer!.stat_upgrades_available === 0 &&
        adventurer?.stat_upgrades_available! > 0
      ) {
        setIsOpen(true);
      }
    }

    if (event.type === "bag") {
      setBag(
        event.bag!.filter(
          (item: any) => typeof item === "object" && item.id !== 0
        )
      );
    }

    if (event.type === "beast") {
      setBeast(event.beast!);
      setBeastDefeated(false);
      setCollectable(event.beast!.isCollectable ? event.beast! : null);
    }

    if (event.type === "market_items") {
      setMarketItemIds(event.items!);
      setNewMarket(true);
    }

    if (!spectating && ExplorerLogEvents.includes(event.type)) {
      if (event.type === "discovery") {
        if (event.discovery?.type === "Loot") {
          setNewInventoryItems([...newInventoryItems, event.discovery.amount!]);
        }
      }

      setExploreLog(event);
    }

    if (spectating && ExplorerReplayEvents.includes(event.type)) {
      setExploreLog(event);
    }

    if (BattleEvents.includes(event.type)) {
      setBattleEvent(event);
    }

    if (getVideoId(event) && !skipDelay && !skipAllAnimations) {
      setShowOverlay(false);
      setVideoQueue((prev) => [...prev, getVideoId(event)!]);
    }

    // Jackpot video
    if (event.type === "beast" && event.beast!.isCollectable && JACKPOT_BEASTS.includes(event.beast!.name!)) {
      setShowOverlay(false);
      setVideoQueue((prev) => [...prev, streamIds[`jackpot_${event.beast!.baseName!.toLowerCase()}` as keyof typeof streamIds]]);
    }

    if (delayTimes[event.type] && !skipDelay) {
      await delay(delayTimes[event.type]);
    }
  };

  const executeGameAction = useCallback(async (action: GameAction): Promise<GameEvent[]> => {
    let txs: any[] = [];

    if (action.type === "start_game") {
      if (
        action.settings.game_seed === 0 &&
        action.settings.adventurer.xp !== 0
      ) {
        txs.push(requestRandom());
      }
      txs.push(startGame(action.gameId!));
    }

    if (VRFEnabled && ["explore", "attack", "flee"].includes(action.type)) {
      txs.push(requestRandom());
    }

    if (
      VRFEnabled &&
      action.type === "equip" &&
      adventurer?.beast_health! > 0
    ) {
      txs.push(requestRandom());
    }

    let newItemsEquipped = getNewItemsEquipped(
      adventurer?.equipment!,
      adventurerState?.equipment!
    );
    if (action.type !== "equip" && newItemsEquipped.length > 0) {
      txs.push(
        equip(
          gameId!,
          newItemsEquipped.map((item) => item.id)
        )
      );
    }

    const manualEquipItems =
      action.type === "equip"
        ? action.items && action.items.length > 0
          ? action.items
          : newItemsEquipped.map((item) => item.id)
        : [];

    if (action.type === "explore") {
      txs.push(explore(gameId!, action.untilBeast!));
    } else if (action.type === "attack") {
      txs.push(attack(gameId!, action.untilDeath!));
    } else if (action.type === "flee") {
      txs.push(flee(gameId!, action.untilDeath!));
    } else if (action.type === "buy_items") {
      txs.push(buyItems(gameId!, action.potions!, action.itemPurchases!));
    } else if (action.type === "select_stat_upgrades") {
      txs.push(selectStatUpgrades(gameId!, action.statUpgrades!));
    } else if (action.type === "equip") {
      const itemsToEquip = manualEquipItems.filter((id) => typeof id === "number" && id > 0);
      if (itemsToEquip.length > 0) {
        txs.push(equip(gameId!, itemsToEquip));
      }
    } else if (action.type === "drop") {
      txs.push(drop(gameId!, action.items!));
    }

    const events = await executeAction(txs, setActionFailed);
    const normalizedEvents = Array.isArray(events) ? events : [];

    if (normalizedEvents.some((event: any) => event.type === "defeated_beast")) {
      setBeastDefeated(true);
    }

    if (normalizedEvents.filter((event: any) => event.type === "beast_attack").length >= 2) {
      setShowSkipCombat(true);
    }

    setEventQueue((prev) => [...prev, ...normalizedEvents]);

    return normalizedEvents as GameEvent[];
  }, [
    VRFEnabled,
    startGame,
    requestRandom,
    adventurer,
    adventurerState,
    gameId,
    explore,
    attack,
    flee,
    buyItems,
    selectStatUpgrades,
    equip,
    drop,
    executeAction,
    setBeastDefeated,
    setShowSkipCombat,
    setActionFailed,
  ]);

  const getLootSurvivorState = useCallback((): LootSurvivorState => {
    const state = useGameStore.getState();

    if (!state.gameId || !state.adventurer) {
      throw new Error("Loot Survivor game state is unavailable");
    }

    return {
      gameId: state.gameId,
      adventurer: state.adventurer,
      bag: state.bag,
      beast: state.beast,
      market: state.marketItemIds,
      collectable: state.collectable,
    };
  }, []);

  const waitForCondition = useCallback(
    (check: () => boolean, signal: AbortSignal, timeoutMs = 30000) =>
      new Promise<void>((resolve, reject) => {
        const start = performance.now();

        const tick = () => {
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }

          if (check()) {
            resolve();
            return;
          }

          if (performance.now() - start > timeoutMs) {
            reject(new Error("Timed out waiting for agent action to settle"));
            return;
          }

          requestAnimationFrame(tick);
        };

        tick();
      }),
    [],
  );

  const hasAdventurer = Boolean(adventurer);

  useEffect(() => {
    if (!autoPlayEnabled) {
      if (agentAbortRef.current) {
        agentAbortRef.current.abort();
        agentAbortRef.current = null;
      }

      if (agentRunning) {
        setAgentRunning(false);
      }

      return;
    }

    if (spectating || !gameId || !hasAdventurer || !gameSettings) {
      setAutoPlayEnabled(false);
      return;
    }

    let cancelled = false;
    let agentInstance: ReturnType<typeof createLootSurvivorAgent> | null = null;
    let localAbortController: AbortController | null = null;

    const startAutoPlay = async () => {
      const { model, modelSettings } = await resolveAgentModel();

      if (cancelled) {
        return;
      }

      if (!model) {
        enqueueSnackbar(
          "Configure a Daydreams agent model before enabling Auto Play.",
          { variant: "warning" },
        );
        setAutoPlayEnabled(false);
        return;
      }

      const abortController = new AbortController();
      localAbortController = abortController;
      agentAbortRef.current = abortController;
      setAgentRunning(true);

      const performDirectorAction = async (action: GameAction): Promise<ActionOutcome> => {
        const previousActionCount = useGameStore.getState().adventurer?.action_count ?? 0;
        const startProcessed = eventsProcessedRef.current;
        const events = await executeGameAction(action);
        const eventTarget = startProcessed + events.length;

        await waitForCondition(() => {
          if (abortController.signal.aborted) {
            return true;
          }

          const current = useGameStore.getState();
          const actionCountAdvanced =
            (current.adventurer?.action_count ?? previousActionCount) > previousActionCount;
          const eventsSettled = eventsProcessedRef.current >= eventTarget;

          return actionCountAdvanced && eventsSettled;
        }, abortController.signal, 45000);

        return {
          events,
          state: getLootSurvivorState(),
        };
      };

      const runtime: LootSurvivorRuntime = {
        ensureGame: async () => getLootSurvivorState(),
        getState: async () => getLootSurvivorState(),
        explore: async (_gameId, options) =>
          performDirectorAction({ type: "explore", untilBeast: options.untilBeast ?? false }),
        attack: async (_gameId, options) =>
          performDirectorAction({ type: "attack", untilDeath: options.untilDeath ?? false }),
        flee: async (_gameId, options) =>
          performDirectorAction({ type: "flee", untilDeath: options.untilDeath ?? false }),
        equip: async (_gameId, items) => performDirectorAction({ type: "equip", items }),
        drop: async (_gameId, items) => performDirectorAction({ type: "drop", items }),
        buyItems: async (_gameId, potions, items) =>
          performDirectorAction({ type: "buy_items", potions, itemPurchases: items }),
        selectStatUpgrades: async (_gameId, stats) =>
          performDirectorAction({ type: "select_stat_upgrades", statUpgrades: stats }),
      };

      try {
        agentInstance = createLootSurvivorAgent({
          runtime,
          model,
          modelSettings,
        });

        await agentInstance.start();

        const sessionContext = agentInstance.registry.contexts.get("loot-survivor-session");

        if (!sessionContext) {
          throw new Error("Loot Survivor session context is not available");
        }

        await agentInstance.run({
          context: sessionContext,
          args: {
            gameId,
            autoBattle: true,
            settings: gameSettings,
          },
          abortSignal: abortController.signal,
        });
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Auto play agent error", error);
          enqueueSnackbar("Auto play stopped due to an error.", { variant: "error" });
        }
      } finally {
        if (agentInstance) {
          await agentInstance.stop().catch(() => undefined);
        }

        setAgentRunning(false);
        setAutoPlayEnabled(false);
        agentAbortRef.current = null;
      }
    };
    startAutoPlay();

    return () => {
      cancelled = true;
      if (localAbortController) {
        localAbortController.abort();
      }
      agentAbortRef.current = null;
    };
  }, [
    autoPlayEnabled,
    enqueueSnackbar,
    executeGameAction,
    gameId,
    gameSettings,
    getLootSurvivorState,
    hasAdventurer,
    setAgentRunning,
    setAutoPlayEnabled,
    spectating,
    waitForCondition,
  ]);

  return (
    <GameDirectorContext.Provider
      value={{
        executeGameAction,
        actionFailed,
        videoQueue,
        setVideoQueue,
        eventsProcessed,
        setEventsProcessed,
        processEvent,
        setEventQueue,
        setSpectating,
        spectating,
        setSkipCombat,
        skipCombat,
        setShowSkipCombat,
        showSkipCombat,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};
