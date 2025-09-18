import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, CircularProgress, IconButton, Paper, Typography, styled } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import { useGameStore } from '@/stores/gameStore';
import { STARTING_HEALTH } from '@/constants/game';
import { ItemUtils } from '@/utils/loot';
import { calculateCombatStats, calculateAttackDamage, calculateBeastDamage, ability_based_percentage, calculateLevel } from '@/utils/game';

const buildGameStateSummary = (ctx: any): string => {
  if (!ctx || typeof ctx !== 'object') return '';

  const lines: string[] = ['CURRENT GAME STATE:'];
  lines.push(ctx.gameId ? `Game ID: ${ctx.gameId}` : 'No active game');

  const adventurer = ctx.adventurer;
  if (adventurer) {
    lines.push('');
    lines.push('Adventurer:');
    lines.push(`- Level: ${adventurer.level || 1}`);
    lines.push(`- Health: ${adventurer.health || 0}`);
    lines.push(`- Max Health: ${adventurer.max_health || adventurer.health || 0}`);
    lines.push(`- XP: ${adventurer.xp || 0}`);
    lines.push(`- Gold: ${adventurer.gold || 0}`);
    lines.push(`- Beast Health: ${adventurer.beast_health || 0}`);
    lines.push(`- Stat Upgrades Available: ${adventurer.stat_upgrades_available || 0}`);
    if (adventurer.stats) {
      const stats = adventurer.stats;
      lines.push(`- Stats: Strength ${stats.strength || 0}, Dexterity ${stats.dexterity || 0}, Vitality ${stats.vitality || 0}, Intelligence ${stats.intelligence || 0}, Wisdom ${stats.wisdom || 0}, Charisma ${stats.charisma || 0}, Luck ${stats.luck || 0}`);
    }

    if (adventurer.equipment) {
      const eq = adventurer.equipment;
      lines.push('- Equipment:');
      lines.push(`  * Weapon: ${eq.weapon && eq.weapon.id ? `${eq.weapon.name || `Item #${eq.weapon.id}`} [T${eq.weapon.tier || '?'} ${eq.weapon.type || 'Unknown'}, Level ${eq.weapon.level || 1}]` : 'None'}`);
      lines.push(`  * Chest: ${eq.chest && eq.chest.id ? `${eq.chest.name || `Item #${eq.chest.id}`} [T${eq.chest.tier || '?'} ${eq.chest.type || 'Unknown'}, Level ${eq.chest.level || 1}]` : 'None'}`);
      lines.push(`  * Head: ${eq.head && eq.head.id ? `${eq.head.name || `Item #${eq.head.id}`} [T${eq.head.tier || '?'} ${eq.head.type || 'Unknown'}, Level ${eq.head.level || 1}]` : 'None'}`);
      lines.push(`  * Waist: ${eq.waist && eq.waist.id ? `${eq.waist.name || `Item #${eq.waist.id}`} [T${eq.waist.tier || '?'} ${eq.waist.type || 'Unknown'}, Level ${eq.waist.level || 1}]` : 'None'}`);
      lines.push(`  * Foot: ${eq.foot && eq.foot.id ? `${eq.foot.name || `Item #${eq.foot.id}`} [T${eq.foot.tier || '?'} ${eq.foot.type || 'Unknown'}, Level ${eq.foot.level || 1}]` : 'None'}`);
      lines.push(`  * Hand: ${eq.hand && eq.hand.id ? `${eq.hand.name || `Item #${eq.hand.id}`} [T${eq.hand.tier || '?'} ${eq.hand.type || 'Unknown'}, Level ${eq.hand.level || 1}]` : 'None'}`);
      lines.push(`  * Neck: ${eq.neck && eq.neck.id ? `${eq.neck.name || `Item #${eq.neck.id}`} [T${eq.neck.tier || '?'} ${eq.neck.type || 'Unknown'}, Level ${eq.neck.level || 1}]` : 'None'}`);
      lines.push(`  * Ring: ${eq.ring && eq.ring.id ? `${eq.ring.name || `Item #${eq.ring.id}`} [T${eq.ring.tier || '?'} ${eq.ring.type || 'Unknown'}, Level ${eq.ring.level || 1}]` : 'None'}`);
    } else {
      lines.push('- Equipment: No equipment');
    }
  } else {
    lines.push('');
    lines.push('No adventurer created');
  }

  const beast = ctx.beast;
  if (beast) {
    lines.push('');
    lines.push('Current Beast:');
    lines.push(`- Name: ${beast.name || 'Unknown Beast'}`);
    lines.push(`- Level: ${beast.level || 0}`);
    lines.push(`- Health: ${beast.health || 0}`);
    lines.push(`- Type: ${beast.type || 'Unknown'}`);
  } else {
    lines.push('');
    lines.push('No beast encountered');
  }

  if (Array.isArray(ctx.bag) && ctx.bag.length > 0) {
    lines.push('');
    lines.push(`Bag Items: ${ctx.bag.map((item: any) => `${item.name} [T${item.tier || '?'} ${item.type || 'Unknown'}, Level ${item.level || 1}]`).join(', ')}`);
  }

  if (ctx.abilityPercentages) {
    const { fleeChance, obstacleAvoidance, ambushAvoidance } = ctx.abilityPercentages;
    lines.push('');
    lines.push('ABILITY CHANCES:');
    lines.push(`- Flee Success: ${fleeChance}%`);
    lines.push(`- Obstacle Avoidance: ${obstacleAvoidance}%`);
    lines.push(`- Ambush Avoidance: ${ambushAvoidance}%`);
  }

  if (ctx.quest) {
    lines.push('');
    lines.push(`Active Quest: ${ctx.quest.name || 'Unknown Quest'}`);
  }

  if (ctx.collectableCount) {
    lines.push('');
    lines.push(`Beasts Collected: ${ctx.collectableCount}`);
  }

  if (ctx.combatStats) {
    const combat = ctx.combatStats;
    lines.push('');
    lines.push('COMBAT ANALYSIS:');
    lines.push(`- Your Base Damage: ${combat.yourDamage?.baseDamage || 0}`);
    lines.push(`- Your Critical Damage: ${combat.yourDamage?.criticalDamage || 0}`);
    if (combat.beastDamageToYou) {
      const damageMap = combat.beastDamageToYou;
      lines.push('- Beast Damage to You:');
      lines.push(`  * If hitting Head: ${damageMap.head || 0}`);
      lines.push(`  * If hitting Chest: ${damageMap.chest || 0}`);
      lines.push(`  * If hitting Waist: ${damageMap.waist || 0}`);
      lines.push(`  * If hitting Hand: ${damageMap.hand || 0}`);
      lines.push(`  * If hitting Foot: ${damageMap.foot || 0}`);
    }
    lines.push(`- Best Available Damage: ${combat.bestDamage || 0}`);
    lines.push(`- Current Protection: ${combat.protection || 0}`);
    lines.push(`- Best Available Protection: ${combat.bestProtection || 0}`);
    lines.push(`- Gear Score: ${combat.gearScore || 0}`);
    if (Array.isArray(combat.bestItems) && combat.bestItems.length > 0) {
      lines.push(`- Recommended Equipment: ${combat.bestItems.map((item: any) => item.name || `Item #${item.id}`).join(', ')}`);
    }
  }

  const combatOutlook = ctx.combatOutlook;
  if (combatOutlook) {
    lines.push('');
    lines.push('COMBAT OUTLOOK:');
    if (combatOutlook.roundsToDefeatBeast !== null && combatOutlook.roundsToDefeatBeast !== undefined) {
      lines.push(`- Rounds to defeat beast: ${combatOutlook.roundsToDefeatBeast}`);
    }
    if (combatOutlook.roundsToDie !== null && combatOutlook.roundsToDie !== undefined) {
      lines.push(`- Rounds until defeat: ${combatOutlook.roundsToDie}`);
    }
    if (combatOutlook.recommendation) {
      lines.push(`- Suggested action: ${combatOutlook.recommendation === 'fight' ? 'Fight' : 'Flee'}`);
    }
  }

  if (ctx.selectedStats) {
    const s = ctx.selectedStats;
    lines.push('');
    lines.push(`Unallocated Stat Points - Strength: ${s.strength}, Dexterity: ${s.dexterity}, Vitality: ${s.vitality}, Intelligence: ${s.intelligence}, Wisdom: ${s.wisdom}, Charisma: ${s.charisma}, Luck: ${s.luck}`);
  }

  const adventurerInCombat = Boolean(beast) || (adventurer && Number(adventurer.beast_health || 0) > 0);

  if (adventurerInCombat) {
    lines.push('');
    lines.push('Market not available during combat');
  } else if (Array.isArray(ctx.marketDetails) && ctx.marketDetails.length > 0) {
    lines.push('');
    lines.push('Market Items:');
    ctx.marketDetails.forEach((item: any) => {
      lines.push(`- Item #${item.id}: ${item.slot} | ${item.type} | ${item.tierLabel} | ${item.price} gold`);
    });
  }

  if (typeof ctx.potionCost === 'number') {
    lines.push('');
    lines.push(`Potion Cost: ${ctx.potionCost} gold per potion`);
  }

  return lines.join('\n');
};

const AdviceContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 118,
  left: 228,
  transform: 'translateX(-32px)',
  zIndex: 1100,
}));

