import { EpisodeHooks, CreateEpisodeResult } from "@daydreamsai/core";

/**
 * Episode hooks for Death Mountain game to track game sessions,
 * combat encounters, and strategic decisions
 */
export const gameEpisodeHooks: EpisodeHooks = {
  /**
   * Start a new episode when:
   * - Game starts
   * - Combat begins
   * - Level-up begins
   * - Major exploration event occurs
   */
  shouldStartEpisode: (ref, workingMemory, contextState) => {
    // Start on game start
    if (ref.ref === "action_result" && ref.data?.action === "start-game") {
      return true;
    }
    
    // Start on phase transitions
    if (ref.ref === "event" && ref.data?.type === "phase_change") {
      const newPhase = ref.data?.phase;
      if (newPhase === "combat" || newPhase === "level-up") {
        return true;
      }
    }
    
    // Start on first input of a session
    if (ref.ref === "input" && !workingMemory.some(w => w.ref === "input")) {
      return true;
    }
    
    return false;
  },

  /**
   * End an episode when:
   * - Adventurer dies
   * - Combat ends (victory or flee)
   * - Level-up completes
   * - User ends session
   */
  shouldEndEpisode: (ref, workingMemory, contextState) => {
    // End on death
    if (ref.ref === "event" && ref.data?.type === "adventurer_died") {
      return true;
    }
    
    // End on combat resolution
    if (ref.ref === "action_result") {
      const action = ref.data?.action;
      if (action === "defeated_beast" || action === "fled_beast") {
        return true;
      }
    }
    
    // End on stat allocation completion
    if (ref.ref === "action_result" && ref.data?.action === "allocate-stats") {
      return true;
    }
    
    // End on significant output after multiple actions
    if (ref.ref === "output" && workingMemory.filter(w => w.ref === "action_result").length > 3) {
      return true;
    }
    
    return false;
  },

  /**
   * Create episode with game-specific summary and metadata
   */
  createEpisode: (logs, contextState): CreateEpisodeResult => {
    const memory = contextState.memory;
    const actionLogs = logs.filter(l => l.ref === "action_call" || l.ref === "action_result");
    const eventLogs = logs.filter(l => l.ref === "event");
    
    // Determine episode type and create appropriate summary
    let summary = "Game session";
    let episodeType = "session";
    let metadata: any = {
      gameId: memory.currentGameId,
      phase: memory.currentPhase,
      timestamp: Date.now(),
    };
    
    // Combat episode
    if (memory.currentPhase === "combat" && memory.beast) {
      episodeType = "combat";
      const combatActions = actionLogs.filter(l => 
        ["attack", "flee", "equip"].includes(l.data?.action)
      );
      
      const outcome = eventLogs.find(e => 
        e.data?.type === "defeated_beast" || e.data?.type === "fled_beast"
      );
      
      summary = `Combat with ${memory.beast.name || "beast"} (Lv${memory.beast.level}): ${
        outcome?.data?.type === "defeated_beast" ? "Victory" : 
        outcome?.data?.type === "fled_beast" ? "Fled" : "Ongoing"
      }`;
      
      metadata = {
        ...metadata,
        beastName: memory.beast.name,
        beastLevel: memory.beast.level,
        beastTier: memory.beast.tier,
        combatRounds: combatActions.filter(a => a.data?.action === "attack").length,
        fleeAttempts: combatActions.filter(a => a.data?.action === "flee").length,
        outcome: outcome?.data?.type || "ongoing",
        adventurerHealth: memory.adventurer?.health,
        adventurerLevel: memory.adventurer?.level,
      };
    }
    
    // Level-up episode
    else if (memory.currentPhase === "level-up") {
      episodeType = "levelup";
      const statAllocation = actionLogs.find(l => l.data?.action === "allocate-stats");
      
      if (statAllocation?.data?.allocated) {
        const allocated = statAllocation.data.allocated;
        const allocatedStats = Object.entries(allocated)
          .filter(([_, value]) => value > 0)
          .map(([stat, value]) => `${stat}:${value}`)
          .join(", ");
        
        summary = `Level ${memory.adventurer?.level || "?"} stat allocation: ${allocatedStats}`;
        
        metadata = {
          ...metadata,
          level: memory.adventurer?.level,
          allocation: allocated,
          totalPoints: statAllocation.data.totalPoints,
        };
      }
    }
    
    // Exploration episode
    else if (memory.currentPhase === "exploration") {
      episodeType = "exploration";
      const exploreActions = actionLogs.filter(l => l.data?.action === "explore");
      const purchases = actionLogs.filter(l => l.data?.action === "buy-items");
      
      const activities = [];
      if (exploreActions.length > 0) activities.push(`explored ${exploreActions.length}x`);
      if (purchases.length > 0) activities.push(`shopped ${purchases.length}x`);
      
      summary = `Exploration phase: ${activities.join(", ") || "various activities"}`;
      
      metadata = {
        ...metadata,
        exploreCount: exploreActions.length,
        purchaseCount: purchases.length,
        goldSpent: purchases.reduce((sum, p) => sum + (p.data?.totalCost || 0), 0),
      };
    }
    
    // Game start/end episodes
    const gameStart = actionLogs.find(l => l.data?.action === "start-game");
    if (gameStart) {
      episodeType = "game_start";
      summary = `Started game ${gameStart.data?.gameId}`;
      metadata.gameId = gameStart.data?.gameId;
    }
    
    const death = eventLogs.find(e => e.data?.type === "adventurer_died");
    if (death) {
      episodeType = "game_end";
      summary = `Game ended: Adventurer died at level ${memory.adventurer?.level || "?"}`;
      metadata.finalLevel = memory.adventurer?.level;
      metadata.finalXP = memory.adventurer?.xp;
      metadata.causeOfDeath = death.data?.cause || "unknown";
    }
    
    return {
      summary,
      logs: logs.map(l => l.id),
      metadata,
      type: episodeType,
    };
  },

  /**
   * Classify episode types for better organization
   */
  classifyEpisode: (episodeData) => {
    // Type is already set in createEpisode
    return episodeData.type || "conversation";
  },

  /**
   * Extract additional metadata for indexing and search
   */
  extractMetadata: (episodeData, logs) => {
    const metadata = episodeData.metadata || {};
    
    // Add performance metrics
    if (episodeData.type === "combat") {
      const efficiency = metadata.combatRounds ? 
        (metadata.adventurerHealth || 0) / metadata.combatRounds : 0;
      metadata.combatEfficiency = efficiency;
    }
    
    // Add strategy tags
    const tags = [];
    if (metadata.fleeAttempts > 0) tags.push("defensive");
    if (metadata.combatRounds > 5) tags.push("prolonged_combat");
    if (metadata.allocation?.vitality > 0) tags.push("tank_build");
    if (metadata.allocation?.strength > 0) tags.push("damage_build");
    if (metadata.allocation?.dexterity > 0) tags.push("agility_build");
    
    if (tags.length > 0) {
      metadata.strategyTags = tags;
    }
    
    return metadata;
  },

  /**
   * Include relevant refs in episodes
   */
  includeRefs: [
    "input",
    "output", 
    "action_call",
    "action_result",
    "event",
    "error",
    "phase_change",
  ],
};

