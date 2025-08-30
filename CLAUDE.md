# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Death Mountain is a blockchain-based adventure RPG game built on StarkNet using the Dojo engine. It's a token-agnostic, no-code onchain dungeon creator that allows developers to build complex game mechanics on top of a base adventurer system.

## Common Development Commands

### Frontend Development (client/)
```bash
cd client
pnpm install        # Install dependencies
pnpm dev           # Start development server (port 5173)
pnpm build         # Build for production (runs tsc && vite build)
pnpm lint          # Run ESLint
pnpm preview       # Preview production build
```

### Backend Development (contracts/)
```bash
cd contracts
sozo build         # Build Cairo contracts
sozo test          # Run contract tests
scarb fmt          # Format Cairo code (max line length 120)
```

## Architecture Overview

### Frontend Architecture
- **React + TypeScript** application using Vite as build tool
- **State Management**: Zustand stores in `client/src/stores/`
  - `gameStore.ts` - Main game state and player data
  - `marketStore.ts` - Marketplace and trading state
  - `uiStore.ts` - UI state management
- **Platform-Specific UI**:
  - `client/src/desktop/` - Desktop-optimized components and pages
  - `client/src/mobile/` - Mobile-optimized components and pages
- **Dojo Integration**: `client/src/dojo/` contains blockchain interaction code
- **Generated Code**: `client/src/generated/` - Auto-generated contract bindings
- **Game Constants**: `client/src/constants/` - Static game data (beasts, loot, obstacles)

### Smart Contract Architecture
- **Cairo 2.10.1** contracts in `contracts/src/`
- **Dojo Framework**: Version 1.6.0 for on-chain game state
- **Systems**: Core game logic contracts in `contracts/src/systems/`
  - `adventurer/` - Player character system
  - `beast/` - Enemy and combat system
  - `game/` - Main game loop and state management
  - `loot/` - Item generation and management
  - `objectives/` - Game objectives system
  - `game_token/` - Token integration
  - `renderer/` - NFT metadata rendering
  - `settings/` - Game configuration
- **Models**: Data structures in `contracts/src/models/`
- **Libraries**: Shared code in `contracts/src/libs/`
- **Constants**: Game constants in `contracts/src/constants/`

### Key Integration Points
- **Wallet Connection**: Uses Cartridge Controller and StarknetKit
- **Contract Calls**: Through generated bindings in `client/src/generated/`
- **Game State**: Managed through Dojo's entity-component system
- **Audio System**: Background music and sound effects in `client/public/audio/`

## Important Configuration

### Environment Variables
Create a `.env.local` file in the client directory with:
- `VITE_PUBLIC_CHAIN` - Network (SN_SEPOLIA/SN_MAINNET)
- `VITE_PUBLIC_NODE_URL` - StarkNet RPC endpoint (if needed)
- `VITE_PUBLIC_TORII` - Torii indexer URL (if needed)
- Additional contract addresses and API keys as needed

### Network Configurations
- Development: `contracts/dojo_dev.toml`
- Sepolia testnet: `contracts/dojo_sepolia.toml`
- Mainnet: `contracts/dojo_mainnet.toml`
- Slot testnet: `contracts/dojo_slot.toml`

## Development Workflow

1. **Frontend Changes**: Work in `client/src/`, run `pnpm dev` to see changes
2. **Contract Changes**: Modify Cairo files in `contracts/src/`, build with `sozo build`
3. **Asset Updates**: Place images in appropriate directories under `client/public/images/`
4. **State Management**: Update Zustand stores for new game features
5. **UI Components**: Use Material-UI components, maintain consistent styling

## Code Conventions

- TypeScript strict mode enabled
- React functional components with hooks
- Zustand for global state management
- Cairo 2.10.1 syntax for smart contracts
- Component files use `.tsx` extension
- Utility files use `.ts` extension
- Cairo formatting: `scarb fmt` with max line length 120

## Deployment

- Frontend deployment configured for Google App Engine (`client/app.yaml`)
- Contract deployment via Dojo CLI with network-specific profiles