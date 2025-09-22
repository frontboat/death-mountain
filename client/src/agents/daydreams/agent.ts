import { action, context, createDreams, type Agent } from "@daydreamsai/core";
import { MAX_STAT_VALUE } from "@/constants/game";
import type { ItemPurchase, Stats } from "@/types/game";
import type { GameEvent } from "@/utils/events";
import { ItemUtils } from "@/utils/loot";
import * as z from "zod";
import type {
  ActionOutcome,
  LootSurvivorAgentMemory,
  LootSurvivorContextOptions,
  LootSurvivorRuntime,
  LootSurvivorState,
} from "./types";

const MAX_MEMORY_EVENTS = 100;

const statsInputSchema = z
  .object({
    strength: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
    dexterity: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
    vitality: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
    intelligence: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
    wisdom: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
    charisma: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
    luck: z.number().int().min(0).max(MAX_STAT_VALUE).optional(),
  })
  .partial();

const purchaseSchema = z.object({
  itemId: z.number().int().nonnegative(),
  equip: z.boolean().default(false),
});

const turnSchema = z.object({
  decision: z
    .enum([
      "explore",
      "attack",
      "flee",
      "equip",
      "drop",
      "buy_items",
      "select_stats",
      "wait",
    ])
    .describe("High level action the agent should execute this turn."),
  untilBeast: z
    .boolean()
    .optional()
    .describe("Whether explore should continue until a beast is encountered."),
  untilDeath: z
    .boolean()
    .optional()
    .describe("Whether combat or flee actions should continue until the outcome is resolved."),
  potions: z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional()
    .describe("Number of health potions to purchase."),
  equipItems: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe("Item IDs from the bag to equip."),
  dropItems: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe("Item IDs that should be dropped from inventory."),
  purchases: z
    .array(purchaseSchema)
    .optional()
    .describe("Items that should be purchased from the market."),
  statUpgrades: statsInputSchema.optional(),
});

const contextArgsSchema = z.object({
  gameId: z.number().optional(),
  autoBattle: z.boolean().default(true),
  adventurerName: z.string().optional(),
  settings: z.any().optional(),
});

const normalizeStats = (input?: Partial<Stats>): Stats => ({
  strength: input?.strength ?? 0,
  dexterity: input?.dexterity ?? 0,
  vitality: input?.vitality ?? 0,
  intelligence: input?.intelligence ?? 0,
  wisdom: input?.wisdom ?? 0,
  charisma: input?.charisma ?? 0,
  luck: input?.luck ?? 0,
});

const limitEventHistory = (memory: LootSurvivorAgentMemory, events: GameEvent[]) => {
  const combined = [...memory.history, ...events];
  if (combined.length <= MAX_MEMORY_EVENTS) {
    memory.history = combined;
    return;
  }

  memory.history = combined.slice(combined.length - MAX_MEMORY_EVENTS);
};

const describeBeast = (beast: LootSurvivorState["beast"]): string => {
  if (!beast) {
    return "Unknown beast";
  }

  return `${beast.name} (tier ${beast.tier}, type ${beast.type})`;
};

const describeItem = (itemId: number): string => {
  if (!itemId || itemId <= 0) {
    return `Empty(${itemId})`;
  }

  const slot = ItemUtils.getItemSlot(itemId);
  const type = ItemUtils.getItemType(itemId);
  return `${slot} item #${itemId} (${type})`;
};

const summarizeEvent = (event: GameEvent): string => {
  switch (event.type) {
    case "adventurer":
      return `Adventurer update → HP: ${event.adventurer?.health ?? "?"}, Gold: ${event.adventurer?.gold ?? "?"}, XP: ${event.adventurer?.xp ?? "?"}`;
    case "beast":
      return event.beast
        ? `Encountered ${describeBeast(event.beast)} (HP ${event.beast.health}, L${event.beast.level})`
        : "Encountered a beast";
    case "defeated_beast":
      return `Defeated beast ${event.beast_id ?? "?"} gaining ${event.xp_reward ?? 0} XP and ${event.gold_reward ?? 0} gold.`;
    case "fled_beast":
      return `Fled from beast ${event.beast_id ?? "?"} and gained ${event.xp_reward ?? 0} XP.`;
    case "discovery":
      return event.discovery
        ? `Found ${event.discovery.amount} ${event.discovery.type}.`
        : "Made a discovery.";
    case "obstacle":
      return event.obstacle
        ? `Obstacle ${event.obstacle.id} dealt ${event.obstacle.damage} damage (dodged=${event.obstacle.dodged}).`
        : "Hit an obstacle.";
    case "equip":
      return event.items && event.items.length > 0
        ? `Equipped items: ${event.items.map((id) => describeItem(id)).join(", ")}.`
        : "Attempted to equip but no items were equipped.";
    case "drop":
      return event.items && event.items.length > 0
        ? `Dropped items: ${event.items.join(", ")}.`
        : "Attempted to drop items but none were removed.";
    case "buy_items":
      return `Purchased ${event.potions ?? 0} potions and ${event.items_purchased?.length ?? 0} items.`;
    case "stat_upgrade":
      return `Allocated stat upgrades: ${JSON.stringify(event.stats ?? {})}.`;
    case "level_up":
      return `Leveled up to level ${event.level ?? "?"}.`;
    case "attack":
      return `Adventurer dealt ${event.attack?.damage ?? 0} damage (critical=${event.attack?.critical_hit ?? false}).`;
    case "beast_attack":
      return `Beast attacked for ${event.attack?.damage ?? 0} damage.`;
    case "flee":
      return `Executed flee attempt (success=${event.success ?? false}).`;
    default:
      return `${event.type} event occurred.`;
  }
};

