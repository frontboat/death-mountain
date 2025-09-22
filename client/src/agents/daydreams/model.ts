import type { Agent } from "@daydreamsai/core";

interface AgentModelConfig {
  model?: Agent["model"];
  modelSettings?: Agent["modelSettings"];
}

interface AgentConfigResponse {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string | null;
  organization?: string | null;
  project?: string | null;
  modelSettings?: Agent["modelSettings"] | null;
}

declare global {
  interface Window {
    __lootSurvivorAgentModel?: Agent["model"];
    __lootSurvivorAgentModelSettings?: Agent["modelSettings"];
  }
}

const configCache: { promise?: Promise<AgentModelConfig> } = {};

const buildRemoteModel = async (config: AgentConfigResponse): Promise<AgentModelConfig> => {
  if (!config.apiKey || !config.model || config.provider !== "openai") {
    return {};
  }

  const { createOpenAI } = await import("@ai-sdk/openai");

  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl ?? undefined,
    organization: config.organization ?? undefined,
    project: config.project ?? undefined,
  });

  return {
    model: openai.responses(config.model),
    modelSettings: config.modelSettings ?? undefined,
  } satisfies AgentModelConfig;
};

export const resolveAgentModel = async (): Promise<AgentModelConfig> => {
  if (typeof window === "undefined") {
    return {};
  }

  if (window.__lootSurvivorAgentModel) {
    return {
      model: window.__lootSurvivorAgentModel,
      modelSettings: window.__lootSurvivorAgentModelSettings,
    } satisfies AgentModelConfig;
  }

  if (!configCache.promise) {
    configCache.promise = (async () => {
      try {
        const base = import.meta.env.VITE_AGENT_API_BASE?.replace(/\/$/, "") ?? "/api/agent";
        const response = await fetch(`${base}/model`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          return {};
        }

        const payload = (await response.json()) as AgentConfigResponse;
        return await buildRemoteModel(payload);
      } catch (error) {
        console.warn("Failed to load remote agent model", error);
        return {};
      }
    })();
  }

  return configCache.promise;
};
