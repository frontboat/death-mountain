import React, { useState, useRef, useEffect } from "react";
import { useDaydreamsGame, useGameCommands } from "./useDaydreamsGame";
import { useGameStore } from "../stores/gameStore";

interface GameAIAssistantProps {
  playerId: string;
  sessionId?: string;
  className?: string;
  onClose?: () => void;
}

/**
 * AI Assistant component for the Death Mountain game
 * Provides a chat interface for interacting with the Daydreams AI
 */
export const GameAIAssistant: React.FC<GameAIAssistantProps> = ({
  playerId,
  sessionId,
  className = "",
  onClose,
}) => {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{
    type: "user" | "ai";
    message: string;
    timestamp: number;
  }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get game state
  const { gameId, adventurer } = useGameStore();

  // Initialize Daydreams integration
  const {
    isInitialized,
    isLoading,
    error,
    sendMessage,
    getAdvice,
    explainMechanic,
    retry,
  } = useDaydreamsGame({
    playerId,
    sessionId,
    autoSync: true,
  });

  // Get pre-built commands
  const commands = useGameCommands(sendMessage);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || !isInitialized) return;

    const userMessage = message.trim();
    setMessage("");

    // Add user message to chat
    setChatHistory(prev => [...prev, {
      type: "user",
      message: userMessage,
      timestamp: Date.now(),
    }]);

    try {
      const result = await sendMessage(userMessage);
      
      // Add AI response to chat
      setChatHistory(prev => [...prev, {
        type: "ai",
        message: result.response,
        timestamp: Date.now(),
      }]);
    } catch (error) {
      // Add error message to chat
      setChatHistory(prev => [...prev, {
        type: "ai",
        message: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      }]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickCommand = async (command: () => Promise<any>, commandName: string) => {
    setChatHistory(prev => [...prev, {
      type: "user",
      message: commandName,
      timestamp: Date.now(),
    }]);

    try {
      const result = await command();
      setChatHistory(prev => [...prev, {
        type: "ai",
        message: result.response,
        timestamp: Date.now(),
      }]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        type: "ai",
        message: `Error executing ${commandName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      }]);
    }
  };

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open AI Assistant"
        >
          🤖
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 h-96 bg-gray-900 rounded-lg shadow-xl border border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="text-white font-semibold">AI Assistant</h3>
        <div className="flex items-center gap-2">
          {!isInitialized && (
            <div className="text-yellow-400 text-xs">Initializing...</div>
          )}
          {error && (
            <button
              onClick={retry}
              className="text-red-400 hover:text-red-300 text-xs"
              title="Retry initialization"
            >
              Retry
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-white"
          >
            ×
          </button>
        </div>
      </div>

      {/* Status */}
      {gameId && adventurer && (
        <div className="px-3 py-2 bg-gray-800 text-xs text-gray-300">
          Game ID: {gameId} | Health: {adventurer.health} | XP: {adventurer.xp}
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chatHistory.length === 0 && (
          <div className="text-gray-400 text-sm text-center">
            Ask me anything about the game!<br/>
            Try: "What should I do next?" or "Explain combat mechanics"
          </div>
        )}
        
        {chatHistory.map((chat, index) => (
          <div
            key={index}
            className={`p-2 rounded max-w-xs ${
              chat.type === "user"
                ? "bg-blue-600 text-white ml-auto"
                : "bg-gray-700 text-gray-100"
            }`}
          >
            <div className="text-sm">{chat.message}</div>
            <div className="text-xs opacity-60 mt-1">
              {new Date(chat.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="bg-gray-700 text-gray-100 p-2 rounded max-w-xs">
            <div className="text-sm">Thinking...</div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Quick Commands */}
      <div className="px-3 py-2 border-t border-gray-700">
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => handleQuickCommand(commands.getStatus, "Get Status")}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
            disabled={!isInitialized || isLoading}
          >
            Status
          </button>
          <button
            onClick={() => handleQuickCommand(() => getAdvice(), "Get Advice")}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
            disabled={!isInitialized || isLoading}
          >
            Advice
          </button>
          <button
            onClick={() => handleQuickCommand(commands.explore, "Explore")}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded"
            disabled={!isInitialized || isLoading}
          >
            Explore
          </button>
          {adventurer?.beast_health > 0 && (
            <>
              <button
                onClick={() => handleQuickCommand(commands.attack, "Attack")}
                className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded"
                disabled={!isInitialized || isLoading}
              >
                Attack
              </button>
              <button
                onClick={() => handleQuickCommand(commands.flee, "Flee")}
                className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                disabled={!isInitialized || isLoading}
              >
                Flee
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInitialized ? "Ask me anything..." : "Initializing..."}
            disabled={!isInitialized || isLoading}
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || !isInitialized || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-2 rounded text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameAIAssistant;
