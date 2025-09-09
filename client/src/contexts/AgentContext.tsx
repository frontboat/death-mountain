import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useSystemCalls } from '@/dojo/useSystemCalls';
import { createLootSurvivorAgent, lootSurvivorContext } from '@/agent/agent';
import { useController } from '@/contexts/controller';

// Define the type for the agent instance
type Agent = ReturnType<typeof createLootSurvivorAgent>['agent'];
type AgentContextValue = {
  agent: Agent | null;
  lootSurvivorContext: typeof lootSurvivorContext | null;
};

// Create the context
const AgentContext = createContext<AgentContextValue>({ agent: null, lootSurvivorContext: null });

// Create the provider component
export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemCalls = useSystemCalls();
  const { account } = useController();
  const [agentContextValue, setAgentContextValue] = useState<AgentContextValue>({ agent: null, lootSurvivorContext: null });
  
  useEffect(() => {
    if (account && 'executeAction' in systemCalls && !agentContextValue.agent) {
      const { agent } = createLootSurvivorAgent(systemCalls);
      agent.start().then(() => {
        setAgentContextValue({ agent, lootSurvivorContext });
      });
    }
  }, [systemCalls, agentContextValue.agent, account]);

  if (!agentContextValue.agent) {
    return null; // or a loading spinner
  }

  return (
    <AgentContext.Provider value={agentContextValue}>
      {children}
    </AgentContext.Provider>
  );
};

// Create a custom hook to use the agent context
export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context || !context.agent) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};
