import { z } from 'zod';
import { GameDataClient, Adventurer, Item } from '../clients/gameData.js';
import { ITEMS, ITEM_SLOTS } from '../data/gameConstants.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

export interface Equipment {
  weapon?: Item;
  chest?: Item;
  head?: Item;
  waist?: Item;
  foot?: Item;
  hand?: Item;
  neck?: Item;
  ring?: Item;
}

export interface Stats {
  strength: number;
  dexterity: number;
  vitality: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export function createAdventurerTools(client: GameDataClient): Tool[] {
  return [
    {
      name: 'analyze_adventurer_equipment',
      description: 'Analyze an adventurer\'s equipment and provide recommendations',
      inputSchema: z.object({
        adventurerId: z.string().describe('The adventurer ID to analyze'),
      }),
      handler: async ({ adventurerId }) => {
        const adventurer = await client.getAdventurer(adventurerId);
        if (!adventurer) {
          return { error: 'Adventurer not found' };
        }

        // Mock equipment analysis (would need real equipment data from blockchain)
        const equipment: Equipment = {
          weapon: (await client.getItem(46)) || undefined, // Short Sword as example
          chest: (await client.getItem(51)) || undefined, // Leather Armor
          head: (await client.getItem(56)) || undefined, // Cap
          waist: (await client.getItem(61)) || undefined, // Leather Belt
          foot: (await client.getItem(66)) || undefined, // Leather Boots
          hand: (await client.getItem(71)) || undefined, // Leather Gloves
          neck: undefined,
          ring: undefined,
        };

        // Calculate total stats from equipment
        let totalArmor = 0;
        let totalDamage = 0;
        const equippedSlots: string[] = [];
        const emptySlots: string[] = [];

        for (const [slot, item] of Object.entries(equipment)) {
          if (item) {
            equippedSlots.push(slot);
            if (item.damage) totalDamage += item.damage;
            if (item.armor) totalArmor += item.armor;
          } else {
            emptySlots.push(slot);
          }
        }

        // Provide recommendations
        const recommendations: string[] = [];
        
        if (emptySlots.includes('neck')) {
          recommendations.push('Equip a necklace for magical bonuses');
        }
        if (emptySlots.includes('ring')) {
          recommendations.push('Equip a ring for stat bonuses');
        }
        if (totalArmor < 10) {
          recommendations.push('Consider upgrading armor pieces for better defense');
        }
        if (totalDamage < 5) {
          recommendations.push('Consider upgrading weapon for higher damage output');
        }

        return {
          adventurer: {
            id: adventurer.id,
            name: adventurer.name,
            level: adventurer.level,
            health: adventurer.health,
          },
          equipment: {
            equipped: equippedSlots,
            empty: emptySlots,
            totalArmor,
            totalDamage,
          },
          recommendations,
        };
      },
    },
    {
      name: 'calculate_stat_requirements',
      description: 'Calculate stat requirements for equipping specific items',
      inputSchema: z.object({
        itemId: z.number().describe('The item ID to check requirements for'),
        adventurerLevel: z.number().min(1).max(100).describe('Current adventurer level'),
      }),
      handler: async ({ itemId, adventurerLevel }) => {
        const item = await client.getItem(itemId);
        if (!item) {
          return { error: 'Item not found' };
        }

        // Calculate stat requirements based on item tier
        const baseRequirement = item.tier === 1 ? 10 : 
                               item.tier === 2 ? 8 : 
                               item.tier === 3 ? 6 : 
                               item.tier === 4 ? 4 : 2;

        const requirements: any = {
          itemName: item.name,
          itemTier: item.tier,
          levelRequirement: Math.max(1, (6 - item.tier) * 5),
          canEquip: adventurerLevel >= Math.max(1, (6 - item.tier) * 5),
        };

        // Different items require different primary stats
        if (item.type === 'Blade' || item.type === 'Bludgeon') {
          requirements.primaryStat = 'Strength';
          requirements.minStatValue = baseRequirement;
        } else if (item.type === 'Magic') {
          requirements.primaryStat = 'Intelligence';
          requirements.minStatValue = baseRequirement;
        } else if (item.type === 'Leather' || item.slot === 'Foot') {
          requirements.primaryStat = 'Dexterity';
          requirements.minStatValue = Math.floor(baseRequirement * 0.8);
        } else if (item.type === 'Metal') {
          requirements.primaryStat = 'Strength';
          requirements.minStatValue = baseRequirement;
        } else if (item.type === 'Cloth') {
          requirements.primaryStat = 'Intelligence';
          requirements.minStatValue = Math.floor(baseRequirement * 0.6);
        }

        return requirements;
      },
    },
    {
      name: 'optimize_stat_distribution',
      description: 'Suggest optimal stat distribution based on equipment and play style',
      inputSchema: z.object({
        adventurerLevel: z.number().min(1).max(100).describe('Current adventurer level'),
        playStyle: z.enum(['warrior', 'mage', 'ranger', 'balanced']).describe('Preferred play style'),
        currentStats: z.object({
          strength: z.number().min(0).max(31),
          dexterity: z.number().min(0).max(31),
          vitality: z.number().min(0).max(31),
          intelligence: z.number().min(0).max(31),
          wisdom: z.number().min(0).max(31),
          charisma: z.number().min(0).max(31),
        }).optional().describe('Current stat distribution'),
      }),
      handler: async ({ adventurerLevel, playStyle, currentStats }) => {
        const totalStatPoints = adventurerLevel - 1; // One stat point per level after 1
        const maxStatValue = 31;

        let recommendedStats: Stats;
        let statPriority: string[];

        switch (playStyle) {
          case 'warrior':
            recommendedStats = {
              strength: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.35)),
              vitality: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.25)),
              dexterity: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.15)),
              wisdom: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.10)),
              intelligence: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.10)),
              charisma: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.05)),
            };
            statPriority = ['Strength', 'Vitality', 'Dexterity', 'Wisdom', 'Intelligence', 'Charisma'];
            break;
          
          case 'mage':
            recommendedStats = {
              intelligence: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.35)),
              wisdom: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.25)),
              vitality: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.15)),
              charisma: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.10)),
              dexterity: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.10)),
              strength: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.05)),
            };
            statPriority = ['Intelligence', 'Wisdom', 'Vitality', 'Charisma', 'Dexterity', 'Strength'];
            break;
          
          case 'ranger':
            recommendedStats = {
              dexterity: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.35)),
              wisdom: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.20)),
              vitality: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.15)),
              strength: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.15)),
              intelligence: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.10)),
              charisma: Math.min(maxStatValue, Math.floor(totalStatPoints * 0.05)),
            };
            statPriority = ['Dexterity', 'Wisdom', 'Vitality', 'Strength', 'Intelligence', 'Charisma'];
            break;
          
          default: // balanced
            const perStat = Math.floor(totalStatPoints / 6);
            recommendedStats = {
              strength: Math.min(maxStatValue, perStat),
              dexterity: Math.min(maxStatValue, perStat),
              vitality: Math.min(maxStatValue, perStat),
              intelligence: Math.min(maxStatValue, perStat),
              wisdom: Math.min(maxStatValue, perStat),
              charisma: Math.min(maxStatValue, perStat),
            };
            statPriority = ['Vitality', 'Strength', 'Dexterity', 'Intelligence', 'Wisdom', 'Charisma'];
        }

        // Calculate adjustments needed if current stats provided
        let adjustments = null;
        if (currentStats) {
          adjustments = {
            strength: recommendedStats.strength - currentStats.strength,
            dexterity: recommendedStats.dexterity - currentStats.dexterity,
            vitality: recommendedStats.vitality - currentStats.vitality,
            intelligence: recommendedStats.intelligence - currentStats.intelligence,
            wisdom: recommendedStats.wisdom - currentStats.wisdom,
            charisma: recommendedStats.charisma - currentStats.charisma,
          };
        }

        return {
          playStyle,
          totalStatPoints,
          recommendedStats,
          statPriority,
          adjustments,
          tips: playStyle === 'warrior' ? 'Focus on Strength for damage and Vitality for survivability' :
                playStyle === 'mage' ? 'Prioritize Intelligence for spell damage and Wisdom for mana/cooldowns' :
                playStyle === 'ranger' ? 'Maximize Dexterity for accuracy and critical hits' :
                'Spread points evenly for versatility in all situations',
        };
      },
    },
    {
      name: 'calculate_adventurer_power',
      description: 'Calculate total power score and combat effectiveness',
      inputSchema: z.object({
        adventurerId: z.string().describe('The adventurer ID to analyze'),
      }),
      handler: async ({ adventurerId }) => {
        const adventurer = await client.getAdventurer(adventurerId);
        if (!adventurer) {
          return { error: 'Adventurer not found' };
        }

        // Base power calculations
        const levelPower = adventurer.level * 10;
        const healthPower = Math.floor(adventurer.health / 10);
        const xpPower = Math.floor(Math.sqrt(adventurer.xp));
        
        // Stat power (assuming base stats for now)
        const statPower = (adventurer.strength || 1) * 5 +
                         (adventurer.dexterity || 1) * 4 +
                         (adventurer.vitality || 1) * 6 +
                         (adventurer.intelligence || 1) * 4 +
                         (adventurer.wisdom || 1) * 3 +
                         (adventurer.charisma || 1) * 2;

        // Equipment power (mock data)
        const equipmentPower = 50; // Would calculate from actual equipment

        const totalPower = levelPower + healthPower + xpPower + statPower + equipmentPower;

        // Combat ratings
        const offensiveRating = Math.floor((levelPower + statPower) / 2);
        const defensiveRating = Math.floor((healthPower + equipmentPower) / 2);
        const utilityRating = Math.floor(xpPower / 2);

        return {
          adventurer: {
            id: adventurer.id,
            name: adventurer.name,
            level: adventurer.level,
          },
          powerBreakdown: {
            level: levelPower,
            health: healthPower,
            experience: xpPower,
            stats: statPower,
            equipment: equipmentPower,
            total: totalPower,
          },
          ratings: {
            offensive: offensiveRating,
            defensive: defensiveRating,
            utility: utilityRating,
            overall: Math.floor(totalPower / 10),
          },
          tier: totalPower > 500 ? 'Legendary' :
                totalPower > 300 ? 'Epic' :
                totalPower > 150 ? 'Rare' :
                totalPower > 50 ? 'Common' : 'Novice',
        };
      },
    },
  ];
}