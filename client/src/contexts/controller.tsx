import { useStarknetApi } from "@/api/starknet";
import { ChainId, getNetworkConfig, NetworkConfig, NETWORKS } from "@/utils/networkConfig";
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Account, RpcProvider } from 'starknet';
import { useDynamicConnector } from './starknet';

export interface ControllerContext {
  account: any;
  address: string | undefined;
  playerName: string;
  isPending: boolean;
  openProfile: () => void;
  login: () => void;
  logout: () => void;
  startPractice: () => void;
  endPractice: () => void;
}

// Create a context
const ControllerContext = createContext<ControllerContext>({} as ControllerContext);

// Create a provider component
export const ControllerProvider = ({ children }: PropsWithChildren) => {
  const { account, address, isConnecting } = useAccount();
  const { connector, connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { currentNetworkConfig, setCurrentNetworkConfig } = useDynamicConnector();
  const { createBurnerAccount } = useStarknetApi();

  const [burner, setBurner] = useState<Account | null>(null);
  const [userName, setUserName] = useState<string>();

  const demoRpcProvider = useMemo(() => new RpcProvider({ nodeUrl: NETWORKS.WP_PG_SLOT.rpcUrl, }), []);

  useEffect(() => {
    if (account) {
      // Handle mixed networks
      if ((account as any).walletProvider?.account?.channel?.nodeUrl && (account as any).walletProvider.account.channel.nodeUrl !== currentNetworkConfig.chains[0].rpcUrl) {
        console.log('Disconnecting from network')
        return disconnect()
      }
    }
  }, [account]);

  useEffect(() => {
    setBurner(createBurnerAccount(demoRpcProvider))
  }, []);

  // Get username when connector changes
  useEffect(() => {
    const getUsername = async () => {
      try {
        const name = await (connector as any)?.username();
        if (name) setUserName(name);
      } catch (error) {
        console.error('Error getting username:', error);
      }
    };

    if (connector) getUsername();
  }, [connector]);

  const startPractice = () => {
    if (currentNetworkConfig.chainId !== ChainId.WP_PG_SLOT) {
      setCurrentNetworkConfig(getNetworkConfig(ChainId.WP_PG_SLOT) as NetworkConfig);
    }
  }

  const endPractice = () => {
    setCurrentNetworkConfig(getNetworkConfig(import.meta.env.VITE_PUBLIC_DEFAULT_CHAIN as ChainId) as NetworkConfig);
  }

  return (
    <ControllerContext.Provider value={{
      account: currentNetworkConfig.chainId === ChainId.WP_PG_SLOT ? burner : account,
      address,
      playerName: userName || "Adventurer",
      isPending: isConnecting || isPending,

      openProfile: () => (connector as any)?.controller?.openProfile(),
      login: () => connect({ connector: connectors.find(conn => conn.id === "controller") }),
      logout: () => disconnect(),
      startPractice,
      endPractice
    }}>
      {children}
    </ControllerContext.Provider>
  );
};

export const useController = () => {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error('useController must be used within a ControllerProvider');
  }
  return context;
};

