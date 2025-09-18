# Repository Guidelines

## Project Structure & Module Organization
- `src/` houses the React + TypeScript client; key folders include `components/` (shared UI), `desktop/` and `mobile/` feature sets, `contexts/`, `stores/`, `utils/`, and `generated/` contract outputs (do not hand-edit).
- `api/server.js` provides the Express bridge for AI chat; related prompt templates live at the repo root (e.g. `beast_prompts.txt`).
- `src/desktop/contexts/GameDirector.tsx` orchestrates Starknet reads/writes and feeds Zustand; `src/stores/gameStore.ts` and `src/stores/marketStore.ts` store canonical adventurer/bag/market state.
- Static assets and HTML live in `public/` and `index.html`; global styling uses `src/index.css`.
- Top-level configuration files (`vite.config.ts`, `tsconfig.json`, `eslint.config.js`, manifests) govern build targets and chain integration.

## Build, Test, and Development Commands
- `pnpm install` to sync dependencies after cloning or branching.
- `pnpm dev` runs the Vite client on localhost:5173; run `pnpm dev:api` in a second terminal for the chat proxy.
- `pnpm build` performs TypeScript project checks (`tsc -b`) and produces production bundles in `dist/`.
- `pnpm preview` serves the built client for smoke testing the optimized output.

## Coding Style & Naming Conventions
- Write idiomatic function components in TypeScript; colocate feature-specific state inside `stores/` using Zustand when possible.
- Match the existing 2-space indentation, single quotes, trailing semicolons, and import order enforced by `pnpm lint`.
- Use PascalCase for component files (`ChatToggle.tsx`), camelCase for utilities and Zustand selectors, and prefix custom hooks with `use`.
- Prefer the `@/` path alias instead of relative `../../` imports to access modules under `src/`.

## Game State Flow & Hydration

### Overview
- `GameDirector` fetches token metadata/settings, calls `getGameState` (`src/api/starknet.ts`) for existing runs, and replays on-chain events; each event updates `useGameStore` slices via setters like `setAdventurer`, `setBag`, and `setBeast`.
- Store state mirrors on-chain schema (`{id, xp}` for equipment/bag items); derived data—item names, types, tiers, levels—comes from `ItemUtils` and `calculateLevel` at render time.
- Actions flow `executeGameAction → useSystemCalls.executeAction`; receipts translate to events queued in `GameDirector`, ensuring UI state stays consistent with Starknet transactions.
- Components that need live context (e.g., `ChatBox.tsx`) should subscribe to `useGameStore` or call selectors, not rely on stale closures, when building prompts or analytics payloads.

### Game Director Orchestration
- GameDirector is the orchestrator: when it mounts it first pulls token metadata and settings, then calls `initializeGame` to either hydrate from chain or start fresh (`src/desktop/contexts/GameDirector.tsx:123–189`).
- Hydration happens via `getGameState`, which calls the Starknet RPC and decodes every field of the adventurer, bag, beast, and market arrays before returning a plain JS snapshot (`src/api/starknet.ts:131–262`).
- If a snapshot exists, `restoreGameState` replays historical events for the explorer log and writes the decoded entities into the Zustand store (`src/desktop/contexts/GameDirector.tsx:192–220`).

### State Storage
- The Zustand store (`useGameStore`) keeps both the canonical on-chain copy (`adventurerState`) and the working UI copy (`adventurer`, plus bag, beast, market flags, etc.), handling invariants such as clearing the active beast when its health hits zero (`src/stores/gameStore.ts:112–199`).
- Helper setters like `setBag`, `setBeast`, `setMarketItemIds`, and `setExploreLog` are invoked by the director whenever new data arrives (`src/stores/gameStore.ts:128–139`).

### Updates After Player Actions
- Player inputs flow through `executeGameAction`, which bundles the right Dojo system calls (explore/attack/flee/equip/etc.), requests VRF randomness when needed, and submits them through the connected Starknet account (`src/desktop/contexts/GameDirector.tsx:302–357`).
- The transaction receipt is translated into normalized game events inside `useSystemCalls.executeAction`; those events are returned to the director (`src/dojo/useSystemCalls.ts:63–84`).

