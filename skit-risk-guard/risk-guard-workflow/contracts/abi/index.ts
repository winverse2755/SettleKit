// skit-risk-guard/risk-guard-workflow/contracts/abi/index.ts
// ABI definitions for CRE Risk Guard Workflow

/**
 * Chainlink AggregatorV3Interface ABI
 * Used to fetch price data from Chainlink Data Feeds
 */
export const AggregatorV3InterfaceABI = [
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "description",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "version",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_roundId", type: "uint80" }],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

/**
 * Uniswap v4 PoolManager ABI (partial)
 * Contains only the functions needed for pool state queries
 * @see https://docs.uniswap.org/contracts/v4/overview
 */
export const PoolManagerABI = [
  {
    name: "extsload",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "slot", type: "bytes32" }],
    outputs: [{ name: "value", type: "bytes32" }],
  },
  {
    name: "extsload",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "startSlot", type: "bytes32" },
      { name: "nSlots", type: "uint256" },
    ],
    outputs: [{ name: "values", type: "bytes32[]" }],
  },
  {
    name: "initialize",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
  },
  {
    name: "unlock",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "data", type: "bytes" }],
    outputs: [{ name: "result", type: "bytes" }],
  },
] as const;

/**
 * Type aliases for ABI inference with viem
 */
export type AggregatorV3InterfaceABIType = typeof AggregatorV3InterfaceABI;
export type PoolManagerABIType = typeof PoolManagerABI;

/**
 * Contract addresses by chain
 */
export const CONTRACT_ADDRESSES = {
  baseSepolia: {
    chainlinkFeeds: {
      ETH_USD: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1" as const,
      USDC_USD: "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165" as const,
    },
  },
  unichainSepolia: {
    poolManager: "0x00b036b58a818b1bc34d502d3fe730db729e62ac" as const,
  },
} as const;

/**
 * Storage slot constants for Uniswap v4 PoolManager
 */
export const POOL_MANAGER_STORAGE = {
  /** pools mapping slot index */
  POOLS_SLOT: 6n,
  /** Pool slot0 layout (256 bits total):
   * - sqrtPriceX96: bits 0-159 (160 bits)
   * - tick: bits 160-183 (24 bits, signed)
   * - protocolFee: bits 184-207 (24 bits)
   * - lpFee: bits 208-231 (24 bits)
   */
  SLOT0_LAYOUT: {
    SQRT_PRICE_BITS: 160n,
    TICK_BITS: 24n,
    PROTOCOL_FEE_BITS: 24n,
    LP_FEE_BITS: 24n,
  },
  /** Liquidity is stored at slot0 + 1 */
  LIQUIDITY_OFFSET: 1n,
} as const;

/**
 * CCTP domain IDs for cross-chain messaging
 * @see https://developers.circle.com/stablecoins/docs/supported-domains
 */
export const CCTP_DOMAINS = {
  ethereum: 0,
  avalanche: 1,
  optimism: 2,
  arbitrum: 3,
  base: 6,
  polygon: 7,
  unichain: 10,
  // Testnet domains
  ethereumSepolia: 0,
  avalancheFuji: 1,
  optimismSepolia: 2,
  arbitrumSepolia: 3,
  baseSepolia: 6,
  polygonAmoy: 7,
  unichainSepolia: 10,
} as const;

/**
 * Helper to encode calldata for AggregatorV3Interface.latestRoundData()
 * This is the function selector for latestRoundData()
 */
export const LATEST_ROUND_DATA_SELECTOR = "0xfeaf968c" as const;

/**
 * Helper to encode calldata for PoolManager.extsload(bytes32)
 * This is the function selector for extsload(bytes32)
 */
export const EXTSLOAD_SELECTOR = "0x1e2eaeaf" as const;
