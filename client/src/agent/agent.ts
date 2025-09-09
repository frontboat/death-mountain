import { createDreams, context, action, input, output, ContextState, WorkingMemory } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import * as z from "zod";
import { GameState } from "@/stores/gameStore";
import {
  ItemPurchase,
  Stats,
  Item,
} from "@/types/game";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { calculateLevel, calculateCombatStats, ability_based_percentage } from "@/utils/game";
import { ItemUtils } from "@/utils/loot";
import { potionPrice } from "@/utils/market";

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
  currentGameState: GameState | null;
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

        const gameContext = state.memory.currentGameState;
        const adventurer = gameContext.adventurer;
        
        if (!adventurer) {
            return "No adventurer created yet. Start the game to begin.";
        }

        // Enrich adventurer data
        const enrichedAdventurer = {
            ...adventurer,
            level: calculateLevel(adventurer.xp),
            equipment: {
                weapon: adventurer.equipment.weapon?.id ? { 
                    ...adventurer.equipment.weapon, 
                    name: ItemUtils.getItemName(adventurer.equipment.weapon.id), 
                    level: calculateLevel(adventurer.equipment.weapon.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.weapon.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.weapon.id) 
                } : null,
                chest: adventurer.equipment.chest?.id ? { 
                    ...adventurer.equipment.chest, 
                    name: ItemUtils.getItemName(adventurer.equipment.chest.id), 
                    level: calculateLevel(adventurer.equipment.chest.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.chest.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.chest.id) 
                } : null,
                head: adventurer.equipment.head?.id ? { 
                    ...adventurer.equipment.head, 
                    name: ItemUtils.getItemName(adventurer.equipment.head.id), 
                    level: calculateLevel(adventurer.equipment.head.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.head.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.head.id) 
                } : null,
                waist: adventurer.equipment.waist?.id ? { 
                    ...adventurer.equipment.waist, 
                    name: ItemUtils.getItemName(adventurer.equipment.waist.id), 
                    level: calculateLevel(adventurer.equipment.waist.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.waist.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.waist.id) 
                } : null,
                foot: adventurer.equipment.foot?.id ? { 
                    ...adventurer.equipment.foot, 
                    name: ItemUtils.getItemName(adventurer.equipment.foot.id), 
                    level: calculateLevel(adventurer.equipment.foot.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.foot.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.foot.id) 
                } : null,
                hand: adventurer.equipment.hand?.id ? { 
                    ...adventurer.equipment.hand, 
                    name: ItemUtils.getItemName(adventurer.equipment.hand.id), 
                    level: calculateLevel(adventurer.equipment.hand.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.hand.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.hand.id) 
                } : null,
                neck: adventurer.equipment.neck?.id ? { 
                    ...adventurer.equipment.neck, 
                    name: ItemUtils.getItemName(adventurer.equipment.neck.id), 
                    level: calculateLevel(adventurer.equipment.neck.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.neck.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.neck.id) 
                } : null,
                ring: adventurer.equipment.ring?.id ? { 
                    ...adventurer.equipment.ring, 
                    name: ItemUtils.getItemName(adventurer.equipment.ring.id), 
                    level: calculateLevel(adventurer.equipment.ring.xp), 
                    type: ItemUtils.getItemType(adventurer.equipment.ring.id), 
                    tier: ItemUtils.getItemTier(adventurer.equipment.ring.id) 
                } : null,
            }
        };

        // Enrich bag items
        const enrichedBag = gameContext.bag ? gameContext.bag.map((item: Item) => ({
            ...item,
            name: item.id ? ItemUtils.getItemName(item.id) : null,
            level: calculateLevel(item.xp),
            type: item.id ? ItemUtils.getItemType(item.id) : null,
            tier: item.id ? ItemUtils.getItemTier(item.id) : null
        })) : [];

        // Calculate combat stats and abilities
        const combatStats = adventurer && gameContext.beast ? 
            calculateCombatStats(adventurer, gameContext.bag || [], gameContext.beast) : null;
        
        const abilityPercentages = adventurer ? {
            fleeChance: ability_based_percentage(adventurer.xp, adventurer.stats.dexterity),
            obstacleAvoidance: ability_based_percentage(adventurer.xp, adventurer.stats.intelligence),
            ambushAvoidance: ability_based_percentage(adventurer.xp, adventurer.stats.wisdom)
        } : null;
        
        const currentPotionPrice = enrichedAdventurer ? 
            potionPrice(enrichedAdventurer.level, enrichedAdventurer.stats.charisma) : null;

        // Enrich market items
        const enrichedMarketItems = gameContext.marketItemIds && enrichedAdventurer ? 
            gameContext.marketItemIds.map((id: number) => ({
                id,
                name: ItemUtils.getItemName(id),
                type: ItemUtils.getItemType(id),
                tier: ItemUtils.getItemTier(id),
                price: ItemUtils.getItemPrice(ItemUtils.getItemTier(id), enrichedAdventurer.stats.charisma)
            })) : [];

        // Build the formatted game state
        return `CURRENT GAME STATE:
Game ID: ${gameContext.gameId || 'No active game'}

Adventurer:
- Level: ${enrichedAdventurer.level || 1}
- Health: ${enrichedAdventurer.health || 0}
- XP: ${enrichedAdventurer.xp || 0}
- Gold: ${enrichedAdventurer.gold || 0}
- Beast Health: ${enrichedAdventurer.beast_health || 0}
- Stat Upgrades Available: ${enrichedAdventurer.stat_upgrades_available || 0}
- Stats: ${enrichedAdventurer.stats ? `Strength ${enrichedAdventurer.stats.strength || 0}, Dexterity ${enrichedAdventurer.stats.dexterity || 0}, Vitality ${enrichedAdventurer.stats.vitality || 0}, Intelligence ${enrichedAdventurer.stats.intelligence || 0}, Wisdom ${enrichedAdventurer.stats.wisdom || 0}, Charisma ${enrichedAdventurer.stats.charisma || 0}, Luck ${enrichedAdventurer.stats.luck || 0}` : 'No stats allocated'}
- Equipment:
  * Weapon: ${enrichedAdventurer.equipment.weapon?.id ? `${enrichedAdventurer.equipment.weapon.name || `Item #${enrichedAdventurer.equipment.weapon.id}`} [T${enrichedAdventurer.equipment.weapon.tier || '?'} ${enrichedAdventurer.equipment.weapon.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.weapon.level || 1}]` : 'None'}
  * Chest: ${enrichedAdventurer.equipment.chest?.id ? `${enrichedAdventurer.equipment.chest.name || `Item #${enrichedAdventurer.equipment.chest.id}`} [T${enrichedAdventurer.equipment.chest.tier || '?'} ${enrichedAdventurer.equipment.chest.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.chest.level || 1}]` : 'None'}
  * Head: ${enrichedAdventurer.equipment.head?.id ? `${enrichedAdventurer.equipment.head.name || `Item #${enrichedAdventurer.equipment.head.id}`} [T${enrichedAdventurer.equipment.head.tier || '?'} ${enrichedAdventurer.equipment.head.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.head.level || 1}]` : 'None'}
  * Waist: ${enrichedAdventurer.equipment.waist?.id ? `${enrichedAdventurer.equipment.waist.name || `Item #${enrichedAdventurer.equipment.waist.id}`} [T${enrichedAdventurer.equipment.waist.tier || '?'} ${enrichedAdventurer.equipment.waist.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.waist.level || 1}]` : 'None'}
  * Foot: ${enrichedAdventurer.equipment.foot?.id ? `${enrichedAdventurer.equipment.foot.name || `Item #${enrichedAdventurer.equipment.foot.id}`} [T${enrichedAdventurer.equipment.foot.tier || '?'} ${enrichedAdventurer.equipment.foot.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.foot.level || 1}]` : 'None'}
  * Hand: ${enrichedAdventurer.equipment.hand?.id ? `${enrichedAdventurer.equipment.hand.name || `Item #${enrichedAdventurer.equipment.hand.id}`} [T${enrichedAdventurer.equipment.hand.tier || '?'} ${enrichedAdventurer.equipment.hand.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.hand.level || 1}]` : 'None'}
  * Neck: ${enrichedAdventurer.equipment.neck?.id ? `${enrichedAdventurer.equipment.neck.name || `Item #${enrichedAdventurer.equipment.neck.id}`} [T${enrichedAdventurer.equipment.neck.tier || '?'} ${enrichedAdventurer.equipment.neck.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.neck.level || 1}]` : 'None'}
  * Ring: ${enrichedAdventurer.equipment.ring?.id ? `${enrichedAdventurer.equipment.ring.name || `Item #${enrichedAdventurer.equipment.ring.id}`} [T${enrichedAdventurer.equipment.ring.tier || '?'} ${enrichedAdventurer.equipment.ring.type || 'Unknown'}, Level ${enrichedAdventurer.equipment.ring.level || 1}]` : 'None'}
${gameContext.beast ? `
Current Beast:
- Name: ${gameContext.beast.name || 'Unknown Beast'}
- Level: ${gameContext.beast.level || 0}
- Health: ${gameContext.beast.health || 0}
- Type: ${gameContext.beast.type || 'Unknown'}` : 'No beast encountered'}
${enrichedBag.length > 0 ? `
Bag Items: ${enrichedBag.map(item => `${item.name} [T${item.tier || '?'} ${item.type || 'Unknown'}, Level ${item.level || 1}]`).join(', ')}` : ''}
${abilityPercentages ? `

