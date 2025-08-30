/**
 * Complete schema for game log entries captured by GameDirector
 */

export interface GameLogEntry {
  timestamp: number;
  actionCount: number;
  eventType: string;
  
  // The enriched event with all IDs resolved to full details
  event: EnrichedGameEvent;
  
  // Complete game state at this moment
  gameState: GameStateSnapshot;
  
  // Predictions and calculations shown in UI
  predictions: GamePredictions;
  
  // Metadata about the game session
  metadata: GameMetadata;
}

export interface EnrichedGameEvent {
  type: string;
  action_count: number;
  
  // Adventurer with enriched equipment
  adventurer?: {
    health: number;
    xp: number;
    gold: number;
    beast_health: number;
    stat_upgrades_available: number;
    stats: Stats;
    equipment: EnrichedEquipment;
    item_specials_seed: number;
    action_count: number;
  };
  
  // Beast with full details
  beast?: EnrichedBeast;
  
  // Obstacle with name
  obstacle?: EnrichedObstacle;
  
  // Bag items with full details
  bag?: EnrichedItem[];
  
  // Discovery with item details if loot
  discovery?: {
    type: 'Gold' | 'Health' | 'Loot';
    amount: number;
    item?: EnrichedItem; // Present if type is 'Loot'
  };
  
  // Market items that appeared (for market_items event)
  items?: number[];
  
  // Items purchased with details
  items_purchased?: Array<{
    item_id: number;
    equip: boolean;
    item: EnrichedItem;
  }>;
  
  // Combat events
  attack?: {
    damage: number;
    location: string;
    critical_hit: boolean;
    success?: boolean;
  };
  
  // Beast defeat/flee with details
  beast_id?: number;
  beastDetails?: {
    id: number;
    name: string;
  };
  
  // Rewards
  xp_reward?: number;
  gold_reward?: number;
  
  // Stats upgraded
  stats?: Stats;
  
  // Other event-specific fields
  potions?: number;
  level?: number;
  success?: boolean;
  market_seed?: bigint;
}

export interface EnrichedItem {
  id: number;
  xp: number;
  name: string;
  slot: string;
  type: string;
  tier: number;
  greatness: number;
}

export interface EnrichedBeast {
  id: number;
  seed: bigint | string;
  name: string;
  baseName: string;
  health: number;
  level: number;
  type: string;
  tier: number;
  specialPrefix: string | null;
  specialSuffix: string | null;
  isCollectable: boolean;
}

export interface EnrichedObstacle {
  id: number;
  name: string;
  type: string;
  damage: number;
  location: string;
  critical_hit: boolean;
  dodged: boolean;
}

export interface EnrichedEquipment {
  weapon: EnrichedItem | { id: 0; xp: 0 };
  chest: EnrichedItem | { id: 0; xp: 0 };
  head: EnrichedItem | { id: 0; xp: 0 };
  waist: EnrichedItem | { id: 0; xp: 0 };
  foot: EnrichedItem | { id: 0; xp: 0 };
  hand: EnrichedItem | { id: 0; xp: 0 };
  neck: EnrichedItem | { id: 0; xp: 0 };
  ring: EnrichedItem | { id: 0; xp: 0 };
}

export interface GameStateSnapshot {
  gameId: number | null;
  
  // Adventurer with enriched equipment
  adventurer: {
    health: number;
    xp: number;
    gold: number;
    beast_health: number;
    stat_upgrades_available: number;
    stats: Stats;
    equipment: EnrichedEquipment;
    item_specials_seed: number;
    action_count: number;
  } | null;
  
  // Current beast with full details
  beast: EnrichedBeast | null;
  
  // Inventory items with full details
  bag: EnrichedItem[];
  
  // Market state
  market: {
    items: MarketItem[];
    potionPrice: number;
  };
  
  // Quick access values
  health: number;
  gold: number;
  xp: number;
  level: number;
  statUpgradesAvailable: number;
}

export interface MarketItem {
  id: number;
  name: string;
  slot: string;
  type: string;
  tier: number;
  price: number;
}

export interface GamePredictions {
  // Combat predictions (only present during combat)
  combat: CombatPredictions | null;
  
  // Obstacle predictions (only present when exploring)
  obstacles: ObstaclePredictions | null;
  
  // Future encounters (only for deterministic games)
  futureEncounters: FutureEncounter[] | null;
  
  // Level progression
  levelUpAt: number;
  
  // Max possible health
  maxHealth: number;
}

export interface CombatPredictions {
  equippedWeapon: {
    item: EnrichedItem;
    baseDamage: number;
    criticalDamage: number;
  };
  
  inventoryWeapons: Array<{
    item: EnrichedItem;
    baseDamage: number;
    criticalDamage: number;
  }>;
  
  equippedArmor: Array<{
    slot: string;
    item: EnrichedItem | null;
    beastDamage: number;
  }>;
  
  inventoryArmor: Array<{
    item: EnrichedItem;
    beastDamageIfEquipped: number;
  }>;
  
  fleeChance: number;
}

export interface ObstaclePredictions {
  dodgeChance: number;
  damageReduction: {
    magic: number;
    blade: number;
    bludgeon: number;
  };
}

export interface FutureEncounter {
  encounter: 'Beast' | 'Obstacle' | 'Discovery';
  id?: number;
  name?: string;
  type: string;
  tier: number | string;
  level?: number;
  health?: number;
  power?: number;
  nextXp: number;
  xp: number;
  adventurerLevel?: number;
}

export interface GameMetadata {
  networkName: string;
  spectating: boolean;
  VRFEnabled: boolean;
}

export interface Stats {
  strength: number;
  dexterity: number;
  vitality: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  luck: number;
}