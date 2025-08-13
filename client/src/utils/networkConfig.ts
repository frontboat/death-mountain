import { getContractByName } from "@dojoengine/core";
import manifest_sepolia from "../../manifest_sepolia.json";
import manifest_slot from "../../manifest_slot.json";
import { Tokens } from "@cartridge/controller";

export interface NetworkConfig {
  chainId: ChainId;
  name: string;
  status: string;
  namespace: string;
  slot: string;
  preset: string;
  policies: Array<{
    target: string;
    method: string;
  }>;
  vrf: boolean;
  chains: Array<{
    rpcUrl: string;
  }>;
  tokens: Tokens;
  paymentTokens: any[];
  goldenToken: string;
}

export enum ChainId {
  WP_PG_SLOT = "WP_PG_SLOT",
  SN_MAIN = "SN_MAIN",
  SN_SEPOLIA = "SN_SEPOLIA",
}

export const NETWORKS = {
  // SN_MAIN: {
  //   chainId: ChainId.SN_MAIN,
  //   name: "Beast Mode",
  //   status: "offline",
  //   namespace: "ls_0_0_1",
  //   slot: "pg-mainnet",
  //   rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet",
  //   torii: "https://api.cartridge.gg/x/pg-mainnet/torii",
  //   tokens: {
  //     erc20: [],
  //   },
  //   manifest: manifest_sepolia,
  //   vrf: true,
  // },
  SN_SEPOLIA: {
    chainId: ChainId.SN_SEPOLIA,
    name: "Beast Mode",
    status: "online",
    namespace: "ls_0_0_6",
    slot: "ls-sepolia",
    rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
    torii: "https://api.cartridge.gg/x/ls-sepolia/torii",
    tokens: {
      erc20: [],
    },
    manifest: manifest_sepolia,
    vrf: true,
    goldenToken: "0x031d69dbf2f3057f8c52397d0054b43e6ee386eb6b3454fa66a3d2b770a5c2da",
    paymentTokens: [
      {
        name: "ETH",
        address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        displayDecimals: 4,
      },
      {
        name: "STRK",
        address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
        displayDecimals: 2,
      },
      {
        name: "USDC",
        address: "0x0468ce7715f7aea17b1632736877c36371c3b1354eb9611e8bb9035c0563963f",
        displayDecimals: 2,
        decimals: 6,
      },
      {
        name: "DNG40",
        address: "0x0468ce7715f7aea17b1632736877c36371c3b1354eb9611e8bb9035c0563963f",
        displayDecimals: 0,
      },
      {
        name: "LORD",
        address: "0x064fd80fcb41d00214430574a0aa19d21cc5d6452aeb4996f31b6e9ba4f466a0",
        displayDecimals: 2,
      },
    ],
  },
  WP_PG_SLOT: {
    chainId: ChainId.WP_PG_SLOT,
    name: "Practice Mode",
    status: "online",
    namespace: "ls_0_0_4",
    slot: "pg-slot",
    rpcUrl: "https://api.cartridge.gg/x/pg-slot-2/katana",
    torii: "https://api.cartridge.gg/x/pg-slot-2/torii",
    tokens: {
      erc20: [],
    },
    manifest: manifest_slot,
    vrf: false,
    paymentTokens: [],
    goldenToken: "0x031d69dbf2f3057f8c52397d0054b43e6ee386eb6b3454fa66a3d2b770a5c2da",
  },
};

export function getNetworkConfig(networkKey: ChainId): NetworkConfig {
  const network = NETWORKS[networkKey as keyof typeof NETWORKS];
  if (!network) throw new Error(`Network ${networkKey} not found`);

  const namespace = network.namespace;
  const manifest = network.manifest;

  // Get contract addresses from manifest
  const game_systems = getContractByName(
    manifest,
    namespace,
    "game_systems"
  )?.address;
  const game_token_systems = getContractByName(
    manifest,
    namespace,
    "game_token_systems"
  )?.address;
  const vrf_provider = import.meta.env.VITE_PUBLIC_VRF_PROVIDER_ADDRESS;
  const DUNGEON_ADDRESS = import.meta.env.VITE_PUBLIC_DUNGEON_ADDRESS;

  // Base policies that are common across networks
  const policies = [
    {
      target: game_token_systems,
      method: "mint_game",
    },
    {
      target: game_systems,
      method: "start_game",
    },
    {
      target: game_systems,
      method: "explore",
    },
    {
      target: game_systems,
      method: "attack",
    },
    {
      target: game_systems,
      method: "flee",
    },
    {
      target: game_systems,
      method: "buy_items",
    },
    {
      target: game_systems,
      method: "equip",
    },
    {
      target: game_systems,
      method: "drop",
    },
    {
      target: game_systems,
      method: "select_stat_upgrades",
    },
    {
      target: vrf_provider,
      method: "request_random",
    },
    {
      target: DUNGEON_ADDRESS,
      method: "claim_beast",
    }
  ];

  return {
    chainId: network.chainId,
    name: network.name,
    status: network.status,
    namespace: network.namespace,
    slot: network.slot,
    preset: "loot-survivor",
    vrf: network.vrf,
    policies,
    chains: [{ rpcUrl: network.rpcUrl }],
    tokens: network.tokens,
    paymentTokens: network.paymentTokens,
    goldenToken: network.goldenToken,
  };
}

export function translateName(network: string): ChainId | null {
  network = network.toLowerCase();

  if (network === "mainnet") {
    return ChainId.SN_MAIN;
  } else if (network === "sepolia") {
    return ChainId.SN_SEPOLIA;
  } else if (network === "katana") {
    return ChainId.WP_PG_SLOT;
  }

  return null;
}
