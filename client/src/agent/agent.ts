import { createDreams, context, action, input, ContextState, WorkingMemory } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import * as z from "zod";
import { GameState as ServiceGameState } from "@/services/GameStateService";
import {
  ItemPurchase,
  Stats,
  Item,
} from "@/types/game";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { calculateLevel, calculateCombatStats, ability_based_percentage } from "@/utils/game";
import { ItemUtils } from "@/utils/loot";
import { potionPrice } from "@/utils/market";
import { ContextEngine } from "./contextEngine";

// If the default isn't picking up the env var, configure manually:
const openaiClient = createOpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

// Define the type for the system calls that will be passed to the agent
type SystemCalls = ReturnType<typeof useSystemCalls>;

// Define the memory structure for our game context
interface LootSurvivorMemory {
  gameId: number | null;
  history: { action: string; params: any; result: any }[];
  currentGameState: ServiceGameState | null;
  lastActionTime: number;
}

const contextSchema = z.object({
    gameId: z.number().describe("Unique identifier for the game session"),
});

export const lootSurvivorContext = context<LootSurvivorMemory>({
    type: "loot-survivor",
  
    schema: contextSchema,
  
    create: (params) => ({
        gameId: params.args.gameId,
        history: [],
        currentGameState: null,
        lastActionTime: 0,
    }),
  
    render: (state) => {
        if (!state.memory.currentGameState) {
            return `Loot Survivor Game Session: ${state.args.gameId}\nWaiting for game state...`;
        }

        // Use the context engine to generate XML context
        const contextResult = ContextEngine.generateContext(state.memory.currentGameState);
        
        // Add game ID and phase information to the output
        return `Game ${state.args.gameId} - Phase: ${contextResult.phase}\n\n${contextResult.content}`;
    },
  
    instructions: `You are an autonomous AI agent playing the game Loot Survivor. Your goal is to survive as long as possible.

CRITICAL RULES:
- You are a SILENT agent - ONLY use actions, NEVER generate text outputs
- Do NOT use <output> tags of any kind
- Do NOT try to send messages or explanations
- ONLY use <action_call> tags to take game actions
- Just take actions based on the game state, nothing else

The game state is provided in XML format with the current phase and relevant information:
- <phase>exploration</phase> - You can explore, buy items, or equip items
- <phase>combat</phase> - You're fighting a beast; check <estimate> for win/loss prediction
- <phase>level_up</phase> - You have stat points to allocate
- <phase>death</phase> - Game over

Decision making based on phase:
1. level_up → use select_stat_upgrades (prioritize vitality early for survival)
2. combat → check <estimate> - if losing, flee; if winning with acceptable damage, attack
3. exploration → if health < 50%, buy potions; if good items in market, buy them; otherwise explore
4. death → game is over, no actions possible

BUYING ITEMS - CRITICAL:
- The XML shows market items with id attribute like <item id="56">Cap:T5:2g</item>
- Use the id attribute value when buying! For example: item_id: 56
- NEVER use sequential numbers like 1, 2, 3 - use the actual IDs shown
- The comment <!-- Available market item IDs: ... --> lists all available IDs
- Good tier 1-2 items (T1/T2 in XML) are worth buying early
- Example: To buy Cap with id="56", use: buy_items with items: [{item_id: 56, equip: true}]

Combat strategy:
- Check <estimate> tag for combat outcome prediction
- If it says "Lose", always flee (check <flee chance> first)
- If it says "Win" but damage taken > 50% of health, consider fleeing
- Attack when winning with acceptable damage

Focus on survival:
- Prioritize vitality and defensive stats early
- Maintain health above 50% with potions
- Flee from unwinnable fights
- Buy tier 1-2 items when affordable (check the T1/T2 items in market)
- Explore cautiously when healthy`,

    // Add lifecycle hooks for better control
    onStep: async (ctx) => {
        // Rate limiting
        const now = Date.now();
        const timeSinceLastAction = now - ctx.memory.lastActionTime;
        
        if (timeSinceLastAction < 1500) {
            await new Promise(resolve => setTimeout(resolve, 1500 - timeSinceLastAction));
        }
        
        ctx.memory.lastActionTime = now;
    },
    
    // Add max steps to prevent infinite loops
    maxSteps: 10,
});
  
