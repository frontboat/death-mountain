import React, { useState, useRef, useEffect } from "react";
import { useDaydreamsGame, useGameCommands } from "./useDaydreamsGame";
import { useGameStore } from "../stores/gameStore";
import { Box, IconButton, Paper, Typography, TextField, Button } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";

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
    getContextState,
    getGameStateSnapshot,
    syncState,
  } = useDaydreamsGame({
    playerId,
    sessionId,
    autoSync: true,
  });

  // Debug logging
  useEffect(() => {
    console.log("🤖 GameAIAssistant state:", {
      playerId,
      sessionId,
      gameId,
      adventurer,
      isInitialized,
      isLoading,
      error,
      isExpanded,
    });
  }, [playerId, sessionId, gameId, adventurer, isInitialized, isLoading, error, isExpanded]);

  const handleDumpState = async () => {
    try {
      await syncState(true);
      const ai = await getContextState();
      const ui = getGameStateSnapshot();
      console.log("🧠 AI context memory:", ai?.memory);
      console.log("📦 UI store snapshot:", ui);
    } catch (e) {
      console.warn("Failed to dump state:", e);
    }
  };

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
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 10000, // Higher than any overlay
        }}
        className={className}
      >
        <IconButton
          onClick={() => setIsExpanded(true)}
          sx={{
            width: 56,
            height: 56,
            backgroundColor: error 
              ? "#dc2626" 
              : isLoading 
                ? "#ca8a04" 
                : isInitialized 
                  ? "#2563eb" 
                  : "#4b5563",
            color: "white",
            "&:hover": {
              backgroundColor: error 
                ? "#b91c1c" 
                : isLoading 
                  ? "#a16207" 
                  : isInitialized 
                    ? "#1d4ed8" 
                    : "#374151",
            },
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
          }}
          title={error ? `AI Error: ${error}` : isLoading ? "AI Initializing..." : "Open AI Assistant"}
        >
          {error ? "🚨" : isLoading ? "⏳" : "🤖"}
        </IconButton>
      </Box>
    );
  }

  return (
    <Paper
      elevation={24}
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 384,
        height: 384,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(24, 40, 24, 0.95)",
        border: "2px solid #083e22",
        borderRadius: 2,
      }}
      className={className}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          borderBottom: "1px solid rgba(8, 62, 34, 0.5)",
        }}
      >
        <Typography variant="h6" sx={{ color: "#d0c98d", fontWeight: 600, fontSize: "1rem" }}>
          AI Assistant
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {!isInitialized && (
            <Typography sx={{ color: "#ca8a04", fontSize: "0.75rem" }}>
              Initializing...
            </Typography>
          )}
          {error && (
            <Button
              onClick={retry}
              size="small"
              sx={{ color: "#dc2626", fontSize: "0.75rem", minWidth: "auto", p: 0.5 }}
              title="Retry initialization"
            >
              Retry
            </Button>
          )}
          <Button
            onClick={handleDumpState}
            size="small"
            sx={{ color: "#a3e635", fontSize: "0.75rem", minWidth: "auto", p: 0.5 }}
            title="Dump AI and UI state to console"
          >
            Dump
          </Button>
          <IconButton
            onClick={() => setIsExpanded(false)}
            size="small"
            sx={{ color: "#9ca3af", "&:hover": { color: "#ffffff" } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Status */}
      {gameId && adventurer && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            borderBottom: "1px solid rgba(8, 62, 34, 0.3)",
          }}
        >
          <Typography sx={{ color: "#9ca3af", fontSize: "0.75rem" }}>
            Game ID: {gameId} | Health: {adventurer.health} | XP: {adventurer.xp}
          </Typography>
        </Box>
      )}

      {/* Chat Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {chatHistory.length === 0 && (
          <Box sx={{ textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
            <Typography variant="body2">Ask me anything about the game!</Typography>
            <Typography variant="caption">
              Try: "What should I do next?" or "Explain combat mechanics"
            </Typography>
          </Box>
        )}
        
        {chatHistory.map((chat, index) => (
          <Paper
            key={index}
            elevation={1}
            sx={{
              p: 1,
              maxWidth: "80%",
              alignSelf: chat.type === "user" ? "flex-end" : "flex-start",
              backgroundColor: chat.type === "user" ? "#2563eb" : "rgba(0, 0, 0, 0.4)",
              color: "white",
            }}
          >
            <Typography variant="body2">{chat.message}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.6, mt: 0.5, display: "block" }}>
              {new Date(chat.timestamp).toLocaleTimeString()}
            </Typography>
          </Paper>
        ))}
        
        {isLoading && (
          <Paper
            elevation={1}
            sx={{
              p: 1,
              maxWidth: "80%",
              alignSelf: "flex-start",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              color: "white",
            }}
          >
            <Typography variant="body2">Thinking...</Typography>
          </Paper>
        )}
        
        <div ref={chatEndRef} />
      </Box>

      {/* Quick Commands */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderTop: "1px solid rgba(8, 62, 34, 0.5)",
          borderBottom: "1px solid rgba(8, 62, 34, 0.5)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
          <Button
            onClick={() => handleQuickCommand(commands.getStatus, "Get Status")}
            size="small"
            variant="outlined"
            disabled={!isInitialized || isLoading}
            sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1, py: 0.5 }}
          >
            Status
          </Button>
          <Button
            onClick={() => handleQuickCommand(() => getAdvice(), "Get Advice")}
            size="small"
            variant="outlined"
            disabled={!isInitialized || isLoading}
            sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1, py: 0.5 }}
          >
            Advice
          </Button>
          <Button
            onClick={() => handleQuickCommand(commands.explore, "Explore")}
            size="small"
            variant="outlined"
            disabled={!isInitialized || isLoading}
            sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1, py: 0.5 }}
          >
            Explore
          </Button>
          {adventurer?.beast_health && adventurer.beast_health > 0 && (
            <>
              <Button
                onClick={() => handleQuickCommand(commands.attack, "Attack")}
                size="small"
                variant="contained"
                color="error"
                disabled={!isInitialized || isLoading}
                sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1, py: 0.5 }}
              >
                Attack
              </Button>
              <Button
                onClick={() => handleQuickCommand(commands.flee, "Flee")}
                size="small"
                variant="contained"
                color="warning"
                disabled={!isInitialized || isLoading}
                sx={{ fontSize: "0.75rem", minWidth: "auto", px: 1, py: 0.5 }}
              >
                Flee
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Input Area */}
      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid rgba(8, 62, 34, 0.5)",
          display: "flex",
          gap: 1,
        }}
      >
        <TextField
          ref={inputRef}
          fullWidth
          size="small"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isInitialized ? "Ask me anything..." : "Initializing..."}
          disabled={!isInitialized || isLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              color: "white",
              fontSize: "0.875rem",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(8, 62, 34, 0.5)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#083e22",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#2563eb",
            },
          }}
        />
        <IconButton
          onClick={handleSendMessage}
          disabled={!message.trim() || !isInitialized || isLoading}
          sx={{
            backgroundColor: "#2563eb",
            color: "white",
            "&:hover": { backgroundColor: "#1d4ed8" },
            "&:disabled": { backgroundColor: "#4b5563", color: "#9ca3af" },
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default GameAIAssistant;
