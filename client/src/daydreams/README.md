# Death Mountain Daydreams Integration

This directory contains the Daydreams AI integration for the Death Mountain game. It provides AI-powered assistance and automation for game actions through natural language interactions.

## Overview

The integration consists of several key components:

- **Actions** (`gameActions.ts`) - Daydreams actions that correspond to each game action
- **Context** (`gameContext.ts`) - Manages game state and player memory
- **Integration** (`gameIntegration.ts`) - Bridges Daydreams with the existing GameDirector
- **React Hook** (`useDaydreamsGame.ts`) - React hook for easy integration
- **UI Component** (`GameAIAssistant.tsx`) - Chat interface for the AI assistant

## How it works

### Model and initialization

- The agent is created in `gameIntegration.ts` using `createDreams` with an OpenAI client from `@ai-sdk/openai`.
- API key is provided at runtime via browser-safe initialization: `createOpenAI({ apiKey })`.
- The React hook `useDaydreamsGame` initializes the agent and passes the GameDirector reference to the agent’s memory (for Daydreams actions).

Environment variable (Vite):

```bash
VITE_OPENAI_API_KEY=sk-...
```

You can also pass `apiKey` directly when using the hook.

### Context memory and render

The Daydreams context (`gameContext.ts`) maintains a structured memory snapshot that is rendered to the model each turn. It includes:

- Identity and status: `currentGameId`, `gameStarted`, `lastAction`, `lastActionTime`
- Adventurer summary: derived `adventurerStats` (health, xp, gold, level) and full `adventurer`, `adventurerState`
- Inventory/market: `bag` (full items), `marketItemIds` (rendered with names/tiers/prices)
- World: `beast` (active encounter), `battleEvent` (recent combat), `collectable`, `collectableTokenURI`, `collectableCount`
- Preferences: `preferences`
- Selected upgrades: `selectedStats`

For readability and reasoning, the render uses existing utils:

- Item details: `ItemUtils.getItemName`, `getItemTier`, `getItemSlot`, and `calculateLevel`
- Market details: `generateMarketItems(marketItemIds, adventurer.stats.charisma)` (name, slot, tier, price)
- Combat stats (when a beast is active): `calculateCombatStats(adventurer, bag, beast)`

### In-combat detection

The agent treats “in combat” as:

```ts
Boolean(memory.beast) && (memory.adventurer?.beast_health ?? 0) > 0
```

This is kept up-to-date via state sync described below.

### State sync (AI memory ← UI store)

`useDaydreamsGame` mirrors the game store state into AI memory through `syncGameState`:

- Auto-sync on store changes (unthrottled)
- Periodic background sync (`pollIntervalMs`, default 5000 ms)
- Forced sync right before each `sendMessage`

You can trigger an immediate sync at any time:

```ts
await syncState(true);
```

To confirm, use the “Dump” button in `GameAIAssistant` to log both the AI memory and UI store snapshots.

### Action execution and duplicate prevention

Daydreams actions in `gameActions.ts` bridge the model’s intents to the GameDirector. To prevent duplicate actions while a transaction is processing, the agent uses an in-flight gate:

- Memory fields: `actionInFlight`, `inFlightAction`, `inFlightSince`
- Each action sets `actionInFlight = true` before calling `gameDirector.executeGameAction(...)` and clears it in a `finally` block
- While in-flight, subsequent actions return an error: “Action already in progress”

This prevents the model from re-issuing the same action while the game is still processing.

### Output handling

Responses are returned via the configured `outputs.text` channel. The integration extracts the response robustly, handling both `{ ref: "text", data: string }` and `{ data: { content: string } }` shapes, so the UI displays exactly what the model replied.

### Event-driven updates (optional)

In addition to the automatic syncing above, you can push updates to the agent immediately after processing a new game event:

1. Normalize the event using the existing utils:
   - Torii tuples → `translateGameEvent(raw, manifest)`
   - Variant object → `processGameEvent({ action_count, details })`
2. Call `syncGameState(agent, playerId, { ...updatedFields }, sessionId)` with only the fields that changed (e.g., `adventurer`, `bag`, `beast`, `marketItemIds`, `battleEvent`).

### Configuration knobs

- `autoSync`: enable/disable automatic store → memory sync (default true)
- `pollIntervalMs`: periodic sync cadence (default 5000)
- `apiKey`: override `VITE_OPENAI_API_KEY`

Example:

```tsx
const ai = useDaydreamsGame({
  playerId,
  sessionId,
  autoSync: true,
  pollIntervalMs: 3000,
});
```

## Quick Start

### 1. Install Dependencies

First, install the Daydreams dependencies:

```bash
npm install @daydreamsai/core @ai-sdk/openai zod
```

### 2. Set up Environment Variables (Vite)

Create a file at `client/.env.local` and add your OpenAI API key using Vite's client-exposed prefix:

```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

- Do not commit `.env.local` to git.
- Restart the dev server after adding or changing env vars.

### 3. Add the AI Assistant to Your Game

```tsx
import React from "react";
import { GameAIAssistant } from "./daydreams";
import { useAccount } from "@starknet-react/core";

