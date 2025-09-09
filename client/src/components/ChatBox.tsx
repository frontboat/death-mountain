import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Paper, Typography, styled } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useGameStore } from '@/stores/gameStore';
import { ItemUtils } from '@/utils/loot';
import { calculateCombatStats, calculateAttackDamage, calculateBeastDamage, ability_based_percentage, calculateLevel } from '@/utils/game';

const ChatContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  width: 350,
  height: 500,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 8,
  zIndex: 1000,
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}));

const Message = styled(Box)<{ isUser: boolean }>(({ theme, isUser }) => ({
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  maxWidth: '80%',
  padding: '8px 12px',
  borderRadius: '12px',
  backgroundColor: isUser ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)',
  border: `1px solid ${isUser ? 'rgba(76, 175, 80, 0.4)' : 'rgba(255, 255, 255, 0.2)'}`,
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: '16px',
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  gap: '8px',
}));

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
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get all game state from the store
  const gameState = useGameStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send initial message on first open
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      handleSendMessage("what do i do? respond in 1 sentence.");
    }
  }, [hasInitialized]);

  const handleSendMessage = async (messageText: string) => {
    if (isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare game context with all state information
    // Add item names and levels to equipment for better context
    // Remove action_count as it's not gameplay relevant
    const enrichedAdventurer = gameState.adventurer ? {
      ...gameState.adventurer,
      action_count: undefined, // Remove internal tracking field
      level: calculateLevel(gameState.adventurer.xp), // Add adventurer level
      equipment: gameState.adventurer.equipment ? {
        weapon: gameState.adventurer.equipment.weapon ? {
          ...gameState.adventurer.equipment.weapon,
          name: gameState.adventurer.equipment.weapon.id ? ItemUtils.getItemName(gameState.adventurer.equipment.weapon.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.weapon.xp),
          type: gameState.adventurer.equipment.weapon.id ? ItemUtils.getItemType(gameState.adventurer.equipment.weapon.id) : null,
          tier: gameState.adventurer.equipment.weapon.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.weapon.id) : null
        } : null,
        chest: gameState.adventurer.equipment.chest ? {
          ...gameState.adventurer.equipment.chest,
          name: gameState.adventurer.equipment.chest.id ? ItemUtils.getItemName(gameState.adventurer.equipment.chest.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.chest.xp),
          type: gameState.adventurer.equipment.chest.id ? ItemUtils.getItemType(gameState.adventurer.equipment.chest.id) : null,
          tier: gameState.adventurer.equipment.chest.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.chest.id) : null
        } : null,
        head: gameState.adventurer.equipment.head ? {
          ...gameState.adventurer.equipment.head,
          name: gameState.adventurer.equipment.head.id ? ItemUtils.getItemName(gameState.adventurer.equipment.head.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.head.xp),
          type: gameState.adventurer.equipment.head.id ? ItemUtils.getItemType(gameState.adventurer.equipment.head.id) : null,
          tier: gameState.adventurer.equipment.head.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.head.id) : null
        } : null,
        waist: gameState.adventurer.equipment.waist ? {
          ...gameState.adventurer.equipment.waist,
          name: gameState.adventurer.equipment.waist.id ? ItemUtils.getItemName(gameState.adventurer.equipment.waist.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.waist.xp),
          type: gameState.adventurer.equipment.waist.id ? ItemUtils.getItemType(gameState.adventurer.equipment.waist.id) : null,
          tier: gameState.adventurer.equipment.waist.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.waist.id) : null
        } : null,
        foot: gameState.adventurer.equipment.foot ? {
          ...gameState.adventurer.equipment.foot,
          name: gameState.adventurer.equipment.foot.id ? ItemUtils.getItemName(gameState.adventurer.equipment.foot.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.foot.xp),
          type: gameState.adventurer.equipment.foot.id ? ItemUtils.getItemType(gameState.adventurer.equipment.foot.id) : null,
          tier: gameState.adventurer.equipment.foot.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.foot.id) : null
        } : null,
        hand: gameState.adventurer.equipment.hand ? {
          ...gameState.adventurer.equipment.hand,
          name: gameState.adventurer.equipment.hand.id ? ItemUtils.getItemName(gameState.adventurer.equipment.hand.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.hand.xp),
          type: gameState.adventurer.equipment.hand.id ? ItemUtils.getItemType(gameState.adventurer.equipment.hand.id) : null,
          tier: gameState.adventurer.equipment.hand.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.hand.id) : null
        } : null,
        neck: gameState.adventurer.equipment.neck ? {
          ...gameState.adventurer.equipment.neck,
          name: gameState.adventurer.equipment.neck.id ? ItemUtils.getItemName(gameState.adventurer.equipment.neck.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.neck.xp),
          type: gameState.adventurer.equipment.neck.id ? ItemUtils.getItemType(gameState.adventurer.equipment.neck.id) : null,
          tier: gameState.adventurer.equipment.neck.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.neck.id) : null
        } : null,
        ring: gameState.adventurer.equipment.ring ? {
          ...gameState.adventurer.equipment.ring,
          name: gameState.adventurer.equipment.ring.id ? ItemUtils.getItemName(gameState.adventurer.equipment.ring.id) : null,
          level: calculateLevel(gameState.adventurer.equipment.ring.xp),
          type: gameState.adventurer.equipment.ring.id ? ItemUtils.getItemType(gameState.adventurer.equipment.ring.id) : null,
          tier: gameState.adventurer.equipment.ring.id ? ItemUtils.getItemTier(gameState.adventurer.equipment.ring.id) : null
        } : null,
      } : null
    } : null;

    const enrichedBag = gameState.bag ? gameState.bag.map(item => ({
      ...item,
      name: item.id ? ItemUtils.getItemName(item.id) : null,
      level: calculateLevel(item.xp),
      type: item.id ? ItemUtils.getItemType(item.id) : null,
      tier: item.id ? ItemUtils.getItemTier(item.id) : null
    })) : [];

    // Calculate ability percentages
    const abilityPercentages = gameState.adventurer ? {
      fleeChance: ability_based_percentage(gameState.adventurer.xp, gameState.adventurer.stats.dexterity),
      obstacleAvoidance: ability_based_percentage(gameState.adventurer.xp, gameState.adventurer.stats.intelligence),
      ambushAvoidance: ability_based_percentage(gameState.adventurer.xp, gameState.adventurer.stats.wisdom)
    } : null;

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
    if (gameState.adventurer && gameState.beast) {
      combatStats = calculateCombatStats(gameState.adventurer, gameState.bag || [], gameState.beast);
      
      // Add specific damage calculations
      const attackDamage = calculateAttackDamage(gameState.adventurer.equipment.weapon, gameState.adventurer, gameState.beast);
      combatStats = {
        ...combatStats,
        yourDamage: attackDamage,
        beastDamageToYou: {
          head: gameState.adventurer.equipment.head ? calculateBeastDamage(gameState.beast, gameState.adventurer, gameState.adventurer.equipment.head) : 0,
          chest: gameState.adventurer.equipment.chest ? calculateBeastDamage(gameState.beast, gameState.adventurer, gameState.adventurer.equipment.chest) : 0,
          waist: gameState.adventurer.equipment.waist ? calculateBeastDamage(gameState.beast, gameState.adventurer, gameState.adventurer.equipment.waist) : 0,
          hand: gameState.adventurer.equipment.hand ? calculateBeastDamage(gameState.beast, gameState.adventurer, gameState.adventurer.equipment.hand) : 0,
          foot: gameState.adventurer.equipment.foot ? calculateBeastDamage(gameState.beast, gameState.adventurer, gameState.adventurer.equipment.foot) : 0,
        }
      };
    }

    const gameContext = {
      gameId: gameState.gameId,
      gameSettings: serializeBigInt(gameState.gameSettings),
      adventurer: serializeBigInt(enrichedAdventurer),
      adventurerState: serializeBigInt({...gameState.adventurerState, action_count: undefined}),
      bag: serializeBigInt(enrichedBag),
      beast: serializeBigInt(gameState.beast),
      combatStats: serializeBigInt(combatStats),
      abilityPercentages: abilityPercentages,
      showBeastRewards: gameState.showBeastRewards,
      newMarket: gameState.newMarket,
      marketItemIds: gameState.marketItemIds,
      newInventoryItems: gameState.newInventoryItems,
      metadata: serializeBigInt(gameState.metadata),
      battleEvent: serializeBigInt(gameState.battleEvent),
      quest: serializeBigInt(gameState.quest),
      collectable: serializeBigInt(gameState.collectable),
      collectableCount: gameState.collectableCount,
      selectedStats: gameState.selectedStats,
    };
    
    // Log for debugging
    console.log('Sending game context:', gameContext);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
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

  const handleSend = () => {
    if (!input.trim()) return;
    handleSendMessage(input.trim());
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ChatContainer elevation={3}>
      <ChatHeader>
        <Typography variant="h6" sx={{ color: 'white' }}>
          wat do?
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </ChatHeader>

      <MessagesContainer>
        {messages.length === 0 && (
          <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
            Ask me anything about your adventure!
          </Typography>
        )}
        {messages.map((message) => (
          <Message key={message.id} isUser={message.role === 'user'}>
            <Typography sx={{ color: 'white', fontSize: '14px' }}>
              {message.content}
            </Typography>
          </Message>
        ))}
        {isLoading && (
          <Message isUser={false}>
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
              Thinking...
            </Typography>
          </Message>
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgba(76, 175, 80, 0.5)',
              },
            },
          }}
          size="small"
        />
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          sx={{
            color: input.trim() && !isLoading ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <SendIcon />
        </IconButton>
      </InputContainer>
    </ChatContainer>
  );
};