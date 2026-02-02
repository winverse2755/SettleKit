import { type Chain, defineChain, Address } from "viem";

export const baseSepolia: Chain = defineChain({
  id: 84532,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
    public: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
});

export const arcTestnet: Chain = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
    public: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const unichainSepolia: Chain = defineChain({
  id: 1301,
  name: "Unichain Sepolia",
  network: "unichain-sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { 
      http: [
        process.env.UNICHAIN_RPC_URL || "https://sepolia.unichain.org"
      ] 
    },
    public: { http: ["https://sepolia.unichain.org"] },
  },
  blockExplorers: {
    default: { name: "Uniscan", url: "https://sepolia.uniscan.xyz" },
  },
  testnet: true,
});

export const CHAINS = {
  baseSepolia,
  arcTestnet,
  unichainSepolia,
} as const;

export type ChainKey = keyof typeof CHAINS;

// ========================================
// UNISWAP V4 CONTRACT ADDRESSES & CONFIG
// (Added for Uniswap integration)
// ========================================

export interface NetworkConfig {
  chain: Chain;
  contracts: {
    // Uniswap v4
    poolManager: Address;
    quoter: Address;
    positionManager: Address;
    stateView: Address;
    // Tokens
    usdc: Address;
    weth: Address;
  };
}

export const UNICHAIN_SEPOLIA_CONFIG: NetworkConfig = {
  chain: unichainSepolia,
  contracts: {
    // Uniswap v4 contracts on Unichain Sepolia
    poolManager: '0x00b036b58a818b1bc34d502d3fe730db729e62ac',
    quoter: '0x56dcd40a3f2d466f48e7f48bdbe5cc9b92ae4472',
    positionManager: '0xf969aee60879c54baaed9f3ed26147db216fd664',
    stateView: '0xc199f1072a74d4e905aba1a84d9a45e2546b6222',
    // Token addresses
    usdc: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    weth: '0x4200000000000000000000000000000000000006',
  },
};

// Pool parameters for Uniswap v4
export const POOL_CONFIG = {
  // Fee tier: 3000 = 0.3%
  fee: 3000,
  // Tick spacing for 0.3% fee tier
  tickSpacing: 60,
  // No hooks (address zero)
  hooks: '0x0000000000000000000000000000000000000000' as Address,
} as const;