const applyOutcome = (memory: LootSurvivorAgentMemory, outcome: ActionOutcome, label: string) => {
  memory.state = outcome.state;
  limitEventHistory(memory, outcome.events);
  memory.lastAction = label;
  memory.failures = 0;

  return {
    action: label,
    events: outcome.events.map(summarizeEvent),
    adventurer: outcome.state.adventurer,
    beast: outcome.state.beast,
  };
};

const createSessionContext = (runtime: LootSurvivorRuntime) =>
  context<LootSurvivorAgentMemory, typeof contextArgsSchema, LootSurvivorContextOptions & { initialState: LootSurvivorState }>(
    {
      type: "loot-survivor-session",
      schema: contextArgsSchema,
      setup: async (args) => {
        const state = await runtime.ensureGame({
          gameId: args.gameId,
          settings: (args.settings as any) ?? null,
          name: args.adventurerName,
        });

        return {
          runtime,
          initialState: state,
        } satisfies LootSurvivorContextOptions & { initialState: LootSurvivorState };
      },
      create: async ({ args, options }) => ({
        state: options.initialState,
        history: [],
        lastAction: undefined,
        failures: 0,
        autoBattle: args.autoBattle ?? true,
      }),
      instructions: (state) => {
        const { adventurer, beast } = state.memory.state;
        const beastLine = beast
          ? `${describeBeast(beast)} — HP ${beast.health}, level ${beast.level}`
          : "No active beast encounter.";

        return [
          "You are an autonomous strategist for Loot Survivor.",
          `Adventurer HP ${adventurer.health}/${adventurer.beast_health}, Gold ${adventurer.gold}, XP ${adventurer.xp}.`,
          beastLine,
          "Use the take_turn action to choose and execute the next best move.",
          "Reason about stats, health, bag contents, and battle context before acting.",
        ].join("\n");
      },
      shouldContinue: (state) => state.memory.state.adventurer.health > 0 && state.memory.failures < 3,
      description:
        "Coordinates Loot Survivor gameplay by selecting contract actions and adjusting strategy based on on-chain state.",
    }
  );

const createTurnAction = (
  sessionContext: ReturnType<typeof createSessionContext>,
) =>
  action({
    name: "take_turn",
    description:
      "Execute one full game turn by calling the appropriate Loot Survivor system operation.",
    schema: turnSchema,
    context: sessionContext,
    handler: async (args, ctx) => {
      const { runtime: runtimeOptions } = ctx.options;
      const gameId = ctx.memory.state.gameId;
      const normalizedStats = normalizeStats(args.statUpgrades as Partial<Stats> | undefined);
      const defaultedPurchases: ItemPurchase[] = (args.purchases ?? []).map((purchase) => ({
        item_id: purchase.itemId,
        equip: purchase.equip ?? false,
      }));

      try {
        let outcome: ActionOutcome | undefined;
        switch (args.decision) {
          case "explore": {
            if (typeof args.untilBeast === "boolean") {
              ctx.memory.autoBattle = args.untilBeast;
            }
            outcome = await runtimeOptions.explore(gameId, {
              untilBeast: args.untilBeast ?? ctx.memory.autoBattle,
            });
            break;
          }
          case "attack": {
            outcome = await runtimeOptions.attack(gameId, {
              untilDeath: args.untilDeath ?? false,
            });
            break;
          }
          case "flee": {
            outcome = await runtimeOptions.flee(gameId, {
              untilDeath: args.untilDeath ?? false,
            });
            break;
          }
          case "equip": {
            outcome = await runtimeOptions.equip(gameId, args.equipItems ?? []);
            break;
          }
          case "drop": {
            outcome = await runtimeOptions.drop(gameId, args.dropItems ?? []);
            break;
          }
          case "buy_items": {
            outcome = await runtimeOptions.buyItems(gameId, args.potions ?? 0, defaultedPurchases);
            break;
          }
          case "select_stats": {
            outcome = await runtimeOptions.selectStatUpgrades(gameId, normalizedStats);
            break;
          }
          case "wait":
            return {
              action: "wait",
              reason: "No operation executed this turn.",
              state: ctx.memory.state,
            };
          default:
            throw new Error(`Unsupported decision: ${args.decision}`);
        }

        if (!outcome) {
          throw new Error("Action did not produce any outcome");
        }

        return applyOutcome(ctx.memory, outcome, args.decision);
      } catch (error: unknown) {
        ctx.memory.failures += 1;
        return {
          action: args.decision,
          error: error instanceof Error ? error.message : String(error),
          state: ctx.memory.state,
        };
      }
    },
  });

export interface LootSurvivorAgentConfig {
  runtime: LootSurvivorRuntime;
  model?: Agent["model"];
  modelSettings?: Agent["modelSettings"];
}

export const createLootSurvivorAgent = ({
  runtime,
  model,
  modelSettings,
}: LootSurvivorAgentConfig) => {
  const sessionContext = createSessionContext(runtime);
  const takeTurn = createTurnAction(sessionContext);

  return createDreams({
    model,
    modelSettings,
    contexts: [sessionContext],
    actions: [takeTurn],
  });
};