ABILITY CHANCES:
- Flee Success: ${abilityPercentages.fleeChance}%
- Obstacle Avoidance: ${abilityPercentages.obstacleAvoidance}%
- Ambush Avoidance: ${abilityPercentages.ambushAvoidance}%` : ''}
${gameContext.quest ? `
Active Quest: ID ${gameContext.quest.id}, Chapter ${gameContext.quest.chapterId}` : ''}
${gameContext.collectableCount ? `
Beasts Collected: ${gameContext.collectableCount}` : ''}
${combatStats ? `

COMBAT ANALYSIS:
- Your Base Damage: ${combatStats.baseDamage || 0}
- Your Critical Damage: ${combatStats.criticalDamage || 0}
- Best Available Damage: ${combatStats.bestDamage || 0}
- Current Protection: ${combatStats.protection || 0}
- Best Available Protection: ${combatStats.bestProtection || 0}
- Gear Score: ${combatStats.gearScore || 0}
${combatStats.bestItems && combatStats.bestItems.length > 0 ? `- Recommended Equipment: ${combatStats.bestItems.map((item: Item) => ItemUtils.getItemName(item.id) || `Item #${item.id}`).join(', ')}` : ''}` : ''}
${gameContext.selectedStats ? `
Unallocated Stat Points - Strength: ${gameContext.selectedStats.strength}, Dexterity: ${gameContext.selectedStats.dexterity}, Vitality: ${gameContext.selectedStats.vitality}, Intelligence: ${gameContext.selectedStats.intelligence}, Wisdom: ${gameContext.selectedStats.wisdom}, Charisma: ${gameContext.selectedStats.charisma}, Luck: ${gameContext.selectedStats.luck}` : ''}
${enrichedMarketItems.length > 0 ? `
Market Items Available for purchase:
${enrichedMarketItems.map(item => `- ${item.name} (${item.type}, Tier ${item.tier}, Price: ${item.price} gold)`).join('\n')}` : ''}
${currentPotionPrice !== null && currentPotionPrice !== undefined ? `
Health Potion Price: ${currentPotionPrice} gold` : ''}

Use this game state information to play the game.`.trim();
    },
  
    instructions: `You are an autonomous AI agent playing the game Loot Survivor. Your goal is to survive as long as possible.

IMPORTANT: You should ONLY use actions to play the game. Do NOT use text outputs - just take actions based on the game state.

Decision making priority:
1. If stat upgrades are available → use select_stat_upgrades (prioritize vitality early for survival)
2. If there's a beast → analyze combat stats and decide whether to attack or flee
3. If at market with gold → consider buying items/potions (prioritize health potions)
4. Otherwise → explore

Focus on survival:
- Prioritize vitality and defensive stats early
- Maintain health with potions
- Flee from beasts you can't defeat
- Equip better items when found
- Buy potions when health is low`,

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
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.explore(memory.gameId, tillBeast);
                
                // executeAction expects a forceResetAction callback
                const result = await systemCalls.executeAction([call], () => {
                    console.log("Action was reverted");
                });
                
                // The translated events contain all the game state updates
                if (result && result.length > 0) {
                    memory.history.push({ action: "explore", params: { tillBeast }, result });
                    
                    // Add a small delay to let UI update smoothly
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
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
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.attack(memory.gameId, toTheDeath);
                const result = await systemCalls.executeAction([call], () => {});
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "attack", params: { toTheDeath }, result });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
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
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.flee(memory.gameId, toTheDeath);
                const result = await systemCalls.executeAction([call], () => {});
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "flee", params: { toTheDeath }, result });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
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
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.equip(memory.gameId, items);
                const result = await systemCalls.executeAction([call], () => {});
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "equip", params: { items }, result });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
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
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.drop(memory.gameId, items);
                const result = await systemCalls.executeAction([call], () => {});
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "drop", params: { items }, result });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        }
    }),
    action({
        name: "buy_items",
        description: "Buy items from the market",
        schema: z.object({
            potions: z.number().default(0),
            items: z.array(z.object({
                item_id: z.number(),
                equip: z.boolean(),
            })).default([]),
        }),
        handler: async ({ potions, items }, ctx) => {
            const memory = ctx.memory as LootSurvivorMemory;
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.buyItems(memory.gameId, potions, items);
                const result = await systemCalls.executeAction([call], () => {});
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "buy_items", params: { potions, items }, result });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
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
            if (!memory.gameId) return { success: false, message: "No active game." };
            
            try {
                const call = systemCalls.selectStatUpgrades(memory.gameId, stats);
                const result = await systemCalls.executeAction([call], () => {});
                
                if (result && result.length > 0) {
                    memory.history.push({ action: "select_stat_upgrades", params: { stats }, result });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                return { success: true, result };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        }
    }),
];

// Create the agent
export const createLootSurvivorAgent = (systemCalls: SystemCalls) => {
    
    const gameStateInput = input({
        schema: z.object({
            type: 'game_state_update',
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

    // Add output definition
    const textOutput = output({
        schema: z.object({
            content: z.string(),
        }),
        handler: async (data, ctx) => {
            console.log("AI says:", data.content);
            return {
                data: data,
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