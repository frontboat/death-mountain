import { GameState as StoreGameState } from "@/stores/gameStore";
import { 
  GameState as ServiceGameState, 
  GamePhase, 
  MarketItem,
  Item as ServiceItem,
  Beast as ServiceBeast 
} from "@/services/GameStateService";
import { Item as StoreItem, Beast as StoreBeast } from "@/types/game";
import { calculateLevel } from "@/utils/game";
import { ItemUtils } from "@/utils/loot";

/**
 * Converts the Zustand store GameState to the ServiceGameState format
 * that the context engine and agent expect
 */
export function convertStoreToServiceGameState(storeState: StoreGameState): ServiceGameState | null {
  if (!storeState.gameId || !storeState.adventurer) {
    return null;
  }

  // Determine current phase
  const phase = determinePhase(storeState);

  // Convert market items with prices
  const market: MarketItem[] = storeState.marketItemIds.map(id => {
    const tier = getItemTier(id);
    const charisma = storeState.adventurer?.stats?.charisma || 0;
    const basePrice = [20, 16, 12, 8, 4][tier - 1] || 4;
    const price = Math.max(1, basePrice - charisma);
    
    return {
      id,
      name: getItemName(id),
      tier,
      type: getItemType(id),
      slot: getItemSlot(id),
      price
    };
  });

  // Build the service game state
  const serviceState: ServiceGameState = {
    gameId: storeState.gameId,
    actionCount: storeState.adventurer.action_count || 0,
    phase,
    adventurer: {
      id: storeState.gameId,
      health: storeState.adventurer.health || 0,
      xp: storeState.adventurer.xp || 0,
      level: calculateLevel(storeState.adventurer.xp || 0),
      gold: storeState.adventurer.gold || 0,
      beastHealth: storeState.adventurer.beast_health || 0,
      statUpgradesAvailable: storeState.adventurer.stat_upgrades_available || 0,
      stats: {
        strength: storeState.adventurer.stats?.strength || 0,
        dexterity: storeState.adventurer.stats?.dexterity || 0,
        vitality: storeState.adventurer.stats?.vitality || 0,
        intelligence: storeState.adventurer.stats?.intelligence || 0,
        wisdom: storeState.adventurer.stats?.wisdom || 0,
        charisma: storeState.adventurer.stats?.charisma || 0,
        luck: storeState.adventurer.stats?.luck || 0
      },
      equipment: {
        weapon: convertItem(storeState.adventurer.equipment?.weapon),
        chest: convertItem(storeState.adventurer.equipment?.chest),
        head: convertItem(storeState.adventurer.equipment?.head),
        waist: convertItem(storeState.adventurer.equipment?.waist),
        foot: convertItem(storeState.adventurer.equipment?.foot),
        hand: convertItem(storeState.adventurer.equipment?.hand),
        neck: convertItem(storeState.adventurer.equipment?.neck),
        ring: convertItem(storeState.adventurer.equipment?.ring)
      }
    },
    beast: convertBeast(storeState.beast),
    bag: storeState.bag.map(convertItem).filter(item => item !== null) as ServiceItem[],
    market,
    combatPreview: storeState.combatStats ? {
      playerDamage: {
        base: storeState.combatStats.yourDamage?.baseDamage || 0,
        critical: storeState.combatStats.yourDamage?.criticalDamage || 0
      },
      beastDamage: {
        max: Math.max(
          storeState.combatStats.beastDamageToYou?.head || 0,
          storeState.combatStats.beastDamageToYou?.chest || 0,
          storeState.combatStats.beastDamageToYou?.waist || 0,
          storeState.combatStats.beastDamageToYou?.hand || 0,
          storeState.combatStats.beastDamageToYou?.foot || 0
        )
      },
      fleeChance: storeState.abilityPercentages?.fleeChance || 0,
      ambushChance: 100 - (storeState.abilityPercentages?.ambushAvoidance || 0),
      outcome: estimateCombatOutcome(storeState)
    } : undefined
  };

  return serviceState;
}

function determinePhase(state: StoreGameState): GamePhase {
  if (!state.adventurer) return 'death';
  
  // Death phase
  if (state.adventurer.health <= 0) {
    return 'death';
  }
  
  // Combat phase
  if (state.adventurer.beast_health && state.adventurer.beast_health > 0) {
    return 'combat';
  }
  
  // Level up phase
  if (state.adventurer.stat_upgrades_available && state.adventurer.stat_upgrades_available > 0) {
    return 'level_up';
  }
  
  // Default to exploration
  return 'exploration';
}

