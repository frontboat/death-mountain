# Loot Survivor 2 MCP Server

This MCP (Model Context Protocol) server provides AI assistants with comprehensive access to Loot Survivor 2 game data, mechanics, and simulation capabilities.

## Features

- Complete game data access (101 items, 75 beasts, 75 obstacles)
- Combat simulation and probability analysis
- Market analysis and trading recommendations
- Adventurer equipment and stat optimization
- Exploration outcome predictions
- Dynamic calculations based on game formulas

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### As an MCP Server

```bash
npm start
```

### Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "loot-survivor": {
      "command": "node",
      "args": ["/Users/boat/Projects/death-mountain/mcp-server/dist/index.js"],
      "env": {
        "TORII_URL": "https://api.cartridge.gg/x/sepolia/loot-survivor-v2/torii",
        "CHAIN": "sepolia"
      }
    }
  }
}
```

## Available Tools

### Game Data Tools
- `get_adventurer` - Get adventurer stats by ID
- `get_beast` - Get beast information with level-based stats
- `get_item` - Get item details with calculated damage/armor
- `get_obstacle` - Get obstacle information with damage calculations
- `get_leaderboard` - Get top adventurers by XP

### Game Mechanics Tools
- `calculate_damage` - Calculate combat damage with all modifiers
- `calculate_xp_reward` - Calculate XP for defeating beasts
- `calculate_flee_chance` - Calculate probability of escaping combat
- `calculate_stat_upgrade_cost` - Determine stat upgrade requirements
- `calculate_market_price` - Get dynamic item pricing with discounts

### Search Tools
- `search_items` - Search items by name, tier, type, or slot
- `search_beasts` - Search beasts by tier, name, or type
- `search_obstacles` - Search obstacles by tier, type, or damage type
- `get_game_constants` - Get game configuration values
- `get_combat_log` - Get combat history (placeholder)

### Adventurer Tools
- `analyze_adventurer_equipment` - Analyze equipment and provide recommendations
- `calculate_stat_requirements` - Determine requirements for equipping items
- `optimize_stat_distribution` - Suggest optimal stats for play styles
- `calculate_adventurer_power` - Calculate total power score and ratings

### Combat Simulation Tools
- `simulate_combat` - Run combat simulation between adventurer and beast
- `calculate_combat_outcome_probability` - Calculate win probability with multiple simulations
- `find_optimal_beasts` - Find best beasts to fight based on level and risk
- `analyze_elemental_matchups` - Analyze weapon vs beast type advantages

### Market Tools
- `get_market_inventory` - Get available items with deterministic market generation
- `calculate_item_value` - Evaluate item cost-effectiveness
- `find_best_deals` - Find highest value items in current market
- `calculate_potion_cost` - Calculate potion costs with charisma discounts

### Exploration Tools
- `simulate_exploration` - Simulate exploration outcomes with probabilities
- `calculate_exploration_probabilities` - Get exact probabilities for outcomes
- `find_optimal_exploration_strategy` - Determine best exploration approach
- `analyze_discovery_rewards` - Analyze rewards at different levels

## Tool Categories

### Information Retrieval
Tools for getting specific game data about entities.

### Calculations
Tools for computing game mechanics like damage, XP, and prices.

### Search & Discovery
Tools for finding items, beasts, or obstacles by criteria.

### Simulation
Tools for predicting combat outcomes and exploration results.

### Optimization
Tools for recommending best strategies and equipment choices.

### Analysis
Tools for deep analysis of game mechanics and probabilities.

## Development

```bash
npm run dev     # Development mode with watch
npm run build   # Build for production
npm test        # Run tests
npm run lint    # Run linter
```

## Data Sources

- **Static Data**: Game constants from Cairo contracts (items, beasts, obstacles)
- **Dynamic Data**: Torii GraphQL API for live adventurer and game state
- **Calculations**: Based on game formulas from smart contracts

## Usage Examples

### Tool Invocation Examples

#### Get Adventurer Stats
```json
{
  "tool": "get_adventurer",
  "arguments": {
    "adventurerId": "0x123"
  }
}
```

#### Search for Items
```json
{
  "tool": "search_items",
  "arguments": {
    "tier": 3,
    "type": "Weapon",
    "slot": "Weapon"
  }
}
```

#### Simulate Combat
```json
{
  "tool": "simulate_combat",
  "arguments": {
    "adventurerStats": {
      "level": 10,
      "health": 150,
      "strength": 15,
      "dexterity": 12,
      "vitality": 10,
      "intelligence": 8,
      "wisdom": 8,
      "weaponDamage": 12,
      "armor": 8
    },
    "beastId": 29,
    "beastLevel": 10
  }
}
```

#### Calculate Market Value
```json
{
  "tool": "calculate_item_value",
  "arguments": {
    "itemId": 42,
    "adventurerLevel": 15,
    "currentGold": 200,
    "charismaBonus": 10
  }
}
```

#### Optimize Stats for Play Style
```json
{
  "tool": "optimize_stat_distribution",
  "arguments": {
    "adventurerLevel": 20,
    "playStyle": "warrior",
    "currentStats": {
      "strength": 10,
      "dexterity": 5,
      "vitality": 8,
      "intelligence": 3,
      "wisdom": 3,
      "charisma": 2
    }
  }
}
```

### Example Conversations

#### Combat Strategy
```
User: "I'm level 15 with 20 strength and a tier 3 weapon. What beasts should I fight?"
AI: [Uses find_optimal_beasts tool]
Response: "Based on your level and risk tolerance, I recommend:
1. Wendigo (Beast #10) at level 13-17 - High efficiency rating
2. Chimera (Beast #9) at level 13-17 - Good XP rewards
3. Lich (Beast #8) at level 12-16 - Balanced risk/reward"
```

#### Market Analysis
```
User: "What are the best deals in the market for my level 20 character with 500 gold?"
AI: [Uses find_best_deals tool]
Response: "Top deals in the current market:
1. Katana (Tier 1) - 120 gold - Value score: 2.5 🌟 Must buy!
2. Divine Hood (Tier 1) - 110 gold - Value score: 2.2 ✅ Recommended
3. Ghost Wand (Tier 4) - 48 gold - Value score: 1.8 ✅ Recommended"
```

#### Exploration Planning
```
User: "I have 200 health, 15 wisdom, and 10 intelligence. Should I explore?"
AI: [Uses find_optimal_exploration_strategy tool]
Response: "With your stats, exploration is recommended. You have:
- 30% discovery chance (15% base + 15% from wisdom)
- 20% obstacle avoidance (from intelligence)
- Safe for ~14 explorations before needing healing
Focus on discoveries for gold and loot rewards."
```

## Integration Patterns

### Sequential Tool Usage
Many game decisions require multiple tool calls:

1. **Combat Preparation**
   - `get_adventurer` → Get current stats
   - `analyze_elemental_matchups` → Check weapon effectiveness
   - `find_optimal_beasts` → Find suitable targets
   - `calculate_combat_outcome_probability` → Verify win chance

2. **Shopping Strategy**
   - `get_market_inventory` → See available items
   - `calculate_item_value` → Evaluate each item
   - `calculate_adventurer_power` → Check power increase
   - `find_best_deals` → Get recommendations

3. **Character Development**
   - `analyze_adventurer_equipment` → Current equipment analysis
   - `calculate_stat_requirements` → Check item requirements
   - `optimize_stat_distribution` → Plan stat upgrades
   - `calculate_adventurer_power` → Measure progress

## Advanced Features

### Market Seed System
The market uses deterministic generation based on seeds:
```json
{
  "tool": "get_market_inventory",
  "arguments": {
    "adventurerLevel": 25,
    "marketSeed": 12345  // Optional - for consistent inventory
  }
}
```

### Combat Simulations
Run multiple simulations for accurate predictions:
```json
{
  "tool": "calculate_combat_outcome_probability",
  "arguments": {
    "adventurerStats": { /* ... */ },
    "beastId": 54,
    "beastLevel": 20,
    "simulations": 1000  // More simulations = more accurate
  }
}
```

### Risk Management
Tools support different risk tolerances:
```json
{
  "tool": "find_optimal_exploration_strategy",
  "arguments": {
    "adventurerStats": { /* ... */ },
    "riskTolerance": "conservative"  // or "balanced", "aggressive"
  }
}
```

## Contributing

1. Add new tools in `src/tools/` directory
2. Import and register in `src/index.ts`
3. Update this README with new tool documentation
4. Ensure TypeScript types are properly defined
5. Test with an MCP client before submitting

### Adding a New Tool

Example structure for a new tool:
```typescript
{
  name: 'tool_name',
  description: 'Clear description of what the tool does',
  inputSchema: z.object({
    param1: z.number().describe('Parameter description'),
    param2: z.string().optional().describe('Optional parameter'),
  }),
  handler: async ({ param1, param2 }) => {
    // Implementation logic
    return {
      // Structured response
    };
  },
}