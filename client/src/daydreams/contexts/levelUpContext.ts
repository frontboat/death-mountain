import { context, action } from "@daydreamsai/core";
import * as z from "zod";

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
  
  // Tracking
  lastAction?: string;
  lastActionTime?: number;
  totalPointsAllocated: number;
  
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
    
    return `<phase>level_up</phase>
  <level>${adventurer.level}</level>
  <points>${adventurer.stat_upgrades_available}</points>
  <stats>
    <str>${adventurer.stats?.strength || 0}</str>
    <dex>${adventurer.stats?.dexterity || 0}</dex>
    <vit>${adventurer.stats?.vitality || 0}</vit>
    <int>${adventurer.stats?.intelligence || 0}</int>
    <wis>${adventurer.stats?.wisdom || 0}</wis>
    <cha>${adventurer.stats?.charisma || 0}</cha>
  </stats>`;
  },
  
  instructions: `You have stat points to allocate! This MUST be done before any other action.
  
Stats and their benefits:
- STR: +10% attack damage per point
- DEX: Improves flee success (DEX/Level ratio)
- VIT: +15 HP per point (instant heal)
- INT: Avoid obstacle damage (INT/Level ratio)
- WIS: Avoid ambush penalties (WIS/Level ratio)
- CHA: Market discounts (reduces prices)

Recommended allocations:
- Balanced: Spread points between VIT, DEX, and your damage stat
- Tank: Focus on VIT for maximum health
- Damage: Focus on STR for maximum damage output
- Escape Artist: Focus on DEX to guarantee flee success
- Explorer: Balance INT and WIS to avoid hazards

You MUST allocate ALL available points before continuing!`,
  
}).setActions([
  // Allocate stat points action
  action({
    name: "allocate-stats",
    description: "Allocate available stat points (REQUIRED before other actions)",
    schema: z.object({
      strength: z.number().min(0).default(0).describe("Points to add to strength"),
      dexterity: z.number().min(0).default(0).describe("Points to add to dexterity"),
      vitality: z.number().min(0).default(0).describe("Points to add to vitality"),
      intelligence: z.number().min(0).default(0).describe("Points to add to intelligence"),
      wisdom: z.number().min(0).default(0).describe("Points to add to wisdom"),
      charisma: z.number().min(0).default(0).describe("Points to add to charisma"),
    }),
    handler: async ({ strength, dexterity, vitality, intelligence, wisdom, charisma }, ctx) => {
      if (ctx.memory.actionInFlight) {
        return {
          success: false,
          error: "Action already in progress",
          message: `Currently processing: ${ctx.memory.inFlightAction}`,
        };
      }
      
      const totalPoints = strength + dexterity + vitality + intelligence + wisdom + charisma;
      const availablePoints = ctx.memory.adventurer?.stat_upgrades_available || 0;
      
      if (totalPoints === 0) {
        return {
          success: false,
          error: "No points allocated",
          message: "You must allocate at least one stat point",
        };
      }
      
      if (totalPoints > availablePoints) {
        return {
          success: false,
          error: "Too many points",
          message: `You only have ${availablePoints} points available, but tried to allocate ${totalPoints}`,
        };
      }
      
      if (totalPoints < availablePoints) {
        return {
          success: false,
          error: "Points remaining",
          message: `You must allocate all ${availablePoints} points. You only allocated ${totalPoints}`,
          remaining: availablePoints - totalPoints,
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
          error: "GameDirector not available",
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
          stats: {
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
        
        // Build allocation summary
        const allocations = [];
        if (strength > 0) allocations.push(`STR +${strength}`);
        if (dexterity > 0) allocations.push(`DEX +${dexterity}`);
        if (vitality > 0) allocations.push(`VIT +${vitality} (healed ${vitality * 15} HP)`);
        if (intelligence > 0) allocations.push(`INT +${intelligence}`);
        if (wisdom > 0) allocations.push(`WIS +${wisdom}`);
        if (charisma > 0) allocations.push(`CHA +${charisma}`);
        
        return {
          success: true,
          message: `Allocated ${totalPoints} stat points: ${allocations.join(", ")}`,
          allocated: {
            strength,
            dexterity,
            vitality,
            intelligence,
            wisdom,
            charisma,
          },
          totalPoints,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        ctx.memory.actionInFlight = false;
        ctx.memory.inFlightAction = undefined;
        ctx.memory.inFlightSince = undefined;
      }
    },
  }),
]);