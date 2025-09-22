import type { Agent, AnyContext, AnyRef } from "@daydreamsai/core";
import type { GameSettingsData } from "@/types/game";
import { createLootSurvivorAgent } from "./agent";
import type {
  LootSurvivorAgentMemory,
  LootSurvivorRuntime,
  LootSurvivorState,
} from "./types";

export interface LootSurvivorAgentRunOptions {
  runtime: LootSurvivorRuntime;
  gameId: number;
  autoBattle?: boolean;
  adventurerName?: string;
  settings?: GameSettingsData | null;
  model?: Agent["model"];
  modelSettings?: Agent["modelSettings"];
  onLog?: (log: AnyRef, done: boolean) => void;
  abortSignal?: AbortSignal;
  shutdownOnComplete?: boolean;
}

export interface LootSurvivorAgentRunResult {
  contextId: string;
  logs: AnyRef[];
  memory: LootSurvivorAgentMemory;
  state: LootSurvivorState;
}

const SESSION_CONTEXT_TYPE = "loot-survivor-session";

const buildContextArgs = (options: LootSurvivorAgentRunOptions) => {
  const args: Record<string, unknown> = {
    gameId: options.gameId,
  };

  if (typeof options.autoBattle === "boolean") {
    args.autoBattle = options.autoBattle;
  }

  if (options.adventurerName) {
    args.adventurerName = options.adventurerName;
  }

  if (options.settings !== undefined) {
    args.settings = options.settings;
  }

  return args;
};

export const runLootSurvivorAgent = async (
  options: LootSurvivorAgentRunOptions,
): Promise<LootSurvivorAgentRunResult> => {
  const agent = createLootSurvivorAgent({
    runtime: options.runtime,
    model: options.model,
    modelSettings: options.modelSettings,
  });

  await agent.start();

  const sessionContext = agent.registry.contexts.get(SESSION_CONTEXT_TYPE) as
    | AnyContext
    | undefined;

  if (!sessionContext) {
    throw new Error("Loot Survivor session context is not registered on the agent");
  }

  const contextArgs = buildContextArgs(options);
  const contextId = agent.getContextId({ context: sessionContext, args: contextArgs });

  const unsubscribe = options.onLog
    ? agent.subscribeContext(contextId, (log, done) => {
        options.onLog?.(log, done);
      })
    : undefined;

  let result: LootSurvivorAgentRunResult | undefined;

  try {
    const logs = await agent.run({
      context: sessionContext,
      args: contextArgs,
      abortSignal: options.abortSignal,
    });

    const contextState = await agent.getContext({
      context: sessionContext,
      args: contextArgs,
    });

    const memory = contextState.memory as LootSurvivorAgentMemory | undefined;
    if (!memory) {
      throw new Error("Loot Survivor agent memory is missing after run");
    }

    result = {
      contextId,
      logs,
      memory,
      state: memory.state,
    };
  } finally {
    unsubscribe?.();

    if (options.shutdownOnComplete !== false) {
      await agent.stop().catch(() => undefined);
    }
  }

  if (!result) {
    throw new Error("Failed to execute Loot Survivor agent session");
  }

  return result;
};
