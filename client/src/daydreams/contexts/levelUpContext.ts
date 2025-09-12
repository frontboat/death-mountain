import { context, action } from "@daydreamsai/core";
import * as z from "zod";
import { GameEvent, getEventTitle } from "@/utils/events";

interface LevelUpMemory {
  gameDirector?: any; // Reference to the GameDirector
  actionInFlight?: boolean;
  inFlightAction?: string;
  inFlightSince?: number;
  
  // Level up state
  adventurer?: any;
  selectedStats?: {
    strength: number;
    dexterity: number;
    vitality: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  recentEvents?: GameEvent[]; // Recent events leading to level up
  
  // Tracking
  lastAction?: string;
  lastActionTime?: number;
  totalPointsAllocated: number;
  recentAllocationHash?: string; // Track recent allocation to prevent duplicates
  
  preferences: {
    preferredStats: string[];
  };
}

export const levelUpContext = context<LevelUpMemory>({
  type: "level-up",
  
  schema: z.object({
    gameId: z.number().describe("Current game ID"),
    playerId: z.string().describe("Player wallet address"),
  }),
  
  create: (): LevelUpMemory => ({
    totalPointsAllocated: 0,
    preferences: {
      preferredStats: ["vitality", "dexterity", "strength"],
    },
  }),
  
  render: (state) => {
    const { memory } = state;
    const adventurer = memory.adventurer;
    
    if (!adventurer || !adventurer.stat_upgrades_available) {
      return `<phase>no-level-up</phase>
  <status>No stat points available</status>`;
    }
    
    // Calculate max health: 100 base + (vitality * 15)
    const maxHealth = 100 + ((adventurer.stats?.vitality || 0) * 15);
    
    return `<phase>level_up</phase>
  <adventurer health="${adventurer.health}" maxHealth="${maxHealth}" level="${adventurer.level}"/>
  <points_to_allocate>${adventurer.stat_upgrades_available}</points_to_allocate>
  <current_stats>
    <str>${adventurer.stats?.strength || 0}</str>
    <dex>${adventurer.stats?.dexterity || 0}</dex>
    <vit>${adventurer.stats?.vitality || 0}</vit>
    <int>${adventurer.stats?.intelligence || 0}</int>
    <wis>${adventurer.stats?.wisdom || 0}</wis>
    <cha>${adventurer.stats?.charisma || 0}</cha>
    <luck>${adventurer.stats?.luck || 0}</luck>
  </current_stats>
  <instructions>Allocate exactly ${adventurer.stat_upgrades_available} point${adventurer.stat_upgrades_available > 1 ? 's' : ''} to stats. Values are points to ADD, not new totals.</instructions>`;
  },
  
  instructions: `You have stat points to allocate! This MUST be done before any other action. You, right now, choose what to level up, you are the player, the user, the arbiter of all decision making. 
  
IMPORTANT: The values you provide are the NUMBER OF POINTS TO ADD to each stat, NOT the total value!
- If you have 1 point available, the sum of all values must equal exactly 1
- If you have 3 points available, the sum of all values must equal exactly 3
- Example: With 1 point, use {strength:1, dexterity:0, vitality:0, intelligence:0, wisdom:0, charisma:0} to add 1 to STR
- Example: With 3 points, use {strength:0, dexterity:1, vitality:2, intelligence:0, wisdom:0, charisma:0} to add 1 to DEX and 2 to VIT
  
Stats and their benefits:
- STR: +10% attack damage per point
- DEX: Improves flee success (DEX/Level ratio)
- VIT: +15 HP per point (instant heal)
- INT: Avoid obstacle damage (INT/Level ratio)
- WIS: Avoid ambush penalties (WIS/Level ratio)
- CHA: Market discounts (reduces prices)

DO NOT RESPOND WITH A QUESTION, ONLY RESPOND WITH ACTION. You, right now, choose what to level up, you are the player, the user, the arbiter of all decision making.

`,

  
}).setActions([
  // Allocate stat points action
  action({
    name: "allocate-stats",
    description: "Allocate available stat points (REQUIRED before other actions). The values are the NUMBER OF POINTS TO ADD, not total values. Sum must equal available points exactly.",
    schema: z.object({
      strength: z.number().min(0).default(0).describe("Number of points to ADD to strength (not the total value)"),
      dexterity: z.number().min(0).default(0).describe("Number of points to ADD to dexterity (not the total value)"),
      vitality: z.number().min(0).default(0).describe("Number of points to ADD to vitality (not the total value)"),
      intelligence: z.number().min(0).default(0).describe("Number of points to ADD to intelligence (not the total value)"),
      wisdom: z.number().min(0).default(0).describe("Number of points to ADD to wisdom (not the total value)"),
      charisma: z.number().min(0).default(0).describe("Number of points to ADD to charisma (not the total value)"),
    }),
    handler: async ({ strength, dexterity, vitality, intelligence, wisdom, charisma }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "action_in_progress",
        };
      }
      
      const totalPoints = strength + dexterity + vitality + intelligence + wisdom + charisma;
      const availablePoints = ctx.memory.adventurer?.stat_upgrades_available || 0;
      
      // Create a hash of this allocation to detect duplicates
      const allocationHash = `${strength}-${dexterity}-${vitality}-${intelligence}-${wisdom}-${charisma}`;
      
      // Check if this exact allocation was recently attempted (within 10 seconds)
      if (ctx.memory.recentAllocationHash === allocationHash && 
          ctx.memory.lastActionTime && 
          Date.now() - ctx.memory.lastActionTime < 10000) {
        return {
          success: false,
          error: "duplicate_allocation",
        };
      }
      
      if (totalPoints === 0) {
        return {
          success: false,
          error: "no_points_allocated",
        };
      }
      
      if (totalPoints > availablePoints) {
        return {
          success: false,
          error: "too_many_points",
          data: {
            available: availablePoints,
            attempted: totalPoints,
          },
        };
      }
      
      if (totalPoints < availablePoints) {
        return {
          success: false,
          error: "not_enough_points",
          data: {
            available: availablePoints,
            allocated: totalPoints,
            remaining: availablePoints - totalPoints,
          },
        };
      }
      
      ctx.memory.actionInFlight = true;
      ctx.memory.inFlightAction = "select_stat_upgrades";
      ctx.memory.inFlightSince = Date.now();
      
      const gameDirector = ctx.memory.gameDirector;
      if (!gameDirector) {
        ctx.memory.actionInFlight = false;
        return {
          success: false,
          error: "game_director_unavailable",
        };
      }
      
      try {
        // Store the selected stats
        ctx.memory.selectedStats = {
          strength,
          dexterity,
          vitality,
          intelligence,
          wisdom,
          charisma,
        };
        
        await gameDirector.executeGameAction({
          type: "select_stat_upgrades",
          statUpgrades: {
            strength,
            dexterity,
            vitality,
            intelligence,
            wisdom,
            charisma,
            luck: 0, // Luck cannot be upgraded with points
          },
        });
        
        ctx.memory.lastAction = "allocate_stats";
        ctx.memory.lastActionTime = Date.now();
        ctx.memory.totalPointsAllocated += totalPoints;
        ctx.memory.recentAllocationHash = allocationHash;
        
        // Mark that we've used the stat points (prevents double allocation)
        // This is a temporary fix until state syncs from blockchain
        if (ctx.memory.adventurer) {
          ctx.memory.adventurer.stat_upgrades_available = 0;
        }
        
        // Build allocation summary
        const allocations = [];
        if (strength > 0) allocations.push(`STR +${strength}`);
        if (dexterity > 0) allocations.push(`DEX +${dexterity}`);
        if (vitality > 0) allocations.push(`VIT +${vitality} (healed ${vitality * 15} HP)`);
        if (intelligence > 0) allocations.push(`INT +${intelligence}`);
        if (wisdom > 0) allocations.push(`WIS +${wisdom}`);
        if (charisma > 0) allocations.push(`CHA +${charisma}`);
        
        // Don't return user-facing messages - just data
        // The AI will see this result and might repeat any message we include
        return {
          success: true,
          data: {
            allocated: {
              strength,
              dexterity,
              vitality,
              intelligence,
              wisdom,
              charisma,
            },
            totalPoints,
            allocations: allocations.join(", "),
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "unknown_error",
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
]);