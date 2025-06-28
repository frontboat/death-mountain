#!/bin/bash

# Loot Survivor 2 MCP Server Start Script

echo "Starting Loot Survivor 2 MCP Server..."

# Set default environment variables if not already set
export TORII_URL=${TORII_URL:-"https://api.cartridge.gg/x/sepolia/loot-survivor-v2/torii"}
export CHAIN=${CHAIN:-"sepolia"}

echo "Configuration:"
echo "  TORII_URL: $TORII_URL"
echo "  CHAIN: $CHAIN"
echo ""

# Start the server
node dist/index.js