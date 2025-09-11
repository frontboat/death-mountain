# Death Mountain Daydreams Integration

This directory contains the Daydreams AI integration for the Death Mountain game. It provides AI-powered assistance and automation for game actions through natural language interactions.

## Overview

The integration consists of several key components:

- **Actions** (`gameActions.ts`) - Daydreams actions that correspond to each game action
- **Context** (`gameContext.ts`) - Manages game state and player memory
- **Integration** (`gameIntegration.ts`) - Bridges Daydreams with the existing GameDirector
- **React Hook** (`useDaydreamsGame.ts`) - React hook for easy integration
- **UI Component** (`GameAIAssistant.tsx`) - Chat interface for the AI assistant

## Quick Start

### 1. Install Dependencies

First, install the Daydreams dependencies:

```bash
npm install @daydreamsai/core @ai-sdk/openai zod
```

### 2. Set up Environment Variables

Add your OpenAI API key to your environment:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

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
