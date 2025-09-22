import { BEAST_NAME_PREFIXES, BEAST_NAME_SUFFIXES, BEAST_NAMES, BEAST_SPECIAL_NAME_LEVEL_UNLOCK } from "@/constants/beast";
import { MAX_BAG_SIZE } from "@/constants/game";
import type { Beast, Item } from "@/types/game";
import { getBeastName, getBeastTier, getBeastType } from "@/utils/beast";
import type { LootSurvivorState } from "./types";

interface RawBagEntry {
  id: number;
  xp: number;
}

interface RawGameState {
  adventurer: LootSurvivorState["adventurer"];
  bag: { [key: string]: RawBagEntry };
  beast?: {
    id: number;
    seed: number;
    health: number;
    level: number;
    specials: { special1: number; special2: number; special3: number };
    is_collectable: boolean;
  } | null;
  market?: number[];
}

const toBagArray = (bag?: Record<string, RawBagEntry>): Item[] => {
  if (!bag) return [];
  const items: Item[] = [];

  for (let index = 1; index <= MAX_BAG_SIZE; index += 1) {
    const key = `item_${index}`;
    const entry = bag[key];
    if (!entry || entry.id <= 0) continue;

    items.push({ id: entry.id, xp: entry.xp });
  }

  return items;
};

const toBeast = (raw?: RawGameState["beast"]): Beast | null => {
  if (!raw || raw.id === 0) {
    return null;
  }

  const specialPrefix = raw.level >= BEAST_SPECIAL_NAME_LEVEL_UNLOCK ? BEAST_NAME_PREFIXES[raw.specials.special2] ?? null : null;
  const specialSuffix = raw.level >= BEAST_SPECIAL_NAME_LEVEL_UNLOCK ? BEAST_NAME_SUFFIXES[raw.specials.special3] ?? null : null;

  return {
    id: raw.id,
    seed: BigInt(raw.seed ?? 0),
    baseName: BEAST_NAMES[raw.id],
    name: getBeastName(raw.id, raw.level, raw.specials.special2, raw.specials.special3),
    health: raw.health,
    level: raw.level,
    type: getBeastType(raw.id),
    tier: getBeastTier(raw.id),
    specialPrefix,
    specialSuffix,
    isCollectable: raw.is_collectable,
  };
};

export const mapRawStateToLootSurvivorState = (
  gameId: number,
  rawState: RawGameState,
): LootSurvivorState => {
  const beast = toBeast(rawState.beast);

  return {
    gameId,
    adventurer: rawState.adventurer,
    bag: toBagArray(rawState.bag),
    beast,
    market: rawState.market ?? [],
    collectable: beast && beast.isCollectable ? beast : null,
  };
};

export type { RawGameState };