export const GamePage = () => {
  const { address } = useAccount();
  
  return (
    <div>
      {/* Your existing game UI */}
      
      {/* Add the AI Assistant */}
      {address && (
        <GameAIAssistant 
          playerId={address}
          sessionId="game-session-1"
        />
      )}
    </div>
  );
};
```

### 4. Use the Hook for Custom Integration

```tsx
import React from "react";
import { useDaydreamsGame, useGameCommands } from "./daydreams";

export const CustomGameAI = () => {
  const { 
    sendMessage, 
    getAdvice, 
    isInitialized, 
    isLoading, 
    error 
  } = useDaydreamsGame({
    playerId: "player-123",
    autoSync: true,
  });

  const commands = useGameCommands(sendMessage);

  const handleGetAdvice = async () => {
    const advice = await getAdvice("I'm in combat with a beast");
    console.log("AI Advice:", advice.response);
  };

  const handleExplore = async () => {
    await commands.explore(true); // Explore until finding a beast
  };

  return (
    <div>
      <button onClick={handleGetAdvice} disabled={!isInitialized}>
        Get AI Advice
      </button>
      <button onClick={handleExplore} disabled={!isInitialized}>
        Explore Dungeon
      </button>
    </div>
  );
};
```

## Available Actions

The AI can perform all game actions through natural language:

### Game Management
- `start-game` - Start a new game with specified settings
- `get-game-status` - Get current game status and stats

### Exploration & Combat
- `explore` - Explore the dungeon (with optional `untilBeast` parameter)
- `attack` - Attack a beast in combat (with optional `untilDeath` parameter)
- `flee` - Flee from combat (with optional `untilDeath` parameter)

### Inventory & Equipment
- `buy-items` - Purchase items and potions from the market
- `equip` - Equip items from inventory
- `drop` - Drop items to make space

### Character Development
- `select-stat-upgrades` - Allocate stat points to improve character

## Example Conversations

Here are some example interactions with the AI:

```
User: "What should I do next?"
AI: "Based on your current stats, I recommend exploring the dungeon to gain more XP. You have full health and good equipment, so you're ready for combat."

User: "Start a new game with ID 12345"
AI: "I'll start a new game for you with ID 12345 using the default settings."

User: "I found a beast, should I attack or flee?"
AI: "Looking at your health (85/100) and the beast's stats, I recommend attacking. You have good equipment and enough health to handle this fight."

User: "Buy 3 health potions"
AI: "I'll purchase 3 health potions for you from the market."

User: "Upgrade my strength and vitality stats"
AI: "I'll allocate your available stat points to strength and vitality to improve your combat effectiveness and health."
```

## Architecture

### Action Flow
1. User sends natural language message
2. Daydreams processes the message and determines intent
3. AI calls appropriate game action with extracted parameters
4. Action interfaces with GameDirector to execute blockchain transactions
5. Game state is updated and synced back to AI context
6. AI provides response to user

### State Management
- **Game Context**: Maintains player-specific game state and preferences
- **Memory System**: Tracks conversation history and game events
- **Auto-sync**: Automatically syncs blockchain game state with AI context

### Error Handling
- Graceful handling of network errors and transaction failures
- Retry mechanisms for failed actions
- Clear error messages for users

## Customization

### Adding New Actions

To add a new game action:

1. Define the action in `gameActions.ts`:

```typescript
export const newAction = action({
  name: "new-action",
  description: "Description of what this action does",
  schema: z.object({
    parameter: z.string().describe("Parameter description"),
  }),
  handler: async ({ parameter }, ctx) => {
    // Implementation
    return { success: true, message: "Action completed" };
  },
});
```

2. Add it to the `gameActions` array
3. Update the GameDirector to handle the new action type

### Customizing AI Behavior

Modify the context instructions in `gameContext.ts`:

```typescript
instructions: `You are a strategic advisor for Death Mountain. 
Focus on helping players make optimal decisions based on:
- Current health and resources
- Equipment and stats
- Risk vs reward analysis
- Long-term character progression
`
```

### Adding Game-Specific Knowledge

You can enhance the AI's knowledge by:

1. Adding game mechanics explanations to the context
2. Including item and beast databases in the memory system
3. Training on game-specific strategies and tactics

## Best Practices

1. **Rate Limiting**: The integration includes automatic rate limiting to prevent API abuse
2. **Error Recovery**: Always handle errors gracefully and provide retry mechanisms
3. **State Sync**: Keep AI context synchronized with actual game state
4. **User Privacy**: Player data is isolated per player ID and session
5. **Performance**: Use auto-sync throttling to prevent excessive API calls

## Troubleshooting

### Common Issues

**AI not responding**
- Check that OpenAI API key is set correctly
- Verify network connectivity
- Check browser console for error messages

**Actions not executing**
- Ensure GameDirector is properly initialized
- Check that wallet is connected
- Verify transaction permissions

**State out of sync**
- Try manual sync by calling `syncState()`
- Check that auto-sync is enabled
- Verify game state is being updated correctly

### Debug Mode

Enable debug logging:

```typescript
const agent = await createGameAgent({
  logLevel: "debug", // Enable debug logging
});
```

## Contributing

To contribute to the Daydreams integration:

1. Follow the existing code patterns and TypeScript types
2. Add tests for new actions and functionality
3. Update documentation for new features
4. Ensure backward compatibility with existing integrations

## License

This integration follows the same license as the main Death Mountain project.
