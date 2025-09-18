import {
  ChainId,
  getNetworkConfig,
  NetworkConfig,
} from "@/utils/networkConfig";
import { stringToFelt } from "@/utils/utils";
import ControllerConnector from "@cartridge/connector/controller";
import { mainnet } from "@starknet-react/chains";
import { jsonRpcProvider, StarknetConfig, voyager } from "@starknet-react/core";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface DynamicConnectorContext {
  setCurrentNetworkConfig: (network: NetworkConfig) => void;
  currentNetworkConfig: NetworkConfig;
}

const DynamicConnectorContext = createContext<DynamicConnectorContext | null>(
  null
);

const controllerConfig = getNetworkConfig(import.meta.env.VITE_PUBLIC_CHAIN);
const cartridgeController =
  typeof window !== "undefined"
    ? new ControllerConnector({
        policies: controllerConfig.policies,
        namespace: controllerConfig.namespace,
        slot: controllerConfig.slot,
        preset: controllerConfig.preset,
        chains: controllerConfig.chains,
        defaultChainId: stringToFelt(controllerConfig.chainId).toString(),
        tokens: controllerConfig.tokens,
      })
    : null;

export function DynamicConnectorProvider({ children }: PropsWithChildren) {
  const getInitialNetwork = (): NetworkConfig => {
    return getNetworkConfig(
      import.meta.env.VITE_PUBLIC_DEFAULT_CHAIN as ChainId
    );
  };

  const [currentNetworkConfig, setCurrentNetworkConfig] =
    useState<NetworkConfig>(getInitialNetwork);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lastSelectedNetwork", currentNetworkConfig.chainId);
    }
  }, [currentNetworkConfig.chainId]);

  const rpc = useCallback(() => {
    return { nodeUrl: controllerConfig.chains[0].rpcUrl };
  }, []);

  return (
    <DynamicConnectorContext.Provider
      value={{
        setCurrentNetworkConfig,
        currentNetworkConfig,
      }}
    >
      <StarknetConfig
        chains={[mainnet]}
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
    throw new Error(
      "useDynamicConnector must be used within a DynamicConnectorProvider"
    );
  }
  return context;
}
