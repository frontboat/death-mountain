import { useStarknetApi } from "@/api/starknet";
import {
  ChainId,
  NETWORKS
} from "@/utils/networkConfig";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Account, RpcProvider } from "starknet";
import { useDynamicConnector } from "./starknet";

export interface ControllerContext {
  account: any;
  address: string | undefined;
  playerName: string;
  isPending: boolean;
  openProfile: () => void;
  login: () => void;
  logout: () => void;
}

// Create a context
const ControllerContext = createContext<ControllerContext>(
  {} as ControllerContext
);

// Create a provider component
export const ControllerProvider = ({ children }: PropsWithChildren) => {
  const { account, address, isConnecting } = useAccount();
  const { connector, connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { currentNetworkConfig } = useDynamicConnector();
  const { createBurnerAccount } = useStarknetApi();

  const [burner, setBurner] = useState<Account | null>(null);
  const [userName, setUserName] = useState<string>();
  const [creatingBurner, setCreatingBurner] = useState(false);

  const demoRpcProvider = useMemo(
    () => new RpcProvider({ nodeUrl: NETWORKS.WP_PG_SLOT.rpcUrl }),
    []
  );

  useEffect(() => {
    if (
      localStorage.getItem("burner") &&
      localStorage.getItem("burner_version") === "4"
    ) {
      let burner = JSON.parse(localStorage.getItem("burner") as string);
      setBurner(
        new Account(demoRpcProvider, burner.address, burner.privateKey)
      );
    } else {
      createBurner();
    }
  }, []);

  // Get username when connector changes
  useEffect(() => {
    const getUsername = async () => {
      try {
        const name = await (connector as any)?.username();
        if (name) setUserName(name);
      } catch (error) {
        console.error("Error getting username:", error);
      }
    };

    if (connector) getUsername();
  }, [connector]);

  const createBurner = async () => {
    setCreatingBurner(true);
    let account = await createBurnerAccount(demoRpcProvider);

    if (account) {
      setBurner(account);
    }
    setCreatingBurner(false);
  };

  return (
    <ControllerContext.Provider
      value={{
        account:
          currentNetworkConfig.chainId === ChainId.WP_PG_SLOT
            ? burner
            : account,
        address: currentNetworkConfig.chainId === ChainId.WP_PG_SLOT ? burner?.address : address,
        playerName: userName || "Adventurer",
        isPending: isConnecting || isPending || creatingBurner,

        openProfile: () => (connector as any)?.controller?.openProfile(),
        login: () =>
          connect({
            connector: connectors.find((conn) => conn.id === "controller"),
          }),
        logout: () => disconnect(),
      }}
    >
      {children}
    </ControllerContext.Provider>
  );
};

export const useController = () => {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error("useController must be used within a ControllerProvider");
  }
  return context;
};
