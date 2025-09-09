# Death Mountain Context Engine Integration

## Overview

This directory contains the integrated Context Engine that generates XML context for the Daydreams AI agent directly within the Death Mountain client. This eliminates the need for running a separate LS-ENGINE server.

## Architecture

### Components

1. **contextEngine.ts** - Core context generation engine
   - Fetches fresh game state directly from blockchain via Torii
   - Generates compact XML context for different game phases
   - Provides combat outcome predictions and strategic information
   - Ensures AI always has latest state, not stale client data

2. **agent.ts** - Daydreams AI agent implementation
   - Uses contextEngine to generate XML context
   - Interprets XML phases to make strategic decisions
   - Executes game actions via blockchain transactions

3. **GameStateService.ts** - Fresh state fetching service
   - Queries Torii database directly for latest blockchain state
   - Ensures agent never uses stale client-side state
   - Maps raw blockchain data to client GameState format

4. **AgentRunner.tsx** - Component that runs the agent
   - Fetches fresh state before each agent action
   - Triggers agent processing
   - Logs XML context for debugging

## How It Works

```typescript
// 1. Game state updates in Zustand store
gameState = { adventurer, beast, marketItemIds, bag, ... }

// 2. Context engine generates XML
const xmlContext = contextEngine.generateContext(gameState);
// Returns: { content: "<context>...</context>", phase: "combat", tokens: 250 }

// 3. Agent receives XML context and makes decisions
// Phase-based decision making:
// - exploration → explore, buy items, or equip
// - combat → attack or flee based on <estimate>
// - level_up → allocate stat points
// - death → game over
```

## XML Context Format

### Exploration Phase
```xml
<context>
  <phase>exploration</phase>
  <adventurer health="85" level="10" gold="50" xp="100"/>
  <stats str="5" dex="4" vit="6" int="3" wis="3" cha="2"/>
  <equipment weapon="Katana:L7:T2" chest="Chain Mail:L5:T4" .../>
  <market>
    <item>Ghost Wand:T1:18g</item>
    <item>Grimoire:T1:18g</item>
  </market>
  <bag>
    <item>Divine Slippers:L3:T2</item>
  </bag>
</context>
```

### Combat Phase
```xml
<context>
  <phase>combat</phase>
  <adventurer health="85" level="10" gold="50" xp="100"/>
  <beast name="Golem" health="50" level="3" tier="4"/>
  <damage player="8" critical="16" beast="2"/>
  <flee chance="80"/>
  <estimate>Win in 7 rounds, take 12 damage</estimate>
</context>
```

## Benefits of Client-Side Integration

1. **No External Dependencies** - Everything runs in the browser
2. **Lower Latency** - No HTTP calls to external services
3. **Simplified Deployment** - Single application to deploy
4. **Direct State Access** - Uses existing Zustand stores
5. **Easier Debugging** - All code in one place

## Testing

### Unit Tests
```bash
# Run the test file in browser console
# Import test file and run: runContextEngineTests()
```

### Visual Test
```bash
# Open test-context-engine.html in browser
# Click buttons to test different game phases
```

### Live Testing
```bash
# Start the Death Mountain client
cd client && pnpm dev

# The agent will automatically use the context engine
# Check browser console for XML context logs
```

## Configuration

The agent's decision-making can be customized in `agent.ts`:

```typescript
instructions: `
  // Customize decision logic based on XML phases
  // Modify combat thresholds
  // Adjust exploration priorities
  // Change stat allocation strategy
`
```

## Future Enhancements

1. **Advanced Combat Analysis** - More detailed damage calculations
2. **Market Optimization** - Item value analysis
3. **Memory System** - Track combat history for learning
4. **Multi-Step Planning** - Strategic goal setting
5. **Performance Metrics** - Track agent success rates

## Comparison with LS-ENGINE Server

| Feature | Client Integration | LS-ENGINE Server |
|---------|-------------------|------------------|
| Setup | No server needed | Requires Bun server |
| Data Source | Zustand stores | SQL queries to Torii |
| Latency | Instant | HTTP overhead |
| Deployment | Single app | Two services |
| Scalability | Client-side only | Can serve multiple clients |
| Updates | Requires client rebuild | Server updates only |

## Troubleshooting

### "Action was reverted" Errors

If you see repeated "Transaction REVERTED" messages in the console:

1. **Missing VRF Calls**: The agent wasn't including required VRF (Verifiable Random Function) calls.
   - **FIXED**: Agent now includes `requestRandom()` calls before actions that need randomness:
     - `explore`, `attack`, `flee` - Always include VRF when enabled
     - `equip` - Includes VRF when in combat (beastHealth > 0)
   - This matches exactly what `GameDirector.tsx` does when users click buttons

2. **Stale Game ID**: The agent was using a cached game ID from memory instead of the current game.
   - **FIXED**: Agent now uses `memory.currentGameState?.gameId` which is always fresh from blockchain
   - This ensures the agent always uses the correct, current game ID

3. **Timing Issue**: The agent might be acting too quickly. The blockchain needs time to process each transaction.
   - Solution: Increase wait times in `AgentRunner.tsx`:
     - After action completes: `setTimeout(resolve, 5000)` (5 seconds)
     - Before first action: `setTimeout(runAgent, 4000)` (4 seconds)

4. **Gas/Fee Issues**: The transaction might not have enough gas.
   - Check `TIP_AMOUNT` in `useSystemCalls.ts`

5. **Game State Mismatch**: The fresh state might not match blockchain expectations.
   - Ensure Torii database is synced with blockchain

### Common Issues

1. **Context not generating**
   - Check that game state has adventurer data
   - Verify Zustand stores are populated

2. **Agent not taking actions**
   - Check console for XML context logs
   - Verify agent is receiving game state updates
   - Ensure blockchain connection is active

3. **Combat predictions incorrect**
   - Review calculateCombatStats utility
   - Check beast and equipment data

## Contributing

To improve the context engine:

1. Enhance phase detection logic in `determinePhase()`
2. Add more detailed combat calculations in `calculateCombatPreview()`
3. Improve XML formatting for better LLM understanding
4. Add new phases or game states as needed