### Event Processing Loop
- Returned events are queued and processed one by one; for each event type the director mutates store slices (adventurer stats, bag contents, beasts, market items, logs, overlays) and optionally triggers UI cues like videos or inventory panels (`src/desktop/contexts/GameDirector.tsx:223–299`).
- Before submitting new actions, `useSystemCalls` compares the latest on-chain `action_count` with the local snapshot to ensure the previous move has been finalized, preventing race conditions (`src/dojo/useSystemCalls.ts:128–137`).

## Item System & Metadata

### Raw Data vs Derived Metadata
- Raw item data arrives from chain: `getGameState` (`src/api/starknet.ts:131–262`) decodes every equipment slot and bag entry as `{ id, xp }` pairs.
- `GameDirector.restoreGameState` (`src/desktop/contexts/GameDirector.tsx:192–219`) writes those plain objects into the game store, and later on every adventurer or bag event the director calls `setAdventurer`/`setBag` (`src/stores/gameStore.ts:112–199`) to refresh IDs and XP. No friendly names or types are stored—Zustand keeps the on-chain shape so XP updates continue to flow in untouched.
- Whenever the UI needs richer metadata, it derives it on the fly from the item ID. `ItemUtils` (`src/utils/loot.ts:240–360`) maps IDs to formatted names, slot, type, tier, and image paths, and `calculateLevel` (`src/utils/game.ts:7`) turns XP into levels.
- Components call these helpers at render time: e.g., the inventory overlay decorates each equipped item with `ItemUtils.getMetadata`, `ItemUtils.getItemTier`, and `calculateLevel(item.xp)` (`src/desktop/overlays/Inventory.tsx:91–158`); market generation builds `MarketItem` descriptors by running the same helpers (`src/utils/market.ts:10–33`).
- The chat box even enriches items before sending the prompt (`src/components/ChatBox.tsx:101–186`).
- Store mutations rely on the same utilities to stay consistent. When `equipItem` runs (`src/stores/gameStore.ts:141–176`) it finds the right slot via `ItemUtils.getItemSlot`, swaps the raw `{id, xp}` objects between equipment and bag, and recalculates stat bonuses with `ItemUtils.addItemBoosts` / `removeItemBoosts` (which read the item's current level and specials). Because all derived attributes are computed from the stored id and xp, any chain update that changes XP or swaps items automatically propagates through the next event without extra bookkeeping.

## Market Pricing & Potions

### Market Items
- Market items are generated client-side with `generateMarketItems`, which applies `ItemUtils.getItemPrice` (tier-based base price minus 1g-per-Charisma discount, floor 1g) for each `marketItemIds` entry.
- Price derives entirely from helper utilities. `TIER_PRICE` (4) sets the base increment per tier (`src/constants/game.ts:1`). `ItemUtils.getItemBasePrice` multiplies that constant by tier weights (T1→20g, …, T5→4g) and `getItemPrice` subtracts a 1g-per-Charisma discount down to a hard 1g floor (`src/utils/loot.ts:266–283`).
- Market listings are materialized client-side. `generateMarketItems` maps the on-chain `marketItemIds` to `MarketItem` objects by calling `ItemUtils.getItemTier`, `getItemName`, `getItemSlot`, and the price helper with the current Charisma (`src/utils/market.ts:10–33`). Both market overlays then render from this derived array (`src/desktop/overlays/Market.tsx:116`, `src/mobile/containers/MarketScreen.tsx:94`).

### Potion Pricing
- Potion costs follow `potionPrice(level, charisma) = max(1, level - 2×CHA)`; both desktop/mobile overlays recompute totals from the latest `adventurer` state and the cart in `useMarketStore`.
- Potion price is always derived on demand via `potionPrice(level, charisma)` which enforces `Math.max(1, level - charisma * 2)` (`src/utils/market.ts:37`). Callers feed it the live adventurer level from `calculateLevel(adventurer?.xp || 0)` (`src/utils/game.ts:7`) and the current Charisma stat, so every render reflects the latest on-chain stats.
- Both market UIs recalc the cost straight from store state: desktop overlay at `src/desktop/overlays/Market.tsx:184` (and the mobile screen at `src/mobile/containers/MarketScreen.tsx:152`) recompute `potionCost`, use it in totals and purchase limits, and even compare against a no-Charisma baseline to display the discount (`src/desktop/overlays/Market.tsx:300`).
- When the adventurer's XP/Charisma/Gold update, GameDirector pushes the fresh adventurer object into the Zustand game store (`src/desktop/contexts/GameDirector.tsx:201` and `:225`), so every component reading `useGameStore` re-renders with the new potion math.

### Cart State Management
- `useMarketStore` tracks selected items and potions; `clearCart` resets quantities when inventory, gold, or Charisma changes to keep projected spend accurate.
- Cart state persists in the market store. `useMarketStore` keeps a cart of selected `MarketItems` plus a potion count (`src/stores/marketStore.ts:12–55`). When a player adds an item, the entire `MarketItem`—including the computed price—gets pushed into the cart. Totals such as `totalCost`, gold remaining, and potion affordability are recalculated each render using those stored prices (`src/desktop/overlays/Market.tsx:184–191`; mobile equivalent at `src/mobile/containers/MarketScreen.tsx:152–160`).
- The amount of potions queued for purchase lives in the market store's cart (`src/stores/marketStore.ts:19–:55`); `setPotions` updates that count, and the market overlay clears the cart whenever market listings, gold, or Charisma change to keep the queued cost in sync (`src/desktop/overlays/Market.tsx:83–:92`).
- Charisma reflows value through the UI. Price derivation always reads `adventurer.stats.charisma`, and the overlays recompute potion and item costs whenever the store emits new adventurer data. Notably, both desktop and mobile `useMemo` calls only depend on `marketItemIds` and gold; a Charisma change triggers a render but won't recompute the memoized list, so prices in memory can lag until the dependency array is adjusted.

## Chat System Architecture

### Components
- `src/components/ChatToggle.tsx:1` is just the floating FAB: it renders a styled Fab that sits bottom-right and calls the provided onClick, which `App.tsx` uses to swap between the toggle and the chat box.
- `src/components/ChatBox.tsx:1` manages the full chat workflow: it pulls the entire game state from `useGameStore`, enriches equipment and bag entries with derived metadata, computes combat projections, scrubs BigInts, and POSTs messages + gameContext to `/api/chat`; it also auto-seeds the convo with "what do i do? respond in 1 sentence." on first mount and keeps the scroll pinned to the bottom.
- `src/components/ChatBox.tsx:170` shows how combat stats get appended (damage projections, flee odds, etc.) and serialized before the network call; failures surface as an in-channel error message.

### API Integration
- `api/server.js:1` exposes the `/api/chat` endpoint via Express, hydrates a massive system prompt that embeds the rich game-state summary sent from the client, and streams the OpenAI response back as plain text using streamText.
- The request/response loop is synchronous HTTP: the client waits for the server's streamed text, appends it as an assistant message, and the toggle simply hides/shows the chat while leaving the in-memory history intact.

## Testing Guidelines
- Automated tests are not yet defined; when adding them, prefer Vitest + React Testing Library alongside components (`Component.test.tsx`).
- Always run `pnpm lint` and `pnpm build` before opening a PR; document manual QA that covers desktop/mobile flows, audio behavior, and AI chat responses.
- Capture and attach console logs for API changes, especially prompt updates inside `api/server.js`.

## Commit & Pull Request Guidelines
- Follow house style from `git log`: short, present-tense summaries without capitalization (`fix sound`, `update metagame-sdk`); add a scope prefix only when it clarifies impact.
- PRs should explain intent, list user-visible changes, link issues, and include screenshots or clips for UI/UX adjustments on both layouts.
- Note any config or manifest updates explicitly and confirm you've run `pnpm lint`, `pnpm build`, and relevant manual checks.

## Environment & Configuration
- Secrets such as `OPENAI_API_KEY` load from `.env` or `.env.local`; never commit real keys. Provide sample values in the PR description when reviewers need context.
- Keep manifest updates (`manifest_*.json`) aligned with backend deployments; coordinate with the ops team before altering network endpoints.