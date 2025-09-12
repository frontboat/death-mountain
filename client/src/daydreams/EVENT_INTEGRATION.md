# Event Integration Guide for Daydreams AI

## Overview
The `events.ts` utility provides rich game event processing that enhances the AI's understanding of what's happening in Death Mountain. This guide explains how events are integrated into the Daydreams agent.

## Key Components

### 1. Event Processing (`processGameEvents`)
- Converts raw blockchain events into structured `GameEvent` objects
- Stores events in context memory for AI reference
- Maintains a rolling buffer of recent events (last 50)
- Distributes events to phase-specific contexts

### 2. Event Types
From `utils/events.ts`:
- **Exploration Events**: `discovery`, `obstacle`, `market_items`, `buy_items`
- **Combat Events**: `beast`, `attack`, `beast_attack`, `flee`, `ambush`, `defeated_beast`, `fled_beast`
- **Character Events**: `adventurer`, `level_up`, `stat_upgrade`
- **Inventory Events**: `bag`, `equip`, `drop`

### 3. Integration Points

#### A. Game State Sync
```typescript
// In useDaydreamsGame.ts, include events when syncing:
await syncGameState(
  state.agent.agent,
  playerId,
  {
    // ... other state
    events: recentGameEvents, // Add this
  },
  sessionId
);
```

#### B. Context Memory
Each context now includes `recentEvents?: GameEvent[]`:
```typescript
interface ExplorationMemory {
  // ... other fields
  recentEvents?: GameEvent[]; // Recent game events
}
```

#### C. XML Rendering
Events are included in the XML that the AI sees:
```xml
<recent_events>
  <event type="discovery">Discovered Gold (+15 XP)</event>
  <event type="obstacle">Giant Rat hit your Chest (5 damage)</event>
  <event type="beast">Encountered beast</event>
</recent_events>
```

## Usage Examples

### 1. Capturing Events from GameDirector
To capture events when they occur:

```typescript
// In GameDirector.tsx, after processing events:
const events = await executeAction(txs, setActionFailed);

// Send events to Daydreams
if (daydreamsAgent && events.length > 0) {
  await processGameEvents(daydreamsAgent, playerId, events);
}
```

### 2. Using Events in AI Decision Making
The AI can now reference recent events to make better decisions:

```typescript
// The AI sees recent events in its context:
// "I just discovered gold (+15 XP) and took damage from a Giant Rat.
//  My health is low, so I should buy potions before exploring further."
```

### 3. Event-Based Episode Boundaries
Events are used to determine when episodes start/end:

```typescript
// In episodeHooks.ts
shouldStartEpisode: (ref) => {
  // Start episode on beast encounter
  if (ref.ref === "event" && ref.data?.type === "beast") {
    return true;
  }
}
```

## Benefits

1. **Better Context Awareness**: AI knows what just happened (discoveries, damage taken, items found)
2. **Smarter Decision Making**: Can adjust strategy based on recent events (e.g., heal after taking damage)
3. **Episode Tracking**: Events provide natural boundaries for game episodes
4. **Learning from History**: AI can analyze past events to improve future gameplay

## Implementation Checklist

- [x] Import event utilities from `@/utils/events`
- [x] Add `processGameEvents` function to `gameIntegration.ts`
- [x] Update context interfaces to include `recentEvents`
- [x] Include events in XML renders
- [x] Add event processing to `syncGameState`
- [ ] Capture events from GameDirector (needs to be done in GameDirector.tsx)
- [ ] Update useDaydreamsGame to pass events during sync

## Example: Complete Event Flow

1. **Event Occurs**: Player explores and finds gold
2. **GameDirector**: Processes the blockchain transaction
3. **Event Capture**: Raw event is captured from the transaction response
4. **Processing**: `processGameEvent` converts it to structured `GameEvent`
5. **Storage**: Event is stored in context memory
6. **Distribution**: Event is sent to relevant phase context (exploration)
7. **XML Render**: Event appears in recent_events section
8. **AI Response**: "Great! You found 20 gold. Your total is now 145g."

## Event Metadata

Each `GameEvent` includes:
- `type`: The event category
- `action_count`: Sequential action number
- Event-specific data (damage, rewards, items, etc.)

The `getEventTitle` function provides human-readable descriptions for each event type.

## Advanced Usage

### Custom Event Handlers
You can add custom logic for specific events:

```typescript
if (event.type === 'defeated_beast') {
  // Track beast kills for achievements
  ctx.memory.beastsDefeated = (ctx.memory.beastsDefeated || 0) + 1;
  
  // Celebrate major victories
  if (event.beast_id && getBeastTier(event.beast_id) === 1) {
    ctx.memory.majorVictories.push(event);
  }
}
```

### Event Analysis
Use events for strategic analysis:

```typescript
// Analyze recent combat performance
const recentCombat = recentEvents.filter(e => 
  ['attack', 'beast_attack'].includes(e.type)
);

const damageDealt = recentCombat
  .filter(e => e.type === 'attack')
  .reduce((sum, e) => sum + (e.attack?.damage || 0), 0);

const damageTaken = recentCombat
  .filter(e => e.type === 'beast_attack')
  .reduce((sum, e) => sum + (e.attack?.damage || 0), 0);
```

## Next Steps

To fully activate event integration:

1. Update `GameDirector.tsx` to send events to Daydreams
2. Update `useDaydreamsGame.ts` to include events in sync
3. Consider adding event-specific strategies in AI instructions
4. Use events for more sophisticated episode boundaries
5. Build event-based learning and pattern recognition
