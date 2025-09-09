import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { GameState as ServiceGameState } from "@/services/GameStateService";
import { useSystemCalls } from "@/dojo/useSystemCalls";
import { ContextEngine } from "./contextEngine";

// Configure OpenAI
const openai = createOpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY
});

type SystemCalls = ReturnType<typeof useSystemCalls>;

// Simple agent that mimics server.js approach
export class SimpleAgent {
  private systemCalls: SystemCalls;
  private isProcessing: boolean = false;

  constructor(systemCalls: SystemCalls) {
    this.systemCalls = systemCalls;
  }

  async processGameState(gameState: ServiceGameState): Promise<void> {
    if (this.isProcessing) {
      console.log("[SimpleAgent] Already processing, skipping");
      return;
    }

    this.isProcessing = true;
    const gameId = gameState.gameId;

    try {
      // Generate context from game state
      const contextResult = ContextEngine.generateContext(gameState);
      console.log("[SimpleAgent] Game Phase:", contextResult.phase);
      console.log("[SimpleAgent] Context:", contextResult.content);

      // Create a simple prompt based on phase
      const prompt = this.buildPrompt(gameState, contextResult);
      
      // Get AI decision
      const decision = await this.getAIDecision(prompt);
      console.log("[SimpleAgent] AI Decision:", decision);

      // Execute the decision
      await this.executeDecision(gameId, decision, gameState);

      // Wait for blockchain to settle
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error("[SimpleAgent] Error:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private buildPrompt(gameState: ServiceGameState, contextResult: { phase: string; content: string }): string {
    const basePrompt = `You are playing Loot Survivor. Respond with ONLY a JSON object containing your decision.

Current game state:
${contextResult.content}

Based on the phase "${contextResult.phase}", choose ONE action:
`;

    switch (contextResult.phase) {
      case "level_up":
        return basePrompt + `
Allocate your ${gameState.adventurer.statUpgradesAvailable} stat points.
Respond with JSON: {"action": "upgrade_stats", "stats": {"vitality": N, "strength": N, "dexterity": N, ...}}
Prioritize vitality early for survival.`;

      case "combat":
        const outcome = gameState.combatPreview?.outcome || "Unknown";
        return basePrompt + `
You're fighting ${gameState.beast?.name}. Combat prediction: ${outcome}
Options:
- If winning with acceptable damage: {"action": "attack"}
- If losing or high damage: {"action": "flee"}
Respond with JSON only.`;

      case "exploration":
        const needsHealth = gameState.adventurer.health < 50;
        const hasGold = gameState.adventurer.gold > 20;
        const affordableItems = gameState.market.filter(item => 
          item.price <= gameState.adventurer.gold && item.tier <= 2
        );
        
        return basePrompt + `
Health: ${gameState.adventurer.health}, Gold: ${gameState.adventurer.gold}
Market has ${affordableItems.length} affordable good items (T1/T2).
Options:
- If health < 50% and have gold: {"action": "buy_potions", "quantity": N}
- If good items available: {"action": "buy_items", "items": [{"item_id": ID, "equip": true}]}
- Otherwise: {"action": "explore"}
Market IDs available: ${gameState.market.map(i => i.id).join(', ')}
Respond with JSON only.`;

      case "death":
        return basePrompt + `Game over. No action possible.
{"action": "none"}`;

      default:
        return basePrompt + `{"action": "explore"}`;
    }
  }

  private async getAIDecision(prompt: string): Promise<any> {
    try {
      const result = await streamText({
        model: openai('gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: 'You are an AI playing Loot Survivor. Always respond with valid JSON only, no other text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent decisions
      });

      let fullText = '';
      for await (const textPart of result.textStream) {
        fullText += textPart;
      }

      // Parse JSON from response
      const jsonMatch = fullText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      console.warn("[SimpleAgent] No valid JSON in response:", fullText);
      return { action: "explore" }; // Default action

    } catch (error) {
      console.error("[SimpleAgent] AI decision error:", error);
      return { action: "explore" };
    }
  }

  private async executeDecision(gameId: number, decision: any, gameState: ServiceGameState): Promise<void> {
    console.log(`[SimpleAgent] Executing: ${decision.action}`);

    try {
      let call;
      
      switch (decision.action) {
        case "explore":
          call = this.systemCalls.explore(gameId, false);
          break;

        case "attack":
          call = this.systemCalls.attack(gameId, false);
          break;

        case "flee":
          call = this.systemCalls.flee(gameId, false);
          break;

        case "upgrade_stats":
          if (decision.stats) {
            const stats = {
              strength: decision.stats.strength || 0,
              dexterity: decision.stats.dexterity || 0,
              vitality: decision.stats.vitality || 0,
              intelligence: decision.stats.intelligence || 0,
              wisdom: decision.stats.wisdom || 0,
              charisma: decision.stats.charisma || 0,
              luck: 0, // Can't upgrade luck
            };
            call = this.systemCalls.selectStatUpgrades(gameId, stats);
          }
          break;

        case "buy_potions":
          const potions = decision.quantity || 1;
          call = this.systemCalls.buyItems(gameId, potions, []);
          break;

        case "buy_items":
          if (decision.items && Array.isArray(decision.items)) {
            // Use the actual item IDs from the decision
            const items = decision.items.map((item: any) => ({
              item_id: item.item_id,
              equip: item.equip || false
            }));
            call = this.systemCalls.buyItems(gameId, 0, items);
          }
          break;

        case "none":
          console.log("[SimpleAgent] Game over, no action");
          return;

        default:
          console.log("[SimpleAgent] Unknown action, exploring");
          call = this.systemCalls.explore(gameId, false);
      }

      if (call) {
        const result = await this.systemCalls.executeAction([call], () => {
          console.warn("[SimpleAgent] Action reverted");
        });
        
        if (result && result.length > 0) {
          console.log(`[SimpleAgent] Action successful: ${result.length} events`);
        }
      }

    } catch (error) {
      console.error("[SimpleAgent] Execution error:", error);
    }
  }
}