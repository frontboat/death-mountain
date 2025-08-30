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
import { 
  calculateLevel, 
  getNewItemsEquipped,
  calculateAttackDamage,
  calculateBeastDamage,
  calculateCombatStats,
  ability_based_percentage
} from "@/utils/game";
import { ItemUtils } from "@/utils/loot";
import { potionPrice } from "@/utils/market";
import { delay } from "@/utils/utils";
import { BEAST_NAMES } from "@/constants/beast";
import { OBSTACLE_NAMES } from "@/constants/obstacle";
import { listAllEncounters } from "@/utils/processFutures";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { useAnalytics } from "@/utils/analytics";

export interface GameDirectorContext {
  executeGameAction: (action: GameAction) => void;
  actionFailed: number;
  videoQueue: string[];
  setVideoQueue: (videoQueue: string[]) => void;
  setSpectating: (spectating: boolean) => void;
  spectating: boolean;
  processEvent: (event: any, skipDelay?: boolean) => void;
  eventsProcessed: number;
  setEventQueue: (events: any) => void;
  setEventsProcessed: (eventsProcessed: number) => void;
  gameLog: any[];
  exportGameLog: () => void;
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
  level_up: 2000,
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
  const { gameStartedEvent, playerDiedEvent } = useAnalytics();

  const {
    gameId,
    adventurer,
    adventurerState,
    bag,
    beast,
    marketItemIds,
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
    incrementBeastsCollected,
    setMetadata,
  } = useGameStore();

