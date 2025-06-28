import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

export function createGameMechanicsTools(): Tool[] {
  return [
    {
      name: 'calculate_damage',
      description: 'Calculate combat damage based on attacker stats and weapon',
      inputSchema: z.object({
        attackerStrength: z.number().describe('Attacker strength stat'),
        weaponDamage: z.number().describe('Weapon base damage'),
        targetArmor: z.number().optional().default(0).describe('Target armor value'),
        isCritical: z.boolean().optional().default(false).describe('Whether this is a critical hit'),
      }),
      handler: async ({ attackerStrength, weaponDamage, targetArmor, isCritical }) => {
        // Basic damage formula based on Loot Survivor mechanics
        let damage = attackerStrength + weaponDamage;
        
        if (isCritical) {
          damage = Math.floor(damage * 1.5);
        }
        
        // Apply armor reduction
        const finalDamage = Math.max(1, damage - targetArmor);
        
        return {
          baseDamage: attackerStrength + weaponDamage,
          criticalMultiplier: isCritical ? 1.5 : 1,
          armorReduction: targetArmor,
          finalDamage,
        };
      },
    },
    {
      name: 'calculate_xp_reward',
      description: 'Calculate XP reward for defeating a beast',
      inputSchema: z.object({
        beastLevel: z.number().describe('Level of the defeated beast'),
        beastTier: z.number().min(1).max(5).describe('Tier of the beast (1-5)'),
        adventurerLevel: z.number().describe('Level of the adventurer'),
      }),
      handler: async ({ beastLevel, beastTier, adventurerLevel }) => {
        // XP calculation based on beast tier and level difference
        const baseXp = beastTier * 10;
        const levelDifference = beastLevel - adventurerLevel;
        const levelMultiplier = Math.max(0.5, Math.min(2, 1 + (levelDifference * 0.1)));
        
        const finalXp = Math.floor(baseXp * levelMultiplier);
        
        return {
          baseXp,
          levelDifference,
          levelMultiplier,
          finalXp,
        };
      },
    },
    {
      name: 'calculate_flee_chance',
      description: 'Calculate chance of successfully fleeing from combat',
      inputSchema: z.object({
        adventurerDexterity: z.number().describe('Adventurer dexterity stat'),
        adventurerLevel: z.number().describe('Adventurer level'),
        beastLevel: z.number().describe('Beast level'),
      }),
      handler: async ({ adventurerDexterity, adventurerLevel, beastLevel }) => {
        // Base flee chance influenced by dexterity
        const baseFlee = 20 + (adventurerDexterity * 2);
        
        // Level difference modifier
        const levelDiff = adventurerLevel - beastLevel;
        const levelModifier = levelDiff * 5;
        
        const fleeChance = Math.max(5, Math.min(95, baseFlee + levelModifier));
        
        return {
          baseFlee,
          levelModifier,
          fleeChance,
          fleeChancePercent: `${fleeChance}%`,
        };
      },
    },
    {
      name: 'calculate_stat_upgrade_cost',
      description: 'Calculate the cost or requirements for upgrading a stat',
      inputSchema: z.object({
        currentLevel: z.number().describe('Current adventurer level'),
        statUpgradesUsed: z.number().describe('Number of stat upgrades already used'),
      }),
      handler: async ({ currentLevel, statUpgradesUsed }) => {
        // In Loot Survivor, you get stat upgrades on level up
        const totalUpgradesEarned = currentLevel - 1; // One upgrade per level after 1
        const upgradesAvailable = totalUpgradesEarned - statUpgradesUsed;
        
        return {
          currentLevel,
          totalUpgradesEarned,
          upgradesUsed: statUpgradesUsed,
          upgradesAvailable,
          nextUpgradeAtLevel: currentLevel + 1,
        };
      },
    },
    {
      name: 'calculate_market_price',
      description: 'Calculate dynamic market price for an item',
      inputSchema: z.object({
        itemTier: z.number().min(1).max(5).describe('Item tier (1-5)'),
        itemType: z.enum(['Weapon', 'Armor', 'Shield', 'Ring', 'Amulet']).describe('Type of item'),
        currentGold: z.number().optional().describe('Adventurer current gold (for affordability check)'),
      }),
      handler: async ({ itemTier, itemType, currentGold }) => {
        // Base prices by tier
        const tierPrices = {
          1: 10,
          2: 25,
          3: 50,
          4: 100,
          5: 250,
        };
        
        // Type multipliers
        const typeMultipliers = {
          Weapon: 1.2,
          Armor: 1.0,
          Shield: 0.8,
          Ring: 1.5,
          Amulet: 1.5,
        };
        
        const basePrice = tierPrices[itemTier as keyof typeof tierPrices] || 10;
        const multiplier = typeMultipliers[itemType as keyof typeof typeMultipliers] || 1;
        const finalPrice = Math.floor(basePrice * multiplier);
        
        const result: any = {
          itemTier,
          itemType,
          basePrice,
          typeMultiplier: multiplier,
          finalPrice,
        };
        
        if (currentGold !== undefined) {
          result.canAfford = currentGold >= finalPrice;
          result.goldNeeded = Math.max(0, finalPrice - currentGold);
        }
        
        return result;
      },
    },
  ];
}