function estimateCombatOutcome(state: StoreGameState): string {
  if (!state.combatStats || !state.beast || !state.adventurer) {
    return 'Unknown';
  }

  const playerDamage = state.combatStats.yourDamage?.baseDamage || 0;
  const beastHealth = state.beast.health || 0;
  const adventurerHealth = state.adventurer.health || 0;
  
  const maxBeastDamage = Math.max(
    state.combatStats.beastDamageToYou?.head || 0,
    state.combatStats.beastDamageToYou?.chest || 0,
    state.combatStats.beastDamageToYou?.waist || 0,
    state.combatStats.beastDamageToYou?.hand || 0,
    state.combatStats.beastDamageToYou?.foot || 0
  );

  if (playerDamage <= 0) {
    return 'Lose - no damage output';
  }

  const roundsToKillBeast = Math.ceil(beastHealth / playerDamage);
  const roundsToKillAdventurer = maxBeastDamage > 0 ? Math.ceil(adventurerHealth / maxBeastDamage) : Infinity;

  if (roundsToKillBeast <= roundsToKillAdventurer) {
    const damageTaken = (roundsToKillBeast - 1) * maxBeastDamage;
    if (damageTaken === 0) {
      return `Win in ${roundsToKillBeast} round${roundsToKillBeast === 1 ? '' : 's'}, no damage`;
    }
    return `Win in ${roundsToKillBeast} round${roundsToKillBeast === 1 ? '' : 's'}, take ${damageTaken} damage`;
  }

  return `Lose in ${roundsToKillAdventurer} round${roundsToKillAdventurer === 1 ? '' : 's'}`;
}

// Helper functions to convert items
function convertItem(item: StoreItem | null | undefined): ServiceItem | null {
  if (!item || !item.id) return null;
  
  const itemWithExtras = item as any; // Type assertion for extra properties
  
  return {
    id: item.id,
    xp: item.xp || 0,
    level: calculateLevel(item.xp || 0),
    name: itemWithExtras.name || getItemName(item.id),
    tier: itemWithExtras.tier || getItemTier(item.id),
    type: itemWithExtras.type || getItemType(item.id),
    slot: itemWithExtras.slot || getItemSlot(item.id),
    prefix: itemWithExtras.prefix1,
    suffix: itemWithExtras.prefix2,
    bagSlot: itemWithExtras.bagSlot
  };
}

// Helper function to convert beast
function convertBeast(beast: StoreBeast | null | undefined): ServiceBeast | null {
  if (!beast || !beast.health) return null;
  
  return {
    id: beast.id || 0,
    health: beast.health || 0,
    level: beast.level || 1,
    seed: typeof beast.seed === 'bigint' ? beast.seed.toString() : (beast.seed || '0x0'),
    name: beast.name || 'Unknown Beast',
    tier: beast.tier || 5,
    type: beast.type || 'None',
    armorType: getArmorTypeForBeast(beast.id || 0),
    prefix: (beast as any).prefix1,
    suffix: (beast as any).prefix2
  };
}

// Item helper functions
function getItemName(id: number): string {
  return ItemUtils.getItemName(id);
}

function getItemTier(id: number): number {
  if (id <= 0) return 5;
  
  // T1 items
  if ([9, 13, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62, 67, 72, 77, 82, 87, 92, 97].includes(id)) return 1;
  
  // T2 items
  if ([10, 14, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63, 68, 73, 78, 83, 88, 93, 98, 4].includes(id)) return 2;
  
  // T3 items
  if ([11, 15, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64, 69, 74, 79, 84, 89, 94, 99, 5].includes(id)) return 3;
  
  // T4 items
  if ([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].includes(id)) return 4;
  
  // T5 items (default)
  return 5;
}

function getItemType(id: number): string {
  if (id <= 3) return 'Necklace';
  if (id >= 4 && id <= 8) return 'Ring';
  if ((id >= 9 && id <= 16) || (id >= 42 && id <= 46) || (id >= 72 && id <= 76)) {
    return getWeaponType(id);
  }
  if ((id >= 17 && id <= 41)) return 'Cloth';
  if ((id >= 47 && id <= 71)) return 'Hide';
  if ((id >= 77 && id <= 101)) return 'Metal';
  return 'None';
}

function getWeaponType(id: number): string {
  if (id >= 9 && id <= 16) return 'Magic';
  if (id >= 42 && id <= 46) return 'Blade';
  if (id >= 72 && id <= 76) return 'Bludgeon';
  return 'None';
}

function getItemSlot(id: number): string {
  if (id <= 3) return 'Neck';
  if (id >= 4 && id <= 8) return 'Ring';
  if ((id >= 9 && id <= 16) || (id >= 42 && id <= 46) || (id >= 72 && id <= 76)) return 'Weapon';
  if ((id >= 17 && id <= 21) || (id >= 47 && id <= 51) || (id >= 77 && id <= 81)) return 'Chest';
  if ((id >= 22 && id <= 26) || (id >= 52 && id <= 56) || (id >= 82 && id <= 86)) return 'Head';
  if ((id >= 27 && id <= 31) || (id >= 57 && id <= 61) || (id >= 87 && id <= 91)) return 'Waist';
  if ((id >= 32 && id <= 36) || (id >= 62 && id <= 66) || (id >= 92 && id <= 96)) return 'Foot';
  if ((id >= 37 && id <= 41) || (id >= 67 && id <= 71) || (id >= 97 && id <= 101)) return 'Hand';
  return 'None';
}

function getArmorTypeForBeast(id: number): string {
  // Beasts 1-25 are Magic type, vulnerable to Cloth armor
  if (id >= 1 && id <= 25) return 'Cloth';
  // Beasts 26-50 are Blade type, vulnerable to Hide armor
  if (id >= 26 && id <= 50) return 'Hide';
  // Beasts 51-75 are Bludgeon type, vulnerable to Metal armor
  if (id >= 51 && id <= 75) return 'Metal';
  return 'None';
}