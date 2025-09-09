/**
 * Simplified Context Engine
 * Generates XML context for LLM/AI agents from the new GameState structure
 */

import { GameState, GameStateService } from '../services/GameStateService';

export class ContextEngine {
  /**
   * Generate XML context from game state
   */
  static generateContext(state: GameState): { content: string; phase: string } {
    let xml = '';
    
    switch (state.phase) {
      case 'death':
        xml = ContextEngine.buildDeathContext(state);
        break;
      case 'combat':
        xml = ContextEngine.buildCombatContext(state);
        break;
      case 'level_up':
        xml = ContextEngine.buildLevelUpContext(state);
        break;
      default:
        xml = ContextEngine.buildExplorationContext(state);
    }
    
    return {
      content: xml,
      phase: state.phase
    };
  }
  
  /**
   * Generate fresh XML context by fetching latest state from blockchain
   */
  static async generateFreshContext(gameId: number): Promise<{ content: string; phase: string }> {
    const toriiUrl = import.meta.env.VITE_PUBLIC_TORII || 'https://api.cartridge.gg/x/starknet-sepolia-dojo-1.5.1/torii';
    const namespace = import.meta.env.VITE_PUBLIC_NAMESPACE || 'deathmountain_000016000005';
    
    const service = new GameStateService({ toriiUrl, namespace });
    const freshState = await service.getGameState(gameId);
    
    return ContextEngine.generateContext(freshState);
  }
  
  private static buildDeathContext(state: GameState): string {
    const { adventurer } = state;
    
    return `<context>
  <phase>death</phase>
  <level>${adventurer.level}</level>
  <xp>${adventurer.xp}</xp>
  <gold>${adventurer.gold}</gold>
</context>`;
  }
  
  private static buildCombatContext(state: GameState): string {
    const { adventurer, beast, combatPreview } = state;
    
    const formatEquip = (item: any) => {
      if (!item) return 'None';
      return `${item.name}:L${item.level}:T${item.tier}`;
    };
    
    return `<context>
  <phase>combat</phase>
  <adventurer health="${adventurer.health}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>
  <stats str="${adventurer.stats.strength}" dex="${adventurer.stats.dexterity}" vit="${adventurer.stats.vitality}" int="${adventurer.stats.intelligence}" wis="${adventurer.stats.wisdom}" cha="${adventurer.stats.charisma}"/>
  <equipment weapon="${formatEquip(adventurer.equipment.weapon)}" chest="${formatEquip(adventurer.equipment.chest)}" head="${formatEquip(adventurer.equipment.head)}" waist="${formatEquip(adventurer.equipment.waist)}" foot="${formatEquip(adventurer.equipment.foot)}" hand="${formatEquip(adventurer.equipment.hand)}" neck="${formatEquip(adventurer.equipment.neck)}" ring="${formatEquip(adventurer.equipment.ring)}"/>
  <beast name="${beast?.name || 'Unknown'}" health="${beast?.health || 0}" level="${beast?.level || 1}" tier="${beast?.tier || 0}"/>
  <damage player="${combatPreview?.playerDamage.base || 0}" critical="${combatPreview?.playerDamage.critical || 0}" beast="${combatPreview?.beastDamage.max || 0}"/>
  <flee chance="${combatPreview?.fleeChance || 0}"/>
  <estimate>${combatPreview?.outcome || 'Unknown'}</estimate>
</context>`;
  }
  
  private static buildLevelUpContext(state: GameState): string {
    const { adventurer } = state;
    
    return `<context>
  <phase>level_up</phase>
  <level>${adventurer.level}</level>
  <points>${adventurer.statUpgradesAvailable}</points>
  <stats>
    <str>${adventurer.stats.strength}</str>
    <dex>${adventurer.stats.dexterity}</dex>
    <vit>${adventurer.stats.vitality}</vit>
    <int>${adventurer.stats.intelligence}</int>
    <wis>${adventurer.stats.wisdom}</wis>
    <cha>${adventurer.stats.charisma}</cha>
  </stats>
</context>`;
  }
  
  private static buildExplorationContext(state: GameState): string {
    const { adventurer, market, bag } = state;
    
    const formatEquip = (item: any) => {
      if (!item) return 'None';
      return `${item.name}:L${item.level}:T${item.tier}`;
    };
    
    // Get affordable market items with their IDs
    const affordableItems = market
      .filter(item => item.price <= adventurer.gold)
      .map(item => `    <item id="${item.id}">${item.name}:T${item.tier}:${item.price}g</item>`)
      .join('\n');
    
    // List all available market item IDs
    const marketIds = market
      .filter(item => item.price <= adventurer.gold)
      .map(item => item.id)
      .join(', ');
    
    // Get bag items with their IDs
    const bagItems = bag.length > 0 
      ? bag.map(item => `    <item id="${item.id}" slot="${item.bagSlot}">${item.name}:L${item.level}:T${item.tier}</item>`)
          .join('\n')
      : '    <!-- No bag items -->';
    
    return `<context>
  <phase>exploration</phase>
  <adventurer health="${adventurer.health}" level="${adventurer.level}" gold="${adventurer.gold}" xp="${adventurer.xp}"/>
  <stats str="${adventurer.stats.strength}" dex="${adventurer.stats.dexterity}" vit="${adventurer.stats.vitality}" int="${adventurer.stats.intelligence}" wis="${adventurer.stats.wisdom}" cha="${adventurer.stats.charisma}"/>
  <equipment weapon="${formatEquip(adventurer.equipment.weapon)}" chest="${formatEquip(adventurer.equipment.chest)}" head="${formatEquip(adventurer.equipment.head)}" waist="${formatEquip(adventurer.equipment.waist)}" foot="${formatEquip(adventurer.equipment.foot)}" hand="${formatEquip(adventurer.equipment.hand)}" neck="${formatEquip(adventurer.equipment.neck)}" ring="${formatEquip(adventurer.equipment.ring)}"/>
  <market>
    <!-- Available market item IDs: ${marketIds || 'none'} -->
${affordableItems || '    <!-- No affordable items -->'}
  </market>
  <bag>
${bagItems}
  </bag>
</context>`;
  }
}