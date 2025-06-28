import { z } from 'zod';
import { GameDataClient } from '../clients/gameData.js';
import { BEASTS, OBSTACLES } from '../data/gameConstants.js';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (args: any) => Promise<any>;
}

type ExploreResult = 'Beast' | 'Obstacle' | 'Discovery';
type DiscoveryType = 'Gold' | 'Health' | 'Loot';

interface ExplorationOutcome {
  result: ExploreResult;
  details: any;
  rewards?: any;
  damage?: number;
}

export function createExplorationTools(client: GameDataClient): Tool[] {
  return [
    {
      name: 'simulate_exploration',
      description: 'Simulate exploration outcomes based on adventurer stats and level',
      inputSchema: z.object({
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
        wisdom: z.number().min(0).max(31).optional().default(0).describe('Wisdom stat (affects discovery chance)'),
        intelligence: z.number().min(0).max(31).optional().default(0).describe('Intelligence stat (affects obstacle avoidance)'),
        explorationSeed: z.number().optional().describe('Seed for deterministic exploration'),
      }),
      handler: async ({ adventurerLevel, wisdom, intelligence, explorationSeed }) => {
        const seed = explorationSeed || Date.now();
        
        // Calculate probabilities based on stats
        const discoveryChance = 15 + wisdom; // Base 15% + wisdom%
        const obstacleAvoidance = intelligence * 2; // 2% per intelligence point
        
        // Determine exploration result
        const roll = (seed % 100) + 1;
        let result: ExploreResult;
        let outcome: ExplorationOutcome;

        if (roll <= discoveryChance) {
          // Discovery!
          result = 'Discovery';
          const discoveryRoll = (seed * 7) % 100;
          let discoveryType: DiscoveryType;
          let reward: any;

          if (discoveryRoll < 40) {
            // Gold discovery
            discoveryType = 'Gold';
            const baseGold = 10 + adventurerLevel * 2;
            const bonusGold = Math.floor(Math.random() * adventurerLevel);
            reward = {
              type: 'Gold',
              amount: baseGold + bonusGold,
              bonus: wisdom > 15 ? Math.floor((baseGold + bonusGold) * 0.2) : 0,
            };
          } else if (discoveryRoll < 70) {
            // Health discovery
            discoveryType = 'Health';
            const healthAmount = 5 + Math.floor(adventurerLevel / 2);
            reward = {
              type: 'Health',
              amount: healthAmount,
              instantHeal: true,
            };
          } else {
            // Loot discovery
            discoveryType = 'Loot';
            const lootTier = Math.max(1, Math.min(5, 6 - Math.ceil(adventurerLevel / 20)));
            const possibleItems = await client.searchItems({ tier: lootTier });
            const lootItem = possibleItems[seed % possibleItems.length];
            reward = {
              type: 'Loot',
              item: lootItem,
              rarity: lootTier === 1 ? 'Legendary' :
                      lootTier === 2 ? 'Epic' :
                      lootTier === 3 ? 'Rare' :
                      lootTier === 4 ? 'Uncommon' : 'Common',
            };
          }

          outcome = {
            result,
            details: {
              discoveryType,
              wisdomBonus: wisdom > 10 ? 'Increased discovery rewards' : null,
            },
            rewards: reward,
          };
        } else if (roll <= 50) {
          // Obstacle encounter
          result = 'Obstacle';
          const obstacleIndex = (seed * 13) % OBSTACLES.length;
          const obstacle = OBSTACLES[obstacleIndex];
          const obstacleData = await client.getObstacle(obstacle.id, adventurerLevel);
          
          // Check if avoided
          const avoidRoll = (seed * 17) % 100;
          const avoided = avoidRoll < obstacleAvoidance;
          
          outcome = {
            result,
            details: {
              obstacle: obstacleData,
              avoided,
              avoidanceChance: `${obstacleAvoidance}%`,
              statUsed: obstacleData?.avoidStat,
            },
            damage: avoided ? 0 : obstacleData?.damage,
          };
        } else {
          // Beast encounter
          result = 'Beast';
          const beastIndex = (seed * 19) % BEASTS.length;
          const beast = BEASTS[beastIndex];
          const beastLevel = Math.max(1, adventurerLevel + Math.floor((seed % 11) - 5));
          const beastData = await client.getBeast(beast.id, beastLevel);
          
          outcome = {
            result,
            details: {
              beast: beastData,
              ambush: roll > 90, // 10% chance of ambush
              fleeChance: `${Math.min(50, 20 + wisdom)}%`,
            },
          };
        }

        return {
          exploration: {
            seed,
            adventurerLevel,
            stats: { wisdom, intelligence },
          },
          outcome,
          probabilities: {
            discovery: `${discoveryChance}%`,
            obstacle: '35%',
            beast: `${65 - discoveryChance}%`,
          },
        };
      },
    },
    {
      name: 'calculate_exploration_probabilities',
      description: 'Calculate exact probabilities for different exploration outcomes',
      inputSchema: z.object({
        wisdom: z.number().min(0).max(31).describe('Wisdom stat'),
        intelligence: z.number().min(0).max(31).describe('Intelligence stat'),
        adventurerLevel: z.number().min(1).max(100).describe('Adventurer level'),
      }),
      handler: async ({ wisdom, intelligence, adventurerLevel }) => {
        // Base probabilities
        const baseDiscoveryChance = 15;
        const baseObstacleChance = 35;
        const baseBeastChance = 50;

        // Stat modifiers
        const discoveryBonus = wisdom; // +1% per wisdom
        const obstacleAvoidance = intelligence * 2; // 2% per intelligence

        // Adjusted probabilities
        const discoveryChance = baseDiscoveryChance + discoveryBonus;
        const obstacleChance = baseObstacleChance; // Doesn't change encounter rate
        const beastChance = 100 - discoveryChance - obstacleChance;

        // Discovery sub-probabilities
        const goldChance = discoveryChance * 0.4;
        const healthChance = discoveryChance * 0.3;
        const lootChance = discoveryChance * 0.3;

        // Expected rewards
        const avgGoldPerDiscovery = 10 + adventurerLevel * 2;
        const avgHealthPerDiscovery = 5 + Math.floor(adventurerLevel / 2);
        const expectedGoldPerExplore = (goldChance / 100) * avgGoldPerDiscovery;
        const expectedHealthPerExplore = (healthChance / 100) * avgHealthPerDiscovery;

        // Danger assessment
        const avgObstacleDamage = 5 + Math.floor(adventurerLevel / 3);
        const obstacleHitChance = (100 - obstacleAvoidance) / 100;
        const expectedDamagePerExplore = (obstacleChance / 100) * obstacleHitChance * avgObstacleDamage;

        return {
          probabilities: {
            discovery: {
              total: `${discoveryChance}%`,
              gold: `${goldChance.toFixed(1)}%`,
              health: `${healthChance.toFixed(1)}%`,
              loot: `${lootChance.toFixed(1)}%`,
            },
            obstacle: {
              encounter: `${obstacleChance}%`,
              avoidance: `${obstacleAvoidance}%`,
              damage: `${(100 - obstacleAvoidance)}%`,
            },
            beast: `${beastChance}%`,
          },
          expectedValues: {
            goldPerExplore: expectedGoldPerExplore.toFixed(1),
            healthPerExplore: expectedHealthPerExplore.toFixed(1),
            damagePerExplore: expectedDamagePerExplore.toFixed(1),
            netHealthPerExplore: (expectedHealthPerExplore - expectedDamagePerExplore).toFixed(1),
          },
          recommendations: {
            exploration: expectedDamagePerExplore < expectedHealthPerExplore ? 
              'Safe to explore - net positive health' : 
              'Risky - expect net health loss',
            statPriority: wisdom < 15 ? 'Increase Wisdom for better discoveries' :
                         intelligence < 15 ? 'Increase Intelligence to avoid damage' :
                         'Well-balanced stats for exploration',
          },
        };
      },
    },
    {
      name: 'find_optimal_exploration_strategy',
      description: 'Determine the best exploration strategy based on current stats',
      inputSchema: z.object({
        adventurerStats: z.object({
          level: z.number().min(1).max(100),
          health: z.number().min(1).max(1023),
          gold: z.number().min(0).max(511),
          wisdom: z.number().min(0).max(31),
          intelligence: z.number().min(0).max(31),
          vitality: z.number().min(0).max(31),
        }).describe('Current adventurer stats'),
        riskTolerance: z.enum(['conservative', 'balanced', 'aggressive']).optional().default('balanced'),
      }),
      handler: async ({ adventurerStats, riskTolerance }) => {
        const { level, health, gold, wisdom, intelligence, vitality } = adventurerStats;

        // Calculate exploration metrics
        const discoveryChance = 15 + wisdom;
        const obstacleAvoidance = intelligence * 2;
        const maxHealth = 100 + (vitality * 10);
        const healthPercent = (health / maxHealth) * 100;

        // Strategy recommendations based on stats and risk
        let strategy: any = {
          shouldExplore: true,
          explorationRate: 'normal',
          focusOn: '',
          reasoning: '',
        };

        if (riskTolerance === 'conservative') {
          strategy.shouldExplore = healthPercent > 50;
          strategy.explorationRate = healthPercent > 75 ? 'normal' : 'cautious';
          strategy.focusOn = gold < 50 ? 'discoveries' : 'safety';
          strategy.reasoning = 'Conservative approach prioritizes survival';
        } else if (riskTolerance === 'aggressive') {
          strategy.shouldExplore = healthPercent > 20;
          strategy.explorationRate = 'aggressive';
          strategy.focusOn = 'discoveries and combat';
          strategy.reasoning = 'Aggressive approach maximizes rewards despite risks';
        } else {
          // Balanced
          strategy.shouldExplore = healthPercent > 35;
          strategy.explorationRate = healthPercent > 60 ? 'normal' : 'cautious';
          strategy.focusOn = gold < 100 ? 'gold discoveries' : 'loot discoveries';
          strategy.reasoning = 'Balanced approach weighs risk vs reward';
        }

        // Specific recommendations
        const recommendations: string[] = [];
        
        if (wisdom < 15) {
          recommendations.push('Increase Wisdom to 15+ for better discovery rates');
        }
        if (intelligence < 10 && healthPercent < 50) {
          recommendations.push('Increase Intelligence to avoid obstacle damage');
        }
        if (healthPercent < 30) {
          recommendations.push('Consider buying potions before exploring');
        }
        if (discoveryChance > 30) {
          recommendations.push('High discovery chance - explore frequently');
        }
        if (obstacleAvoidance > 50) {
          recommendations.push('High obstacle avoidance - safe to explore aggressively');
        }

        // Calculate optimal exploration count
        const safeExplorations = Math.floor(health / 10); // Assuming avg 10 damage per bad outcome
        const recommendedExplorations = riskTolerance === 'conservative' ? Math.floor(safeExplorations * 0.5) :
                                       riskTolerance === 'aggressive' ? safeExplorations :
                                       Math.floor(safeExplorations * 0.7);

        return {
          currentStatus: {
            healthPercent: `${healthPercent.toFixed(0)}%`,
            discoveryChance: `${discoveryChance}%`,
            obstacleAvoidance: `${obstacleAvoidance}%`,
            gold,
          },
          strategy,
          recommendations,
          exploration: {
            recommendedCount: recommendedExplorations,
            expectedGold: Math.floor(recommendedExplorations * discoveryChance * 0.4 * 0.01 * (10 + level * 2)),
            expectedNetHealth: Math.floor(recommendedExplorations * 
              ((discoveryChance * 0.3 * 0.01 * (5 + level / 2)) - 
               (0.35 * (1 - obstacleAvoidance / 100) * (5 + level / 3)))),
          },
          breakpoints: {
            safeWisdom: 20,
            safeIntelligence: 15,
            optimalWisdom: 25,
            optimalIntelligence: 20,
          },
        };
      },
    },
    {
      name: 'analyze_discovery_rewards',
      description: 'Analyze potential discovery rewards at different levels',
      inputSchema: z.object({
        levelRange: z.object({
          min: z.number().min(1).max(99),
          max: z.number().min(2).max(100),
        }).describe('Level range to analyze'),
        discoveryType: z.enum(['Gold', 'Health', 'Loot', 'All']).optional().default('All'),
      }),
      handler: async ({ levelRange, discoveryType }) => {
        const analysis: any = {
          levelRange: `${levelRange.min}-${levelRange.max}`,
          discoveries: {},
        };

        // Analyze each level
        for (let level = levelRange.min; level <= levelRange.max; level += 5) {
          const levelData: any = {
            level,
            rewards: {},
          };

          if (discoveryType === 'Gold' || discoveryType === 'All') {
            const baseGold = 10 + level * 2;
            const maxGold = baseGold + level;
            levelData.rewards.gold = {
              min: baseGold,
              max: maxGold,
              average: Math.floor((baseGold + maxGold) / 2),
              withWisdomBonus: Math.floor(maxGold * 1.2),
            };
          }

          if (discoveryType === 'Health' || discoveryType === 'All') {
            const health = 5 + Math.floor(level / 2);
            levelData.rewards.health = {
              amount: health,
              percentOfMaxHealth: `${(health / (100 + level * 2)).toFixed(1)}%`,
            };
          }

          if (discoveryType === 'Loot' || discoveryType === 'All') {
            const lootTier = Math.max(1, Math.min(5, 6 - Math.ceil(level / 20)));
            levelData.rewards.loot = {
              expectedTier: lootTier,
              rarity: lootTier === 1 ? 'Legendary' :
                      lootTier === 2 ? 'Epic' :
                      lootTier === 3 ? 'Rare' :
                      lootTier === 4 ? 'Uncommon' : 'Common',
              itemCount: 'Single item',
            };
          }

          analysis.discoveries[`level_${level}`] = levelData;
        }

        // Summary
        analysis.summary = {
          goldScaling: 'Linear: 10 + (2 × level)',
          healthScaling: 'Slow: 5 + floor(level / 2)',
          lootScaling: 'Tier decreases every 20 levels',
          bestLevelsForLoot: '1-20 (Tier 1 items)',
          bestLevelsForGold: '80-100 (Maximum gold)',
          recommendation: (level: number) => {
            if (level < 20) return 'Focus on loot discoveries for rare items';
            if (level < 50) return 'Balanced approach - all discoveries valuable';
            return 'Focus on gold discoveries for maximum value';
          },
        };

        return analysis;
      },
    },
  ];
}