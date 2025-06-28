import { z } from 'zod';
import { GameDataClient, Beast } from '../clients/gameData.js';
import { BEASTS, calculateBeastHealth } from '../data/gameConstants.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

interface CombatResult {
  winner: 'adventurer' | 'beast';
  rounds: number;
  damageDealt: number;
  damageTaken: number;
  criticalHits: number;
  fleeAttempts: number;
  goldReward?: number;
  xpReward?: number;
}

export function createCombatSimulationTools(client: GameDataClient): Tool[] {
  return [
    {
      name: 'simulate_combat',
      description: 'Simulate combat between an adventurer and a beast',
      inputSchema: z.object({
        adventurerStats: z.object({
          level: z.number().min(1).max(100),
          health: z.number().min(1).max(1023),
          strength: z.number().min(1).max(31),
          dexterity: z.number().min(1).max(31),
          vitality: z.number().min(1).max(31),
          intelligence: z.number().min(1).max(31),
          wisdom: z.number().min(1).max(31),
          weaponDamage: z.number().min(0).max(50),
          armor: z.number().min(0).max(50),
        }).describe('Adventurer combat stats'),
        beastId: z.number().min(1).max(75).describe('Beast ID to fight'),
        beastLevel: z.number().min(1).max(100).optional().default(1).describe('Beast level'),
      }),
      handler: async ({ adventurerStats, beastId, beastLevel }) => {
        const beast = await client.getBeast(beastId, beastLevel);
        if (!beast) {
          return { error: 'Beast not found' };
        }

        // Simple combat simulation
        let adventurerHealth = adventurerStats.health;
        let beastHealth = beast.health;
        let rounds = 0;
        let damageDealt = 0;
        let damageTaken = 0;
        let criticalHits = 0;

        // Calculate base values
        const adventurerDamage = adventurerStats.strength + adventurerStats.weaponDamage;
        const beastDamage = Math.max(2, beast.tier * 3 + Math.floor(beastLevel / 5));
        const criticalChance = Math.min(30, adventurerStats.dexterity);
        const dodgeChance = Math.min(20, adventurerStats.dexterity / 2);

        // Simulate combat rounds
        while (adventurerHealth > 0 && beastHealth > 0 && rounds < 50) {
          rounds++;

          // Adventurer attacks
          let attackDamage = adventurerDamage;
          if (Math.random() * 100 < criticalChance) {
            attackDamage = Math.floor(attackDamage * 1.5);
            criticalHits++;
          }
          beastHealth -= attackDamage;
          damageDealt += attackDamage;

          // Beast counter-attacks if still alive
          if (beastHealth > 0) {
            if (Math.random() * 100 >= dodgeChance) {
              const effectiveDamage = Math.max(1, beastDamage - adventurerStats.armor);
              adventurerHealth -= effectiveDamage;
              damageTaken += effectiveDamage;
            }
          }
        }

        const winner = adventurerHealth > 0 ? 'adventurer' : 'beast';
        
        return {
          combat: {
            winner,
            rounds,
            damageDealt,
            damageTaken,
            criticalHits,
            fleeAttempts: 0,
          },
          adventurer: {
            startHealth: adventurerStats.health,
            endHealth: Math.max(0, adventurerHealth),
            damage: adventurerDamage,
            criticalChance: `${criticalChance}%`,
            dodgeChance: `${dodgeChance}%`,
          },
          beast: {
            name: beast.name,
            tier: beast.tier,
            level: beast.level,
            startHealth: beast.health,
            endHealth: Math.max(0, beastHealth),
            damage: beastDamage,
          },
          rewards: winner === 'adventurer' ? {
            gold: beast.goldReward,
            xp: Math.floor(beast.tier * 10 * (1 + beastLevel / 10)),
          } : null,
        };
      },
    },
    {
      name: 'calculate_combat_outcome_probability',
      description: 'Calculate probability of winning against a specific beast',
      inputSchema: z.object({
        adventurerStats: z.object({
          level: z.number().min(1).max(100),
          health: z.number().min(1).max(1023),
          strength: z.number().min(1).max(31),
          dexterity: z.number().min(1).max(31),
          weaponDamage: z.number().min(0).max(50),
          armor: z.number().min(0).max(50),
        }).describe('Adventurer combat stats'),
        beastId: z.number().min(1).max(75).describe('Beast ID to analyze'),
        beastLevel: z.number().min(1).max(100).optional().default(1).describe('Beast level'),
        simulations: z.number().min(10).max(1000).optional().default(100).describe('Number of simulations to run'),
      }),
      handler: async ({ adventurerStats, beastId, beastLevel, simulations }) => {
        const beast = await client.getBeast(beastId, beastLevel);
        if (!beast) {
          return { error: 'Beast not found' };
        }

        let wins = 0;
        let totalRounds = 0;
        let totalDamageDealt = 0;
        let totalDamageTaken = 0;

        // Run multiple simulations
        for (let i = 0; i < simulations; i++) {
          let adventurerHealth = adventurerStats.health;
          let beastHealth = beast.health;
          let rounds = 0;
          let damageDealt = 0;
          let damageTaken = 0;

          const adventurerDamage = adventurerStats.strength + adventurerStats.weaponDamage;
          const beastDamage = Math.max(2, beast.tier * 3 + Math.floor(beastLevel / 5));
          const criticalChance = Math.min(30, adventurerStats.dexterity);
          const dodgeChance = Math.min(20, adventurerStats.dexterity / 2);

          while (adventurerHealth > 0 && beastHealth > 0 && rounds < 50) {
            rounds++;

            // Adventurer attacks
            let attackDamage = adventurerDamage;
            if (Math.random() * 100 < criticalChance) {
              attackDamage = Math.floor(attackDamage * 1.5);
            }
            beastHealth -= attackDamage;
            damageDealt += attackDamage;

            // Beast counter-attacks
            if (beastHealth > 0 && Math.random() * 100 >= dodgeChance) {
              const effectiveDamage = Math.max(1, beastDamage - adventurerStats.armor);
              adventurerHealth -= effectiveDamage;
              damageTaken += effectiveDamage;
            }
          }

          if (adventurerHealth > 0) wins++;
          totalRounds += rounds;
          totalDamageDealt += damageDealt;
          totalDamageTaken += damageTaken;
        }

        const winRate = (wins / simulations) * 100;
        const avgRounds = totalRounds / simulations;
        const avgDamageDealt = totalDamageDealt / simulations;
        const avgDamageTaken = totalDamageTaken / simulations;

        return {
          beast: {
            name: beast.name,
            tier: beast.tier,
            level: beast.level,
            health: beast.health,
          },
          probability: {
            winRate: `${winRate.toFixed(1)}%`,
            wins,
            losses: simulations - wins,
            simulations,
          },
          averages: {
            rounds: Math.round(avgRounds),
            damageDealt: Math.round(avgDamageDealt),
            damageTaken: Math.round(avgDamageTaken),
            healthRemaining: Math.round(adventurerStats.health - avgDamageTaken),
          },
          recommendation: winRate >= 90 ? 'Easy fight - very safe' :
                         winRate >= 70 ? 'Good odds - recommended' :
                         winRate >= 50 ? 'Risky - prepare well' :
                         winRate >= 30 ? 'Dangerous - consider fleeing' :
                         'Extremely dangerous - avoid!',
        };
      },
    },
    {
      name: 'find_optimal_beasts',
      description: 'Find the best beasts to fight based on adventurer stats',
      inputSchema: z.object({
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
        adventurerTier: z.number().min(1).max(5).optional().describe('Preferred beast tier'),
        riskTolerance: z.enum(['safe', 'moderate', 'risky']).optional().default('moderate'),
      }),
      handler: async ({ adventurerLevel, adventurerTier, riskTolerance }) => {
        const levelRange = riskTolerance === 'safe' ? 5 :
                          riskTolerance === 'moderate' ? 10 : 15;

        const minLevel = Math.max(1, adventurerLevel - levelRange);
        const maxLevel = adventurerLevel + Math.floor(levelRange / 2);

        // Filter beasts by tier if specified
        let beasts = BEASTS;
        if (adventurerTier) {
          beasts = beasts.filter(b => b.tier === adventurerTier);
        }

        // Calculate optimal beasts
        const recommendations = beasts.map(beast => {
          const optimalLevel = Math.max(minLevel, Math.min(maxLevel, adventurerLevel));
          const health = calculateBeastHealth(beast.tier, optimalLevel);
          
          // Score based on risk/reward
          const difficulty = beast.tier + (optimalLevel / 20);
          const reward = beast.tier * 10 + optimalLevel;
          const efficiency = reward / difficulty;

          return {
            beast: {
              id: beast.id,
              name: beast.name,
              tier: beast.tier,
              type: beast.type,
            },
            recommendedLevel: optimalLevel,
            health,
            difficulty: difficulty.toFixed(1),
            expectedReward: Math.floor(reward),
            efficiency: efficiency.toFixed(2),
          };
        });

        // Sort by efficiency
        recommendations.sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));

        return {
          adventurerLevel,
          riskTolerance,
          levelRange: `${minLevel}-${maxLevel}`,
          topRecommendations: recommendations.slice(0, 10),
          byType: {
            magical: recommendations.filter(r => r.beast.type === 'Magical').slice(0, 3),
            hunter: recommendations.filter(r => r.beast.type === 'Hunter').slice(0, 3),
            brute: recommendations.filter(r => r.beast.type === 'Brute').slice(0, 3),
          },
        };
      },
    },
    {
      name: 'analyze_elemental_matchups',
      description: 'Analyze elemental advantages for combat planning',
      inputSchema: z.object({
        weaponType: z.enum(['Blade', 'Bludgeon', 'Magic']).describe('Your weapon type'),
        targetBeastTypes: z.array(z.enum(['Magical', 'Hunter', 'Brute'])).optional()
          .describe('Beast types to analyze against'),
      }),
      handler: async ({ weaponType, targetBeastTypes }) => {
        const beastTypes = targetBeastTypes || ['Magical', 'Hunter', 'Brute'];
        
        // Define elemental advantages (based on game logic)
        const advantages: Record<string, Record<string, number>> = {
          Blade: { Magical: 1.2, Hunter: 1.0, Brute: 0.8 },
          Bludgeon: { Magical: 0.8, Hunter: 1.2, Brute: 1.0 },
          Magic: { Magical: 1.0, Hunter: 0.8, Brute: 1.2 },
        };

        const matchups = beastTypes.map((beastType: string) => {
          const multiplier = advantages[weaponType][beastType];
          const effectiveness = multiplier > 1 ? 'Strong' :
                               multiplier < 1 ? 'Weak' : 'Neutral';

          // Get example beasts of this type
          const exampleBeasts = BEASTS
            .filter(b => b.type === beastType)
            .slice(0, 5)
            .map(b => ({ id: b.id, name: b.name, tier: b.tier }));

          return {
            beastType,
            damageMultiplier: multiplier,
            effectiveness,
            recommendation: multiplier > 1 ? 'Prioritize these fights' :
                           multiplier < 1 ? 'Avoid if possible' :
                           'Standard combat approach',
            exampleBeasts,
          };
        });

        // Sort by effectiveness
        matchups.sort((a: any, b: any) => b.damageMultiplier - a.damageMultiplier);

        return {
          weaponType,
          matchups,
          summary: {
            strongAgainst: matchups.filter((m: any) => m.effectiveness === 'Strong').map((m: any) => m.beastType),
            weakAgainst: matchups.filter((m: any) => m.effectiveness === 'Weak').map((m: any) => m.beastType),
            neutralAgainst: matchups.filter((m: any) => m.effectiveness === 'Neutral').map((m: any) => m.beastType),
          },
          tips: weaponType === 'Blade' ? 'Blades are effective against magical creatures but struggle against heavily armored brutes' :
                weaponType === 'Bludgeon' ? 'Bludgeons crush through hunter defenses but are resisted by magical barriers' :
                'Magic pierces brute defenses but is countered by agile hunters',
        };
      },
    },
  ];
}