const createGameActions = (systemCalls: SystemCalls) => [
    action({
        name: "explore",
        description: "Explore the world",
        schema: z.object({
            tillBeast: z.boolean().default(false),
        }),
        handler: async ({ tillBeast }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            
            // Use fresh game ID from current state, not stale memory
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Explore] Starting for game ${freshGameId}, tillBeast: ${tillBeast}`);
            
            try {
                // Build the call array - MUST include VRF if enabled!
                const calls = [];
                
                // Check if VRF is enabled (this is what GameDirector does!)
                // For now, assume VRF is enabled since we can't easily check gameSettings here
                const VRF_ENABLED = true; // This matches the game's default
                
                if (VRF_ENABLED) {
                    console.log(`[Explore] Adding VRF requestRandom call`);
                    calls.push(systemCalls.requestRandom());
                }
                
                // Add the actual explore action
                calls.push(systemCalls.explore(freshGameId, tillBeast));
                
                console.log(`[Explore] Executing ${calls.length} calls`);
                
                // executeAction expects a forceResetAction callback
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Explore] Transaction REVERTED for game ${freshGameId}`);
                });
                
                // The translated events contain all the game state updates
                if (result && result.length > 0) {
                    console.log(`[Explore] Success! ${result.length} events received`);
                    memory.history.push({ action: "explore", params: { tillBeast }, result });
                    
                    // Add longer delay to ensure blockchain state settles
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    console.warn(`[Explore] No events returned - transaction may have been reverted`);
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Explore] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "attack",
        description: "Attack the current beast",
        schema: z.object({
            toTheDeath: z.boolean().default(false),
        }),
        handler: async ({ toTheDeath }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Attack] Starting for game ${freshGameId}, toTheDeath: ${toTheDeath}`);
            
            try {
                // Build the call array - MUST include VRF if enabled!
                const calls = [];
                
                // Check if VRF is enabled (matching GameDirector behavior)
                const VRF_ENABLED = true; // This matches the game's default
                
                if (VRF_ENABLED) {
                    console.log(`[Attack] Adding VRF requestRandom call`);
                    calls.push(systemCalls.requestRandom());
                }
                
                // Add the actual attack action
                calls.push(systemCalls.attack(freshGameId, toTheDeath));
                
                console.log(`[Attack] Executing ${calls.length} calls`);
                
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Attack] Transaction REVERTED for game ${freshGameId}`);
                });
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "attack", params: { toTheDeath }, result });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Attack] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "flee",
        description: "Flee from the current beast",
        schema: z.object({
            toTheDeath: z.boolean().default(false),
        }),
        handler: async ({ toTheDeath }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Flee] Starting for game ${freshGameId}, toTheDeath: ${toTheDeath}`);
            
            try {
                // Build the call array - MUST include VRF if enabled!
                const calls = [];
                
                // Check if VRF is enabled (matching GameDirector behavior)
                const VRF_ENABLED = true; // This matches the game's default
                
                if (VRF_ENABLED) {
                    console.log(`[Flee] Adding VRF requestRandom call`);
                    calls.push(systemCalls.requestRandom());
                }
                
                // Add the actual flee action
                calls.push(systemCalls.flee(freshGameId, toTheDeath));
                
                console.log(`[Flee] Executing ${calls.length} calls`);
                
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Flee] Transaction REVERTED for game ${freshGameId}`);
                });
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "flee", params: { toTheDeath }, result });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Flee] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "equip",
        description: "Equip items from your bag",
        schema: z.object({
            items: z.array(z.number()),
        }),
        handler: async ({ items }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Equip] Starting for game ${freshGameId}, items: ${items}`);
            
            try {
                // Build the call array - include VRF if enabled AND in combat!
                const calls = [];
                
                // Check if VRF is enabled and we're in combat (matching GameDirector behavior)
                const VRF_ENABLED = true; // This matches the game's default
                const inCombat = memory.currentGameState?.adventurer?.beastHealth && memory.currentGameState.adventurer.beastHealth > 0;
                
                if (VRF_ENABLED && inCombat) {
                    console.log(`[Equip] In combat - adding VRF requestRandom call`);
                    calls.push(systemCalls.requestRandom());
                }
                
                // Add the actual equip action
                calls.push(systemCalls.equip(freshGameId, items));
                
                console.log(`[Equip] Executing ${calls.length} calls`);
                
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Equip] Transaction REVERTED for game ${freshGameId}`);
                });
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "equip", params: { items }, result });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Equip] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "drop",
        description: "Drop items from your bag",
        schema: z.object({
            items: z.array(z.number()),
        }),
        handler: async ({ items }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Drop] Starting for game ${freshGameId}, items: ${items}`);
            
            try {
                const calls = [systemCalls.drop(freshGameId, items)];
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Drop] Transaction REVERTED for game ${freshGameId}`);
                });
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "drop", params: { items }, result });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Drop] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "buy_items",
        description: "Buy items from the market. IMPORTANT: Use the actual numeric item IDs from the marketItemIds array in the game state (e.g., 56, 100, 65), NOT item position numbers like 1, 2, 3!",
        schema: z.object({
            potions: z.number().default(0).describe("Number of health potions to buy"),
            items: z.array(z.object({
                item_id: z.number().describe("The actual item ID from marketItemIds array (e.g., 56, 100, 65), NOT the position in the list"),
                equip: z.boolean().describe("Whether to equip the item immediately"),
            })).default([]).describe("List of items to buy using their actual IDs from marketItemIds"),
        }),
        handler: async ({ potions, items }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Buy Items] Game ID: ${freshGameId}, Potions: ${potions}, Items:`, items);
            
            try {
                const calls = [systemCalls.buyItems(freshGameId, potions, items)];
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Buy Items] Transaction REVERTED for game ${freshGameId}`);
                });
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "buy_items", params: { potions, items }, result });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Buy Items] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "select_stat_upgrades",
        description: "Upgrade stats when you level up",
        schema: z.object({
            strength: z.number().default(0),
            dexterity: z.number().default(0),
            vitality: z.number().default(0),
            intelligence: z.number().default(0),
            wisdom: z.number().default(0),
            charisma: z.number().default(0),
            luck: z.number().default(0),
        }),
        handler: async (stats, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            const freshGameId = memory.currentGameState?.gameId;
            if (!freshGameId) return { success: false, message: "No active game or game state not loaded." };
            
            console.log(`[Select Stats] Game ID: ${freshGameId}, Stats:`, stats);
            
            try {
                const calls = [systemCalls.selectStatUpgrades(freshGameId, stats)];
                const result = await systemCalls.executeAction(calls, () => {
                    console.warn(`[Select Stats] Transaction REVERTED for game ${freshGameId}`);
                });
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "select_stat_upgrades", params: { stats }, result });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                return { success: true, result };
            } catch (error: any) {
                console.error(`[Select Stats] Error:`, error);
                return { success: false, error: error.message };
            }
        }
    }),
];

// Create the agent
export const createLootSurvivorAgent = (systemCalls: SystemCalls) => {
    
    const gameStateInput = input({
        schema: z.object({
            gameState: z.any(),
        }),
        handler: async (data, ctx) => {
            (ctx.memory as LootSurvivorMemory).currentGameState = data.gameState;
            return { 
                data: data.gameState,
                params: {}
            };
        }
    });

    const agent = createDreams({
        model: openaiClient("gpt-4o-mini"),
        contexts: [lootSurvivorContext],
        actions: createGameActions(systemCalls),
        inputs: {
            game_state_update: gameStateInput,
        }
    });

    return { agent };
}