const AdviceCard = styled(Paper)(({ theme }) => ({
  background: 'rgba(24, 40, 24, 0.95)',
  border: '2px solid #083e22',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  padding: theme.spacing(2.5),
  minWidth: 320,
  maxWidth: 360,
  color: '#e6d28a',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const AdviceText = styled(Typography)(({ theme }) => ({
  fontSize: '0.92rem',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
}));

const computeCombatOutlook = (adventurer: any, beast: any, combatStats: any) => {
  if (!adventurer || !beast || !combatStats) {
    return null;
  }

  const damagePerTurn = combatStats?.yourDamage?.baseDamage || combatStats?.bestDamage || 0;
  const beastHealth = Number(beast.health || 0);
  const currentHealth = Number(adventurer.health || 0);

  let roundsToDefeatBeast: number | null = null;
  if (damagePerTurn > 0 && beastHealth > 0) {
    roundsToDefeatBeast = Math.ceil(beastHealth / damagePerTurn);
  }

  let roundsToDie: number | null = null;
  const damageMap = combatStats?.beastDamageToYou;
  if (damageMap) {
    const values = [damageMap.head, damageMap.chest, damageMap.waist, damageMap.hand, damageMap.foot]
      .map((v) => Number(v || 0))
      .filter((v) => v > 0);
    if (values.length > 0) {
      const averageDamage = values.reduce((sum, value) => sum + value, 0) / values.length;
      if (averageDamage > 0 && currentHealth > 0) {
        roundsToDie = Math.ceil(currentHealth / averageDamage);
      }
    }
  }

  let recommendation: 'fight' | 'flee' | null = null;
  if (roundsToDefeatBeast !== null && roundsToDie !== null) {
    recommendation = roundsToDefeatBeast <= roundsToDie ? 'fight' : 'flee';
  }

  if (roundsToDefeatBeast === null && roundsToDie === null) {
    return null;
  }

  return {
    roundsToDefeatBeast,
    roundsToDie,
    recommendation,
  };
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBoxProps {
  onClose: () => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const gameStateRef = useRef(useGameStore.getState());

  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state) => {
      gameStateRef.current = state;
    });

    return unsubscribe;
  }, []);

  // Auto-send initial message on first open
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      handleSendMessage('what do i do? respond in 1 sentence.', { includeSummary: true });
    }
  }, [hasInitialized]);

  const handleSendMessage = async (messageText: string, options: { includeSummary?: boolean } = {}) => {
    if (isLoading) return;

    const currentState = gameStateRef.current;
    const { includeSummary = false } = options;

    setIsLoading(true);

    // Prepare game context with all state information
    // Add item names and levels to equipment for better context
    // Remove action_count as it's not gameplay relevant
    const adventurerMaxHealth = currentState.adventurer ? STARTING_HEALTH + (currentState.adventurer.stats?.vitality || 0) * 15 : null;

    const enrichedAdventurer = currentState.adventurer ? {
      ...currentState.adventurer,
      action_count: undefined, // Remove internal tracking field
      level: calculateLevel(currentState.adventurer.xp), // Add adventurer level
      max_health: adventurerMaxHealth,
      equipment: currentState.adventurer.equipment ? {
        weapon: currentState.adventurer.equipment.weapon ? {
          ...currentState.adventurer.equipment.weapon,
          name: currentState.adventurer.equipment.weapon.id ? ItemUtils.getItemName(currentState.adventurer.equipment.weapon.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.weapon.xp),
          type: currentState.adventurer.equipment.weapon.id ? ItemUtils.getItemType(currentState.adventurer.equipment.weapon.id) : null,
          tier: currentState.adventurer.equipment.weapon.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.weapon.id) : null
        } : null,
        chest: currentState.adventurer.equipment.chest ? {
          ...currentState.adventurer.equipment.chest,
          name: currentState.adventurer.equipment.chest.id ? ItemUtils.getItemName(currentState.adventurer.equipment.chest.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.chest.xp),
          type: currentState.adventurer.equipment.chest.id ? ItemUtils.getItemType(currentState.adventurer.equipment.chest.id) : null,
          tier: currentState.adventurer.equipment.chest.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.chest.id) : null
        } : null,
        head: currentState.adventurer.equipment.head ? {
          ...currentState.adventurer.equipment.head,
          name: currentState.adventurer.equipment.head.id ? ItemUtils.getItemName(currentState.adventurer.equipment.head.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.head.xp),
          type: currentState.adventurer.equipment.head.id ? ItemUtils.getItemType(currentState.adventurer.equipment.head.id) : null,
          tier: currentState.adventurer.equipment.head.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.head.id) : null
        } : null,
        waist: currentState.adventurer.equipment.waist ? {
          ...currentState.adventurer.equipment.waist,
          name: currentState.adventurer.equipment.waist.id ? ItemUtils.getItemName(currentState.adventurer.equipment.waist.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.waist.xp),
          type: currentState.adventurer.equipment.waist.id ? ItemUtils.getItemType(currentState.adventurer.equipment.waist.id) : null,
          tier: currentState.adventurer.equipment.waist.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.waist.id) : null
        } : null,
        foot: currentState.adventurer.equipment.foot ? {
          ...currentState.adventurer.equipment.foot,
          name: currentState.adventurer.equipment.foot.id ? ItemUtils.getItemName(currentState.adventurer.equipment.foot.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.foot.xp),
          type: currentState.adventurer.equipment.foot.id ? ItemUtils.getItemType(currentState.adventurer.equipment.foot.id) : null,
          tier: currentState.adventurer.equipment.foot.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.foot.id) : null
        } : null,
        hand: currentState.adventurer.equipment.hand ? {
          ...currentState.adventurer.equipment.hand,
          name: currentState.adventurer.equipment.hand.id ? ItemUtils.getItemName(currentState.adventurer.equipment.hand.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.hand.xp),
          type: currentState.adventurer.equipment.hand.id ? ItemUtils.getItemType(currentState.adventurer.equipment.hand.id) : null,
          tier: currentState.adventurer.equipment.hand.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.hand.id) : null
        } : null,
        neck: currentState.adventurer.equipment.neck ? {
          ...currentState.adventurer.equipment.neck,
          name: currentState.adventurer.equipment.neck.id ? ItemUtils.getItemName(currentState.adventurer.equipment.neck.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.neck.xp),
          type: currentState.adventurer.equipment.neck.id ? ItemUtils.getItemType(currentState.adventurer.equipment.neck.id) : null,
          tier: currentState.adventurer.equipment.neck.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.neck.id) : null
        } : null,
        ring: currentState.adventurer.equipment.ring ? {
          ...currentState.adventurer.equipment.ring,
          name: currentState.adventurer.equipment.ring.id ? ItemUtils.getItemName(currentState.adventurer.equipment.ring.id) : null,
          level: calculateLevel(currentState.adventurer.equipment.ring.xp),
          type: currentState.adventurer.equipment.ring.id ? ItemUtils.getItemType(currentState.adventurer.equipment.ring.id) : null,
          tier: currentState.adventurer.equipment.ring.id ? ItemUtils.getItemTier(currentState.adventurer.equipment.ring.id) : null
        } : null,
      } : null
    } : null;

    const enrichedBag = currentState.bag ? currentState.bag.map(item => ({
      ...item,
      name: item.id ? ItemUtils.getItemName(item.id) : null,
      level: calculateLevel(item.xp),
      type: item.id ? ItemUtils.getItemType(item.id) : null,
      tier: item.id ? ItemUtils.getItemTier(item.id) : null
    })) : [];

    // Calculate ability percentages
    const abilityPercentages = currentState.adventurer ? {
      fleeChance: ability_based_percentage(currentState.adventurer.xp, currentState.adventurer.stats.dexterity),
      obstacleAvoidance: ability_based_percentage(currentState.adventurer.xp, currentState.adventurer.stats.intelligence),
      ambushAvoidance: ability_based_percentage(currentState.adventurer.xp, currentState.adventurer.stats.wisdom)
    } : null;

    const adventurerLevel = currentState.adventurer ? calculateLevel(currentState.adventurer.xp) : null;
    const adventurerCharisma = currentState.adventurer?.stats?.charisma || 0;
    const potionCost = adventurerLevel !== null
      ? Math.max(1, adventurerLevel - adventurerCharisma * 2)
      : null;

    const marketDetails = Array.isArray(currentState.marketItemIds)
      ? currentState.marketItemIds
        .map((rawId) => {
          const id = Number(rawId);
          if (!Number.isFinite(id) || id <= 0) {
            return null;
          }
          const tier = ItemUtils.getItemTier(id);
          return {
            id,
            slot: ItemUtils.getItemSlot(id),
            type: ItemUtils.getItemType(id),
            tier,
            tierLabel: tier ? `T${tier}` : 'None',
            price: ItemUtils.getItemPrice(tier, adventurerCharisma),
          };
        })
        .filter(Boolean)
      : [];

    // Helper to convert BigInt to string for JSON serialization
    const serializeBigInt = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(serializeBigInt);
      if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = serializeBigInt(obj[key]);
        }
        return result;
      }
      return obj;
    };

    // Calculate combat stats if in battle
    let combatStats = null;
    if (currentState.adventurer && currentState.beast) {
      combatStats = calculateCombatStats(currentState.adventurer, currentState.bag || [], currentState.beast);
      
      // Add specific damage calculations
      const attackDamage = calculateAttackDamage(currentState.adventurer.equipment.weapon, currentState.adventurer, currentState.beast);
      combatStats = {
        ...combatStats,
        yourDamage: attackDamage,
        beastDamageToYou: {
          head: currentState.adventurer.equipment.head ? calculateBeastDamage(currentState.beast, currentState.adventurer, currentState.adventurer.equipment.head) : 0,
          chest: currentState.adventurer.equipment.chest ? calculateBeastDamage(currentState.beast, currentState.adventurer, currentState.adventurer.equipment.chest) : 0,
          waist: currentState.adventurer.equipment.waist ? calculateBeastDamage(currentState.beast, currentState.adventurer, currentState.adventurer.equipment.waist) : 0,
          hand: currentState.adventurer.equipment.hand ? calculateBeastDamage(currentState.beast, currentState.adventurer, currentState.adventurer.equipment.hand) : 0,
          foot: currentState.adventurer.equipment.foot ? calculateBeastDamage(currentState.beast, currentState.adventurer, currentState.adventurer.equipment.foot) : 0,
        }
      };
    }

    const combatOutlook = computeCombatOutlook(currentState.adventurer, currentState.beast, combatStats);

    const gameContext = {
      gameId: currentState.gameId,
      gameSettings: serializeBigInt(currentState.gameSettings),
      adventurer: serializeBigInt(enrichedAdventurer),
      adventurerState: serializeBigInt({ ...currentState.adventurerState, action_count: undefined }),
      bag: serializeBigInt(enrichedBag),
      beast: serializeBigInt(currentState.beast),
      combatStats: serializeBigInt(combatStats),
      abilityPercentages: abilityPercentages,
      showBeastRewards: currentState.showBeastRewards,
      newMarket: currentState.newMarket,
      marketItemIds: currentState.marketItemIds,
      newInventoryItems: currentState.newInventoryItems,
      metadata: serializeBigInt(currentState.metadata),
      battleEvent: serializeBigInt(currentState.battleEvent),
      quest: serializeBigInt(currentState.quest),
      collectable: serializeBigInt(currentState.collectable),
      selectedStats: currentState.selectedStats,
      marketDetails,
      potionCost,
      combatOutlook,
    };
    
    const stateSummary = buildGameStateSummary(gameContext);

    let finalMessageText = messageText;
    if (includeSummary && stateSummary) {
      finalMessageText = `${messageText}\n\n${stateSummary}`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: finalMessageText,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Log for debugging
    console.log('Sending game context:', gameContext);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          gameContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const text = await response.text();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const latestAdvice = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastUpdated = latestAdvice ? new Date(Number(latestAdvice.id)) : null;

  return (
    <AdviceContainer>
      <AdviceCard elevation={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ color: '#d0c98d', fontFamily: 'Cinzel, Georgia, serif' }}>
            wat do?
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: '#d0c98d' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {isLoading ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={2}>
            <CircularProgress size={20} sx={{ color: '#d0c98d' }} />
            <Typography sx={{ ml: 1.5, fontSize: '0.85rem' }}>Consulting the dungeon...</Typography>
          </Box>
        ) : (
          <AdviceText>
            {latestAdvice ? latestAdvice.content : 'No advice yet. Try refreshing for a new hint.'}
          </AdviceText>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon fontSize="small" />}
            disabled={isLoading}
            onClick={() => handleSendMessage('what do i do? respond in 1 sentence.', { includeSummary: true })}
            sx={{
              borderColor: '#0b3d24',
              color: '#d0c98d',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#145d37',
                backgroundColor: 'rgba(20, 93, 55, 0.15)',
              },
            }}
          >
            Refresh advice
          </Button>
          {lastUpdated && (
            <Typography sx={{ fontSize: '0.75rem', opacity: 0.7 }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </AdviceCard>
    </AdviceContainer>
  );
};
