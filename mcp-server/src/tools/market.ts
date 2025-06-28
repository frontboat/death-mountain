import { z } from 'zod';
import { GameDataClient } from '../clients/gameData.js';
import { ITEMS } from '../data/gameConstants.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

const TIER_BASE_PRICES = {
  1: 100,
  2: 60,
  3: 36,
  4: 24,
  5: 12,
};

const ITEMS_PER_LEVEL = 20;

export function createMarketTools(client: GameDataClient): Tool[] {
  return [
    {
      name: 'get_market_inventory',
      description: 'Get available items in the market based on adventurer level and seed',
      inputSchema: z.object({
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
        marketSeed: z.number().optional().describe('Market seed for deterministic inventory'),
      }),
      handler: async ({ adventurerLevel, marketSeed }) => {
        // Use provided seed or generate based on level
        const seed = marketSeed || (adventurerLevel * 12345);
        
        // Generate market inventory
        const marketSize = Math.min(ITEMS_PER_LEVEL, ITEMS.length);
        const inventory: any[] = [];
        const usedIds = new Set<number>();

        // Simple deterministic selection based on seed
        for (let i = 0; i < marketSize; i++) {
          const itemIndex = (seed * (i + 1) * 7919) % ITEMS.length;
          const item = ITEMS[itemIndex];
          
          if (!usedIds.has(item.id)) {
            usedIds.add(item.id);
            const basePrice = TIER_BASE_PRICES[item.tier as keyof typeof TIER_BASE_PRICES];
            
            // Price adjustments
            const levelAdjustment = 1 + (adventurerLevel / 100);
            const slotMultiplier = item.slot === 'Weapon' ? 1.2 :
                                  item.slot === 'Chest' ? 1.1 :
                                  item.slot === 'Ring' || item.slot === 'Neck' ? 1.5 : 1.0;
            
            const finalPrice = Math.floor(basePrice * levelAdjustment * slotMultiplier);
            
            inventory.push({
              ...item,
              basePrice,
              finalPrice,
              discount: item.tier === 5 ? '20% (common item)' : 
                       item.tier === 1 ? '-20% (rare item)' : null,
            });
          }
        }

        // Sort by tier and price
        inventory.sort((a, b) => a.tier - b.tier || b.finalPrice - a.finalPrice);

        return {
          marketSeed: seed,
          adventurerLevel,
          itemCount: inventory.length,
          inventory: inventory.slice(0, 20), // Limit to 20 items
          priceRange: {
            min: Math.min(...inventory.map(i => i.finalPrice)),
            max: Math.max(...inventory.map(i => i.finalPrice)),
          },
        };
      },
    },
    {
      name: 'calculate_item_value',
      description: 'Calculate the value and cost-effectiveness of an item',
      inputSchema: z.object({
        itemId: z.number().describe('Item ID to evaluate'),
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
        currentGold: z.number().optional().describe('Current gold to check affordability'),
        charismaBonus: z.number().min(0).max(31).optional().default(0).describe('Charisma stat for discount'),
      }),
      handler: async ({ itemId, adventurerLevel, currentGold, charismaBonus }) => {
        const item = await client.getItem(itemId);
        if (!item) {
          return { error: 'Item not found' };
        }

        const basePrice = TIER_BASE_PRICES[item.tier as keyof typeof TIER_BASE_PRICES];
        const levelAdjustment = 1 + (adventurerLevel / 100);
        const slotMultiplier = item.slot === 'Weapon' ? 1.2 :
                              item.slot === 'Chest' ? 1.1 :
                              item.slot === 'Ring' || item.slot === 'Neck' ? 1.5 : 1.0;
        
        // Charisma discount
        const charismaDiscount = Math.min(charismaBonus * 0.01, 0.25); // Max 25% discount
        const discountMultiplier = 1 - charismaDiscount;
        
        const finalPrice = Math.floor(basePrice * levelAdjustment * slotMultiplier * discountMultiplier);
        
        // Calculate value score
        const statValue = (item.damage || 0) * 3 + (item.armor || 0) * 2;
        const tierValue = (6 - item.tier) * 10;
        const totalValue = statValue + tierValue;
        const valueRatio = totalValue / finalPrice;

        const evaluation: any = {
          item: {
            id: item.id,
            name: item.name,
            tier: item.tier,
            type: item.type,
            slot: item.slot,
            damage: item.damage,
            armor: item.armor,
          },
          pricing: {
            basePrice,
            levelAdjustment: `${(levelAdjustment * 100 - 100).toFixed(0)}%`,
            slotMultiplier: `x${slotMultiplier}`,
            charismaDiscount: `${(charismaDiscount * 100).toFixed(0)}%`,
            finalPrice,
          },
          value: {
            statValue,
            tierValue,
            totalValue,
            valueRatio: valueRatio.toFixed(2),
            rating: valueRatio > 2 ? 'Excellent value' :
                   valueRatio > 1.5 ? 'Good value' :
                   valueRatio > 1 ? 'Fair value' :
                   valueRatio > 0.5 ? 'Poor value' : 'Terrible value',
          },
        };

        if (currentGold !== undefined) {
          evaluation.affordability = {
            canAfford: currentGold >= finalPrice,
            goldNeeded: Math.max(0, finalPrice - currentGold),
            goldRemaining: Math.max(0, currentGold - finalPrice),
          };
        }

        return evaluation;
      },
    },
    {
      name: 'find_best_deals',
      description: 'Find the best value items in the current market',
      inputSchema: z.object({
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
        marketSeed: z.number().optional().describe('Market seed'),
        budget: z.number().optional().describe('Maximum gold to spend'),
        itemType: z.enum(['Weapon', 'Armor', 'Jewelry', 'Any']).optional().default('Any'),
        minTier: z.number().min(1).max(5).optional().describe('Minimum item tier'),
      }),
      handler: async ({ adventurerLevel, marketSeed, budget, itemType, minTier }) => {
        // Get market inventory
        const seed = marketSeed || (adventurerLevel * 12345);
        const marketSize = Math.min(ITEMS_PER_LEVEL, ITEMS.length);
        const deals: any[] = [];

        for (let i = 0; i < marketSize; i++) {
          const itemIndex = (seed * (i + 1) * 7919) % ITEMS.length;
          const item = ITEMS[itemIndex];
          
          // Filter by type and tier
          if (minTier && item.tier > minTier) continue;
          if (itemType !== 'Any') {
            if (itemType === 'Weapon' && !['Blade', 'Bludgeon', 'Magic'].includes(item.type)) continue;
            if (itemType === 'Armor' && !['Metal', 'Leather', 'Cloth'].includes(item.type)) continue;
            if (itemType === 'Jewelry' && item.type !== 'Jewelry') continue;
          }

          const basePrice = TIER_BASE_PRICES[item.tier as keyof typeof TIER_BASE_PRICES];
          const levelAdjustment = 1 + (adventurerLevel / 100);
          const slotMultiplier = item.slot === 'Weapon' ? 1.2 :
                                item.slot === 'Chest' ? 1.1 :
                                item.slot === 'Ring' || item.slot === 'Neck' ? 1.5 : 1.0;
          
          const finalPrice = Math.floor(basePrice * levelAdjustment * slotMultiplier);
          
          if (budget && finalPrice > budget) continue;

          // Add damage/armor values
          const enrichedItem = await client.getItem(item.id);
          if (!enrichedItem) continue;

          const statValue = (enrichedItem.damage || 0) * 3 + (enrichedItem.armor || 0) * 2;
          const tierValue = (6 - item.tier) * 10;
          const totalValue = statValue + tierValue;
          const valueRatio = totalValue / finalPrice;

          deals.push({
            ...enrichedItem,
            finalPrice,
            valueScore: valueRatio.toFixed(2),
            recommendation: valueRatio > 2 ? '🌟 Must buy!' :
                           valueRatio > 1.5 ? '✅ Recommended' :
                           valueRatio > 1 ? '👍 Consider' : '❌ Skip',
          });
        }

        // Sort by value ratio
        deals.sort((a, b) => parseFloat(b.valueScore) - parseFloat(a.valueScore));

        return {
          marketSeed: seed,
          settings: {
            adventurerLevel,
            budget: budget || 'Unlimited',
            itemType,
            minTier: minTier || 'Any',
          },
          topDeals: deals.slice(0, 10),
          bySlot: {
            weapons: deals.filter(d => d.slot === 'Weapon').slice(0, 3),
            armor: deals.filter(d => ['Chest', 'Head', 'Waist', 'Foot', 'Hand'].includes(d.slot)).slice(0, 5),
            jewelry: deals.filter(d => ['Ring', 'Neck'].includes(d.slot)).slice(0, 2),
          },
        };
      },
    },
    {
      name: 'calculate_potion_cost',
      description: 'Calculate the cost of health potions with charisma discount',
      inputSchema: z.object({
        potionCount: z.number().min(1).max(100).describe('Number of potions to buy'),
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
        charisma: z.number().min(0).max(31).optional().default(0).describe('Charisma stat'),
        currentGold: z.number().optional().describe('Current gold'),
      }),
      handler: async ({ potionCount, adventurerLevel, charisma, currentGold }) => {
        const basePotionPrice = 2; // Base price per potion
        const levelMultiplier = 1 + (adventurerLevel / 50); // Increases with level
        
        // Charisma provides discount on potions
        const charismaDiscount = Math.min(charisma * 0.02, 0.5); // 2% per point, max 50%
        const discountMultiplier = 1 - charismaDiscount;
        
        const pricePerPotion = Math.max(1, Math.floor(basePotionPrice * levelMultiplier * discountMultiplier));
        const totalCost = pricePerPotion * potionCount;
        
        // Health restored per potion (scales with level)
        const healthPerPotion = 10 + Math.floor(adventurerLevel / 5);
        const totalHealthRestored = healthPerPotion * potionCount;

        const result: any = {
          potions: {
            count: potionCount,
            pricePerPotion,
            totalCost,
            healthPerPotion,
            totalHealthRestored,
          },
          discounts: {
            basePrice: basePotionPrice,
            levelMultiplier: `x${levelMultiplier.toFixed(1)}`,
            charismaDiscount: `${(charismaDiscount * 100).toFixed(0)}%`,
            savedAmount: Math.floor(basePotionPrice * levelMultiplier * potionCount) - totalCost,
          },
          efficiency: {
            goldPerHealth: (totalCost / totalHealthRestored).toFixed(2),
            recommendation: pricePerPotion <= 3 ? 'Stock up - great price!' :
                           pricePerPotion <= 5 ? 'Fair price' :
                           'Expensive - buy only if needed',
          },
        };

        if (currentGold !== undefined) {
          result.affordability = {
            canAfford: currentGold >= totalCost,
            maxPotions: Math.floor(currentGold / pricePerPotion),
            goldRemaining: Math.max(0, currentGold - totalCost),
          };
        }

        return result;
      },
    },
  ];
}