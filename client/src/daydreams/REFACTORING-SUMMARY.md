# Death Mountain Context Refactoring Summary

## Overview
Refactored the monolithic game context into three phase-specific contexts that compose together based on game state. This provides cleaner separation of concerns and better organization following Daydreams best practices.

## New Architecture

### Three Phase-Specific Contexts

#### 1. **Exploration Context** (`contexts/explorationContext.ts`)
- **Active When**: No beast present AND no stat points available (default phase)
- **Purpose**: Main game loop for dungeon exploration and item management
- **XML Render**: Shows adventurer stats, equipment, market items, and bag inventory
- **Actions**:
  - `explore` - Search the dungeon
  - `buy-items` - Purchase from market
  - `equip` - Equip items from bag
  - `drop` - Drop items for space

#### 2. **Combat Context** (`contexts/combatContext.ts`)
- **Active When**: Beast is present (beast_health > 0)
- **Purpose**: Handle combat encounters with beasts
- **XML Render**: Shows adventurer, beast stats, damage calculations, flee chance
- **Actions**:
  - `attack` - Strike the beast
  - `flee` - Attempt escape
  - `equip` - Change equipment (beast gets free attack)

#### 3. **Level-Up Context** (`contexts/levelUpContext.ts`)
- **Active When**: Stat upgrade points available (highest priority)
- **Purpose**: Allocate stat points - MUST be done before other actions
- **XML Render**: Shows available points and current stats
- **Actions**:
  - `allocate-stats` - Distribute all available stat points

### Main Game Context (`contexts/gameContext.ts`)
- Orchestrates the three phase-specific contexts
- Uses `.use()` composition to activate the appropriate context based on game state
- Maintains game history and phase tracking
- Provides `start-game` and `get-game-status` actions

## Key Improvements

### 1. **Clean Separation of Concerns**
- Each context focuses on a specific game phase
- Actions are only available when relevant
- Clear XML structure for each phase

### 2. **Automatic Phase Detection**
```typescript
// Priority order for phase determination:
1. Level-up (stat points available) - HIGHEST
2. Combat (beast present) 
3. Exploration (default) - LOWEST
```

### 3. **Better State Management**
- Main context holds shared state
- Phase contexts receive only relevant data
- Proper state synchronization between contexts

### 4. **Simplified Action Logic**
- Each action is in the appropriate context
- No need to check phase validity in actions
- Clear error messages when actions unavailable

## XML Render Examples

### Exploration Phase
```xml
<phase>exploration</phase>
<adventurer health="85" level="5" gold="125" xp="4500"/>
<stats str="8" dex="6" vit="5" int="4" wis="3" cha="2"/>
<equipment weapon="Blade T3 Lv2" chest="Hide T4 Lv1" .../>
<market>
  <item id="23" name="Sword" slot="weapon" tier="3" price="15g"/>
  <item id="45" name="Leather Armor" slot="chest" tier="4" price="20g"/>
</market>
<bag>
  <item id="67" name="Helm" slot="head" tier="5" level="1"/>
</bag>
```

### Combat Phase
```xml
<phase>combat</phase>
<adventurer health="85" level="5" gold="125" xp="4500"/>
<stats str="8" dex="6" vit="5" int="4" wis="3" cha="2"/>
<equipment weapon="Blade T3 Lv2" chest="Hide T4 Lv1" .../>
<beast name="Goblin" health="45" level="4" tier="4"/>
<damage player="15" critical="30" beast="8"/>
<flee chance="60"/>
<estimate>likely_victory</estimate>
```

### Level-Up Phase
```xml
<phase>level_up</phase>
<level>6</level>
<points>1</points>
<stats>
  <str>8</str>
  <dex>6</dex>
  <vit>5</vit>
  <int>4</int>
  <wis>3</wis>
  <cha>2</cha>
</stats>
```

## Migration Notes

### Updated Files
- `contexts/explorationContext.ts` - NEW
- `contexts/combatContext.ts` - NEW
- `contexts/levelUpContext.ts` - NEW
- `contexts/gameContext.ts` - NEW (replaces old monolithic version)
- `gameIntegration.ts` - Updated imports and sync logic

### Backwards Compatibility
- All existing actions work the same way
- State synchronization enhanced to sync to phase-specific contexts
- GameDirector integration unchanged

## Benefits of This Architecture

1. **Modularity**: Each phase is self-contained and testable
2. **Clarity**: Clear what actions are available in each phase
3. **Performance**: Smaller context renders (no huge game docs inline)
4. **Maintainability**: Easy to modify phase-specific behavior
5. **Extensibility**: Simple to add new phases or modify existing ones
6. **Type Safety**: Each context has its own memory interface
7. **Better UX**: Agent knows exactly what phase it's in and what's possible

## Future Enhancements

1. **Add Episode Hooks**: Track game sessions as episodes for analytics
2. **Services Pattern**: Move GameDirector to a proper service
3. **Vector Memory**: Store combat strategies and beast weaknesses
4. **Extension Bundle**: Package as a complete Daydreams extension
5. **MCP Integration**: Connect to external tools for enhanced gameplay

The refactored architecture follows Daydreams best practices and provides a solid foundation for future enhancements while maintaining all existing functionality.