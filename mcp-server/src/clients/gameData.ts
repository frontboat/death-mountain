import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';
import { BEASTS, ITEMS, OBSTACLES, calculateBeastHealth, calculateBeastGoldReward, calculateObstacleDamage } from '../data/gameConstants.js';

export interface Adventurer {
  id: string;
  owner: string;
  name: string;
  health: number;
  xp: number;
  level: number;
  strength: number;
  dexterity: number;
  vitality: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  gold: number;
  beastHealth: number;
  statUpgradesAvailable: number;
  lastAction: number;
  createdAt: number;
}

export interface Beast {
  id: number;
  tier: number;
  name: string;
  type: string;
  health: number;
  level: number;
  goldReward?: number;
}

export interface Item {
  id: number;
  name: string;
  tier: number;
  type: string;
  slot: string;
  damage?: number;
  armor?: number;
}

export interface Obstacle {
  id: number;
  name: string;
  tier: number;
  type: string;
  damageType: string;
  avoidStat: string;
  damage?: number;
}

export class GameDataClient {
  private client: GraphQLClient;
  
  constructor(
    private toriiUrl: string,
    private chain: string
  ) {
    this.client = new GraphQLClient(toriiUrl);
  }

  async getAdventurer(adventurerId: string): Promise<Adventurer | null> {
    const query = gql`
      query GetAdventurer($id: String!) {
        adventurer(id: $id) {
          id
          owner
          name
          health
          xp
          level
          strength
          dexterity
          vitality
          intelligence
          wisdom
          charisma
          gold
          beastHealth
          statUpgradesAvailable
          lastAction
          createdAt
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, { id: adventurerId });
      return data.adventurer;
    } catch (error) {
      console.error('Error fetching adventurer:', error);
      return null;
    }
  }

  async getLeaderboard(limit: number = 10): Promise<Adventurer[]> {
    const query = gql`
      query GetLeaderboard($limit: Int!) {
        adventurers(
          orderBy: { xp: DESC }
          limit: $limit
        ) {
          id
          owner
          name
          health
          xp
          level
          gold
        }
      }
    `;

    try {
      const data: any = await this.client.request(query, { limit });
      return data.adventurers || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  async getBeast(beastId: number, level: number = 1): Promise<Beast | null> {
    const beast = BEASTS.find(b => b.id === beastId);
    if (!beast) return null;
    
    return {
      ...beast,
      level,
      health: calculateBeastHealth(beast.tier, level),
      goldReward: calculateBeastGoldReward(beast.tier, level),
    };
  }

  async getItem(itemId: number): Promise<Item | null> {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return null;
    
    // Add damage/armor values based on tier
    const tierBonus = 6 - item.tier; // T1=5, T2=4, T3=3, T4=2, T5=1
    
    if (item.type === "Blade" || item.type === "Bludgeon" || item.type === "Magic") {
      return { ...item, damage: tierBonus * 3 };
    } else if (["Metal", "Leather", "Cloth"].includes(item.type) && item.slot !== "Weapon") {
      return { ...item, armor: tierBonus * 2 };
    }
    
    return item;
  }

  async getObstacle(obstacleId: number, level: number = 1): Promise<Obstacle | null> {
    const obstacle = OBSTACLES.find(o => o.id === obstacleId);
    if (!obstacle) return null;
    
    return {
      ...obstacle,
      damage: calculateObstacleDamage(obstacle.tier, level),
    };
  }

  async searchItems(query: {
    name?: string;
    tier?: number;
    type?: string;
    slot?: string;
  }): Promise<Item[]> {
    let items = ITEMS;
    
    if (query.name) {
      items = items.filter(i => 
        i.name.toLowerCase().includes(query.name!.toLowerCase())
      );
    }
    if (query.tier !== undefined) {
      items = items.filter(i => i.tier === query.tier);
    }
    if (query.type) {
      items = items.filter(i => i.type === query.type);
    }
    if (query.slot) {
      items = items.filter(i => i.slot === query.slot);
    }
    
    // Add damage/armor values
    return items.map(item => {
      const tierBonus = 6 - item.tier;
      if (item.type === "Blade" || item.type === "Bludgeon" || item.type === "Magic") {
        return { ...item, damage: tierBonus * 3 };
      } else if (["Metal", "Leather", "Cloth"].includes(item.type) && item.slot !== "Weapon") {
        return { ...item, armor: tierBonus * 2 };
      }
      return item;
    });
  }

  async searchBeasts(query: {
    tier?: number;
    name?: string;
    type?: string;
  }): Promise<Beast[]> {
    let beasts = BEASTS;
    
    if (query.tier !== undefined) {
      beasts = beasts.filter(b => b.tier === query.tier);
    }
    if (query.name) {
      beasts = beasts.filter(b => 
        b.name.toLowerCase().includes(query.name!.toLowerCase())
      );
    }
    if (query.type) {
      beasts = beasts.filter(b => b.type === query.type);
    }
    
    // Default to level 1 for searches
    return beasts.map(beast => ({
      ...beast,
      level: 1,
      health: calculateBeastHealth(beast.tier, 1),
      goldReward: calculateBeastGoldReward(beast.tier, 1),
    }));
  }

  async searchObstacles(query: {
    tier?: number;
    name?: string;
    type?: string;
    damageType?: string;
  }): Promise<Obstacle[]> {
    let obstacles = OBSTACLES;
    
    if (query.tier !== undefined) {
      obstacles = obstacles.filter(o => o.tier === query.tier);
    }
    if (query.name) {
      obstacles = obstacles.filter(o => 
        o.name.toLowerCase().includes(query.name!.toLowerCase())
      );
    }
    if (query.type) {
      obstacles = obstacles.filter(o => o.type === query.type);
    }
    if (query.damageType) {
      obstacles = obstacles.filter(o => o.damageType === query.damageType);
    }
    
    // Default to level 1 for searches
    return obstacles.map(obstacle => ({
      ...obstacle,
      damage: calculateObstacleDamage(obstacle.tier, 1),
    }));
  }
}