  const [VRFEnabled, setVRFEnabled] = useState(VRF_ENABLED);
  const [spectating, setSpectating] = useState(false);
  const [actionFailed, setActionFailed] = useReducer((x) => x + 1, 0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [eventQueue, setEventQueue] = useState<any[]>([]);
  const [eventsProcessed, setEventsProcessed] = useState(0);
  const [videoQueue, setVideoQueue] = useState<string[]>([]);

  const [beastDefeated, setBeastDefeated] = useState(false);
  const [gameLog, setGameLog] = useState<any[]>([]);

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
        await processEvent(event);
        setEventQueue((prev) => prev.slice(1));
        setIsProcessing(false);
        setEventsProcessed((prev) => prev + 1);
      }
    };

    processNextEvent();
  }, [eventQueue, isProcessing]);

  useEffect(() => {
    if (beastDefeated && collectable && currentNetworkConfig.beasts) {
      incrementBeastsCollected();
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
    // Helper to enrich item with details
    const enrichItem = (item: any) => {
      if (!item || item.id === 0) return item;
      return {
        ...item,
        name: ItemUtils.getItemName(item.id),
        slot: ItemUtils.getItemSlot(item.id),
        type: ItemUtils.getItemType(item.id),
        tier: ItemUtils.getItemTier(item.id),
        greatness: calculateLevel(item.xp || 0)
      };
    };

    // Helper to enrich equipment
    const enrichEquipment = (equipment: any) => {
      if (!equipment) return equipment;
      const enriched: any = {};
      for (const [slot, item] of Object.entries(equipment)) {
        enriched[slot] = enrichItem(item);
      }
      return enriched;
    };

    // Helper to enrich market items with prices
    const enrichMarketItems = (itemIds: number[]) => {
      const charisma = adventurer?.stats?.charisma || 0;
      return itemIds.map(id => {
        const tier = ItemUtils.getItemTier(id);
        return {
          id,
          name: ItemUtils.getItemName(id),
          slot: ItemUtils.getItemSlot(id),
          type: ItemUtils.getItemType(id),
          tier: tier,
          price: ItemUtils.getItemPrice(tier, charisma)
        };
      });
    };

    // Helper to enrich beast with details
    const enrichBeast = (beast: any) => {
      if (!beast) return beast;
      return {
        ...beast,
        name: beast.name || BEAST_NAMES[beast.id],
        baseName: BEAST_NAMES[beast.id],
      };
    };

    // Helper to enrich obstacle with details
    const enrichObstacle = (obstacle: any) => {
      if (!obstacle) return obstacle;
      return {
        ...obstacle,
        name: OBSTACLE_NAMES[obstacle.id - 1], // Obstacle IDs are 1-indexed
        type: obstacle.location, // Location indicates the type of damage
      };
    };

    // Enrich event data if it contains items, beasts, or obstacles
    let enrichedEvent = { ...event };
    if (event.type === 'adventurer' && event.adventurer?.equipment) {
      enrichedEvent.adventurer = {
        ...event.adventurer,
        equipment: enrichEquipment(event.adventurer.equipment)
      };
    }
    if (event.type === 'bag' && event.bag) {
      enrichedEvent.bag = event.bag.map(enrichItem);
    }
    if (event.type === 'buy_items' && event.items_purchased) {
      enrichedEvent.items_purchased = event.items_purchased.map((purchase: any) => ({
        ...purchase,
        item: enrichItem({ id: purchase.item_id, xp: 0 })
      }));
    }
    if (event.type === 'discovery' && event.discovery?.type === 'Loot') {
      // The discovery amount is the item ID for loot discoveries
      enrichedEvent.discovery = {
        ...event.discovery,
        item: enrichItem({ id: event.discovery.amount, xp: 0 })
      };
    }
    if (event.type === 'beast' && event.beast) {
      enrichedEvent.beast = enrichBeast(event.beast);
    }
    if (event.type === 'obstacle' && event.obstacle) {
      enrichedEvent.obstacle = enrichObstacle(event.obstacle);
    }
    if (event.type === 'defeated_beast' && event.beast_id) {
      enrichedEvent.beastDetails = {
        id: event.beast_id,
        name: BEAST_NAMES[event.beast_id],
      };
    }
    if (event.type === 'fled_beast' && event.beast_id) {
      enrichedEvent.beastDetails = {
        id: event.beast_id,
        name: BEAST_NAMES[event.beast_id],
      };
    }

    // Calculate combat predictions and UI data when relevant
    const currentLevel = calculateLevel(adventurer?.xp || 0);
    const charisma = adventurer?.stats?.charisma || 0;
    
    // Calculate combat predictions if in combat
    let combatPredictions = null;
    if (beast && adventurer && adventurer.beast_health > 0) {
      const attackDamage = calculateAttackDamage(adventurer.equipment.weapon, adventurer, beast);
      
      // Calculate beast damage predictions for ALL armor slots (including empty)
      const armorSlots = ['head', 'chest', 'waist', 'hand', 'foot'] as const;
      const noArmorDamage = Math.floor(beast.level * (6 - Number(beast.tier)) * 1.5);
      const equippedArmorDamage: any[] = [];
      
      armorSlots.forEach(slot => {
        const armor = adventurer.equipment[slot as keyof typeof adventurer.equipment];
        if (armor && armor.id !== 0) {
          // Slot has armor equipped
          equippedArmorDamage.push({
            slot: slot,
            item: enrichItem(armor),
            beastDamage: calculateBeastDamage(beast, adventurer, armor)
          });
        } else {
          // Empty slot - beast does full damage
          equippedArmorDamage.push({
            slot: slot,
            item: null,
            beastDamage: noArmorDamage
          });
        }
      });
      
      // Calculate damage for each weapon in inventory with full details
      const inventoryWeaponDamage: any[] = [];
      bag?.filter(item => ItemUtils.getItemSlot(item.id) === 'Weapon').forEach(weapon => {
        const damage = calculateAttackDamage(weapon, adventurer, beast);
        inventoryWeaponDamage.push({
          item: enrichItem(weapon),
          baseDamage: damage.baseDamage,
          criticalDamage: damage.criticalDamage
        });
      });
      
      // Calculate protection for each armor piece in inventory with full details
      const inventoryArmorProtection: any[] = [];
      bag?.filter(item => ItemUtils.getItemSlot(item.id) !== 'Weapon').forEach(armor => {
        inventoryArmorProtection.push({
          item: enrichItem(armor),
          beastDamageIfEquipped: calculateBeastDamage(beast, adventurer, armor)
        });
      });
      
      combatPredictions = {
        equippedWeapon: {
          item: enrichItem(adventurer.equipment.weapon),
          baseDamage: attackDamage.baseDamage,
          criticalDamage: attackDamage.criticalDamage,
        },
        inventoryWeapons: inventoryWeaponDamage,
        equippedArmor: equippedArmorDamage,
        inventoryArmor: inventoryArmorProtection,
        fleeChance: ability_based_percentage(adventurer.xp, adventurer.stats.dexterity),
      };
    }
    
    // Calculate obstacle predictions if exploring
    let obstaclePredictions = null;
    if (adventurer && !beast) {
      obstaclePredictions = {
        dodgeChance: ability_based_percentage(adventurer.xp, adventurer.stats.intelligence),
        damageReduction: {
          magic: ability_based_percentage(adventurer.xp, adventurer.stats.intelligence),
          blade: ability_based_percentage(adventurer.xp, adventurer.stats.intelligence),
          bludgeon: ability_based_percentage(adventurer.xp, adventurer.stats.intelligence),
        }
      };
    }
    
    // Calculate future encounters if we have game seed (for deterministic games)
    let futureEncounters = null;
    if (gameSettings && gameSettings.game_seed !== 0 && adventurer) {
      try {
        const encounters = listAllEncounters(
          adventurer.xp,
          gameSettings.game_seed,
          currentLevel,
          beast !== null
        );
        // Get next 5 encounters with full details
        futureEncounters = encounters.slice(0, 5).map(enc => {
          if (enc.encounter === "Beast" && enc.id) {
            return {
              ...enc,
              name: BEAST_NAMES[Number(enc.id)],
            };
          } else if (enc.encounter === "Obstacle" && enc.id) {
            return {
              ...enc,
              name: OBSTACLE_NAMES[Number(enc.id) - 1],
            };
          }
          return enc;
        });
      } catch (e) {
        // If prediction fails, just skip it
        futureEncounters = null;
      }
    }
    
    const logEntry = {
      timestamp: Date.now(),
      actionCount: event.action_count,
      eventType: event.type,
      event: enrichedEvent,
      gameState: {
        gameId: gameId,
        adventurer: adventurer ? {
          ...adventurer,
          equipment: enrichEquipment(adventurer.equipment)
        } : null,
        beast: beast ? enrichBeast(beast) : null,
        bag: bag?.map(enrichItem) || [],
        market: {
          items: marketItemIds ? enrichMarketItems(marketItemIds) : [],
          potionPrice: potionPrice(currentLevel, charisma)
        },
        health: adventurer?.health || 0,
        gold: adventurer?.gold || 0,
        xp: adventurer?.xp || 0,
        level: currentLevel,
        statUpgradesAvailable: adventurer?.stat_upgrades_available || 0,
      },
      predictions: {
        combat: combatPredictions,
        obstacles: obstaclePredictions,
        futureEncounters: futureEncounters,
        levelUpAt: (currentLevel + 1) ** 2, // Next level XP threshold
        maxHealth: adventurer ? 100 + (adventurer.stats.vitality * 10) : 100, // Max health calculation
      },
      metadata: {
        networkName: currentNetworkConfig.name,
        spectating: spectating,
        VRFEnabled: VRFEnabled,
      }
    };
    setGameLog(prev => [...prev, logEntry]);

    if (event.type === "adventurer") {
      setAdventurer(event.adventurer!);

      if (event.adventurer!.health === 0 && !skipDelay) {
        setShowOverlay(false);
        setVideoQueue((prev) => [...prev, streamIds.death]);
        playerDiedEvent({
          adventurerId: event.adventurer!.id,
          xp: event.adventurer!.xp,
        });
      }

      if (
        !skipDelay &&
        event.adventurer!.item_specials_seed &&
        event.adventurer!.item_specials_seed !== adventurer?.item_specials_seed
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
        setShowInventory(false);
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

    if (getVideoId(event) && !skipDelay) {
      setShowOverlay(false);
      setVideoQueue((prev) => [...prev, getVideoId(event)!]);
    }

    if (delayTimes[event.type] && !skipDelay) {
      await delay(delayTimes[event.type]);
    }
  };

  const executeGameAction = async (action: GameAction) => {
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
      txs.push(
        equip(
          gameId!,
          newItemsEquipped.map((item) => item.id)
        )
      );
    } else if (action.type === "drop") {
      txs.push(drop(gameId!, action.items!));
    }

    const events = await executeAction(txs, setActionFailed);

    if (events.some((event: any) => event.type === "defeated_beast")) {
      setBeastDefeated(true);
    }

    setEventQueue((prev) => [...prev, ...events]);
  };

  const exportGameLog = () => {
    const filename = `game-${gameId}-log-${Date.now()}.json`;
    const data = JSON.stringify(gameLog, (key, value) => {
      // Handle BigInt serialization
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`Exported ${gameLog.length} events to ${filename}`);
  };

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
        gameLog,
        exportGameLog,
      }}
    >
      {children}
    </GameDirectorContext.Provider>
  );
};

export const useGameDirector = () => {
  return useContext(GameDirectorContext);
};
