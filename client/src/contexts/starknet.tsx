import { ChainId, getNetworkConfig, NetworkConfig, NETWORKS } from "@/utils/networkConfig";
import { stringToFelt } from "@/utils/utils";
import ControllerConnector from "@cartridge/connector/controller";
import { sepolia } from "@starknet-react/chains";
import { jsonRpcProvider, StarknetConfig, voyager } from "@starknet-react/core";
import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from "react";

interface DynamicConnectorContext {
  setCurrentNetworkConfig: (network: NetworkConfig) => void;
  currentNetworkConfig: NetworkConfig;
  dojoConfig: {
    manifest: any;
    rpcUrl: string;
    toriiUrl: string;
    namespace: string;
    chainId: string;
    slot: string;
  };
}

const DynamicConnectorContext = createContext<DynamicConnectorContext | null>(null);

const controllerConfig = getNetworkConfig(ChainId.SN_SEPOLIA);
const cartridgeController = typeof window !== "undefined" ? new ControllerConnector({
  policies: controllerConfig.policies,
  namespace: controllerConfig.namespace,
  slot: controllerConfig.slot,
  preset: controllerConfig.preset,
  chains: controllerConfig.chains,
  defaultChainId: stringToFelt(controllerConfig.chainId).toString(),
  tokens: controllerConfig.tokens,
}) : null;

export function DynamicConnectorProvider({ children }: PropsWithChildren) {
  const initialConfig = getNetworkConfig(ChainId.WP_PG_SLOT);
  const [currentNetworkConfig, setCurrentNetworkConfig] = useState<NetworkConfig>(initialConfig);

  // Create dynamic dojoConfig based on current network
  const dojoConfig = useMemo(() => {
    const network = NETWORKS[currentNetworkConfig.chainId as keyof typeof NETWORKS];
    if (!network) {
      throw new Error(`Network configuration not found for: ${currentNetworkConfig.chainId}`);
    }

    return {
      manifest: network.manifest,
      rpcUrl: network.rpcUrl,
      toriiUrl: network.torii,
      namespace: network.namespace,
      chainId: network.chainId,
      slot: network.slot,
    };
  }, [currentNetworkConfig.chainId]);


  const rpc = useCallback(() => {
    return { nodeUrl: controllerConfig.chains[0].rpcUrl };
  }, []);

  return (
    <DynamicConnectorContext.Provider value={{
      setCurrentNetworkConfig,
      currentNetworkConfig,
      dojoConfig
    }}>
      <StarknetConfig
        chains={[sepolia]}
        provider={jsonRpcProvider({ rpc })}
        connectors={[cartridgeController as any]}
        explorer={voyager}
        autoConnect={true}
      >
        {children}
      </StarknetConfig>
    </DynamicConnectorContext.Provider>
  );
}

export function useDynamicConnector() {
  const context = useContext(DynamicConnectorContext);
  if (!context) {
    throw new Error('useDynamicConnector must be used within a DynamicConnectorProvider');
  }
  return context;
}

// Convenience hook to get just the dojoConfig
export function useDojoConfig() {
  const { dojoConfig } = useDynamicConnector();
  return dojoConfig;
}