/**
 * Helper function to analyze past episodes for strategic insights
 */
export async function analyzeGameHistory(
  agent: any,
  contextId: string,
  query: string,
  limit: number = 10
) {
  // Find similar past situations
  const similarEpisodes = await agent.memory.episodes.findSimilar(
    contextId,
    query,
    limit
  );
  
  // Analyze outcomes and strategies
  const analysis = {
    totalEpisodes: similarEpisodes.length,
    successRate: 0,
    commonStrategies: new Map<string, number>(),
    bestOutcomes: [] as any[],
  };
  
  for (const episode of similarEpisodes) {
    const metadata = episode.metadata || {};
    
    // Track success rates
    if (metadata.outcome === "victory" || metadata.outcome === "defeated_beast") {
      analysis.successRate++;
    }
    
    // Track common strategies
    if (metadata.strategyTags) {
      for (const tag of metadata.strategyTags) {
        analysis.commonStrategies.set(
          tag,
          (analysis.commonStrategies.get(tag) || 0) + 1
        );
      }
    }
    
    // Track best outcomes
    if (metadata.combatEfficiency && metadata.combatEfficiency > 10) {
      analysis.bestOutcomes.push({
        episodeId: episode.id,
        efficiency: metadata.combatEfficiency,
        strategy: metadata.strategyTags,
      });
    }
  }
  
  analysis.successRate = analysis.successRate / analysis.totalEpisodes;
  
  return analysis;
}
