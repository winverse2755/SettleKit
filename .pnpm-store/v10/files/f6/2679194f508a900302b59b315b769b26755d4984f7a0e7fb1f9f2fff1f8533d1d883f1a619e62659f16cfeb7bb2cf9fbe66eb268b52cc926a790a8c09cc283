/**
 * Copyright (c) 2026, Circle Internet Group, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Chain, PublicClient, WalletClient, EIP1193Provider } from 'viem';
import { Abi } from 'abitype';
import { TransactionInstruction, Signer, AddressLookupTableAccount } from '@solana/web3.js';
import { PrivateKeyAccount } from '/home/runner/_work/stablecoin-kits-private/stablecoin-kits-private/node_modules/viem/_types/accounts/index.d.ts';

/**
 * @packageDocumentation
 * @module ChainDefinitions
 *
 * This module provides a complete type system for blockchain chain definitions.
 * It supports both EVM and non‑EVM chains, token configurations, and multiple
 * versions of the Cross-Chain Transfer Protocol (CCTP). Additionally, utility types
 * are provided to extract subsets of chains (e.g. chains supporting USDC, EURC, or specific
 * CCTP versions) from a provided collection.
 *
 * All types are fully documented with TSDoc to maximize developer experience.
 */
/**
 * Represents basic information about a currency or token.
 * @interface Currency
 * @category Types
 * @description Provides the essential properties of a cryptocurrency or token.
 * @example
 * ```typescript
 * const ethCurrency: Currency = {
 *   name: "Ether",
 *   symbol: "ETH",
 *   decimals: 18
 * };
 * ```
 */
interface Currency {
    /**
     * The full name of the currency.
     * @example "Ether", "USDC"
     */
    name: string;
    /**
     * The symbol or ticker of the currency.
     * @example "ETH", "USDC"
     */
    symbol: string;
    /**
     * The number of decimal places for the currency.
     * @description Defines the divisibility of the currency (e.g., 1 ETH = 10^18 wei).
     * @example 18 for ETH, 6 for USDC
     */
    decimals: number;
}
/**
 * Base information that all chain definitions must include.
 * @interface BaseChainDefinition
 * @category Types
 * @description Provides the common properties shared by all blockchain definitions.
 * @example
 * ```typescript
 * const baseChain: BaseChainDefinition = {
 *   chain: Blockchain.Ethereum,
 *   name: "Ethereum",
 *   nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
 *   isTestnet: false
 * };
 * ```
 */
interface BaseChainDefinition {
    /**
     * The blockchain identifier from the {@link Blockchain} enum.
     */
    chain: Blockchain;
    /**
     * The display name of the blockchain.
     * @example "Ethereum", "Solana", "Avalanche"
     */
    name: string;
    /**
     * Optional title or alternative name for the blockchain.
     * @example "Ethereum Mainnet", "Solana Mainnet"
     */
    title?: string;
    /**
     * Information about the native currency of the blockchain.
     */
    nativeCurrency: Currency;
    /**
     * Indicates whether this is a testnet or mainnet.
     * @description Used to differentiate between production and testing environments.
     */
    isTestnet: boolean;
    /**
     * Template URL for the blockchain explorer to view transactions.
     * @description URL template with a `\{hash\}` placeholder for transaction hash.
     * @example "https://etherscan.io/tx/\{hash\}", "https://sepolia.etherscan.io/tx/\{hash\}"
     */
    explorerUrl: string;
    /**
     * Default RPC endpoints for connecting to the blockchain network.
     * @description Array of reliable public RPC endpoints that can be used for read and write operations.
     * The first endpoint in the array is considered the primary endpoint.
     * @example ["https://cloudflare-eth.com", "https://ethereum.publicnode.com"]
     */
    rpcEndpoints: readonly string[];
    /**
     * The contract address for EURC.
     * @description Its presence indicates that EURC is supported.
     */
    eurcAddress: string | null;
    /**
     * The contract address for USDC.
     * @description Its presence indicates that USDC is supported.
     */
    usdcAddress: string | null;
    /**
     * Optional CCTP configuration.
     * @description If provided, the chain supports CCTP.
     */
    cctp: CCTPConfig | null;
    /**
     * Optional kit-specific contract addresses for enhanced chain functionality.
     *
     * @description When provided, the chain supports additional kit-specific logic in addition
     * to standard CCTP. This enables hybrid flows where both standard approve/burn/mint
     * and enhanced custom features are available. When undefined, the chain uses only
     * the standard CCTP flow.
     *
     * The address format varies by blockchain:
     * - EVM chains: 40-character hexadecimal with 0x prefix (e.g., "0x1234...")
     * - Solana: Base58-encoded 32-byte address (e.g., "9WzDX...")
     * - Other chains: Platform-specific address formats
     *
     * @example
     * ```typescript
     * // EVM chain with bridge contract
     * const evmChain: ChainDefinition = {
     *   // ... other properties
     *   kitContracts: {
     *     bridge: "0x1234567890abcdef1234567890abcdef12345678"
     *   }
     * }
     *
     * // Solana chain with bridge contract
     * const solanaChain: ChainDefinition = {
     *   // ... other properties
     *   kitContracts: {
     *     bridge: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
     *   }
     * }
     * ```
     */
    kitContracts?: KitContracts;
}
/**
 * Represents chain definitions for Ethereum Virtual Machine (EVM) compatible blockchains.
 * @interface EVMChainDefinition
 * @extends BaseChainDefinition
 * @category Types
 * @description Adds properties specific to EVM chains.
 * @example
 * ```typescript
 * const ethereum: EVMChainDefinition = {
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   chainId: 1,
 *   name: 'Ethereum',
 *   title: 'Ethereum Mainnet',
 *   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
 *   isTestnet: false
 * };
 * ```
 */
interface EVMChainDefinition extends BaseChainDefinition {
    /**
     * Discriminator for EVM chains.
     * @description Used for type narrowing when handling different chain types.
     */
    type: 'evm';
    /**
     * The unique identifier for the blockchain.
     * @description Standard EVM chain ID as defined in EIP-155.
     * @example 1 for Ethereum Mainnet, 137 for Polygon.
     */
    chainId: number;
}
/**
 * Represents chain definitions for non-EVM blockchains.
 * @interface NonEVMChainDefinition
 * @extends BaseChainDefinition
 * @category Types
 * @description Contains properties for blockchains that do not use the EVM.
 * @example
 * ```typescript
 * const solana: NonEVMChainDefinition = {
 *   type: 'solana',
 *   chain: Blockchain.Solana,
 *   name: 'Solana',
 *   nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
 *   isTestnet: false
 * };
 * ```
 */
interface NonEVMChainDefinition extends BaseChainDefinition {
    /**
     * Discriminator for non-EVM chains.
     * @description Identifies the specific blockchain platform.
     */
    type: 'algorand' | 'avalanche' | 'solana' | 'aptos' | 'near' | 'stellar' | 'sui' | 'hedera' | 'noble' | 'polkadot';
}
/**
 * The type of chain.
 * @alias ChainType
 * @category Types
 * @description Represents the type of chain.
 * @example
 * ```typescript
 * const chainType: ChainType = 'evm'
 * ```
 */
type ChainType = EVMChainDefinition['type'] | NonEVMChainDefinition['type'];
/**
 * Public chain definition type.
 * @alias ChainDefinition
 * @category Types
 * @description Represents either an EVM-based or non-EVM-based blockchain definition.
 * This type is used by developers to define chain configurations.
 * @example
 * ```typescript
 * // Standard chain with CCTP support only
 * const ethereumChain: ChainDefinition = {
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   chainId: 1,
 *   name: 'Ethereum',
 *   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
 *   isTestnet: false,
 *   explorerUrl: 'https://etherscan.io/tx/{hash}',
 *   rpcEndpoints: ['https://eth.example.com'],
 *   eurcAddress: null,
 *   usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
 *   cctp: {
 *     domain: 0,
 *     contracts: {
 *       v2: {
 *         type: 'split',
 *         tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
 *         messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
 *         confirmations: 65,
 *         fastConfirmations: 2
 *       }
 *     }
 *   },
 *   kitContracts: undefined
 * };
 *
 * // Chain with custom contract support (hybrid flow)
 * const customChain: ChainDefinition = {
 *   ...ethereumChain,
 *   kitContracts: {
 *     bridge: '0x1234567890abcdef1234567890abcdef12345678'
 *   }
 * };
 * ```
 */
type ChainDefinition = EVMChainDefinition | NonEVMChainDefinition;
/**
 * Chain definition with CCTPv2 configuration.
 * @alias ChainDefinitionWithCCTPv2
 * @extends ChainDefinition
 * @category Types
 * @description Represents a chain definition that includes CCTPv2 configuration. This is useful for typescript consumers to narrow down the type of chain definition to a chain that supports CCTPv2.
 * @example
 * ```typescript
 * const ethereumWithCCTPv2: ChainDefinitionWithCCTPv2 = {
 *   ...ethereum,
 *   cctp: {
 *     domain: 0,
 *     contracts: {
 *       v2: {
 *         type: 'merged',
 *         contract: '0x123...'
 *       }
 *     }
 *   }
 * };
 * ```
 */
type ChainDefinitionWithCCTPv2 = ChainDefinition & {
    cctp: CCTPConfig & {
        contracts: {
            v2: VersionConfig;
        };
    };
    usdcAddress: string;
};
/**
 * Chain identifier that can be used in transfer parameters and factory functions.
 * This can be either:
 * - A ChainDefinition object
 * - A Blockchain enum value (e.g., Blockchain.Ethereum)
 * - A string literal of the blockchain value (e.g., "Ethereum")
 */
type ChainIdentifier = ChainDefinition | Blockchain | `${Blockchain}`;
interface CCTPSplitConfig {
    type: 'split';
    tokenMessenger: string;
    messageTransmitter: string;
    confirmations: number;
}
interface CCTPMergedConfig {
    type: 'merged';
    contract: string;
    confirmations: number;
}
type VersionConfig = CCTPSplitConfig | CCTPMergedConfig;
type CCTPContracts = Partial<{
    v1: VersionConfig;
    v2: VersionConfig & {
        fastConfirmations: number;
    };
}>;
/**
 * Configuration for the Cross-Chain Transfer Protocol (CCTP).
 * @interface CCTPConfig
 * @category Types
 * @description Contains the domain and required contract addresses for CCTP support.
 * @example
 * ```
 * const cctpConfig: CCTPConfig = {
 *   domain: 0,
 *   contracts: {
 *     TokenMessenger: '0xabc',
 *     MessageReceiver: '0xdef'
 *   }
 * };
 * ```
 */
interface CCTPConfig {
    /**
     * The CCTP domain identifier.
     */
    domain: number;
    /**
     * The contracts required for CCTP.
     */
    contracts: CCTPContracts;
}
/**
 * Available kit contract types for enhanced chain functionality.
 *
 * @description Defines the valid contract types that can be deployed on chains
 * to provide additional features beyond standard CCTP functionality.
 *
 * @example
 * ```typescript
 * import type { KitContractType } from '@core/chains'
 *
 * const contractType: KitContractType = 'bridge' // Valid
 * const invalidType: KitContractType = 'invalid' // TypeScript error
 * ```
 */
type KitContractType = 'bridge';
/**
 * Kit-specific contract addresses for enhanced chain functionality.
 *
 * @description Maps contract types to their addresses on a specific chain.
 * All contract types are optional, allowing chains to selectively support
 * specific kit features.
 *
 * @example
 * ```typescript
 * import type { KitContracts } from '@core/chains'
 *
 * const contracts: KitContracts = {
 *   bridge: "0x1234567890abcdef1234567890abcdef12345678"
 * }
 *
 * // Future example with multiple contract types:
 * const futureContracts: KitContracts = {
 *   bridge: "0x1234567890abcdef1234567890abcdef12345678",
 *   // Note: other contract types would be added to KitContractType union
 *   // customType: "0xabcdef1234567890abcdef1234567890abcdef12"
 * }
 * ```
 */
type KitContracts = Partial<Record<KitContractType, string>>;
/**
 * Enumeration of all blockchains known to this library.
 *
 * This enum contains every blockchain that has a chain definition, regardless
 * of whether bridging is currently supported. For chains that support bridging
 * via CCTPv2, see {@link BridgeChain}.
 *
 * @enum
 * @category Enums
 * @description Provides string identifiers for each blockchain with a definition.
 * @see {@link BridgeChain} for the subset of chains that support CCTPv2 bridging.
 */
declare enum Blockchain {
    Algorand = "Algorand",
    Algorand_Testnet = "Algorand_Testnet",
    Aptos = "Aptos",
    Aptos_Testnet = "Aptos_Testnet",
    Arc_Testnet = "Arc_Testnet",
    Arbitrum = "Arbitrum",
    Arbitrum_Sepolia = "Arbitrum_Sepolia",
    Avalanche = "Avalanche",
    Avalanche_Fuji = "Avalanche_Fuji",
    Base = "Base",
    Base_Sepolia = "Base_Sepolia",
    Celo = "Celo",
    Celo_Alfajores_Testnet = "Celo_Alfajores_Testnet",
    Codex = "Codex",
    Codex_Testnet = "Codex_Testnet",
    Ethereum = "Ethereum",
    Ethereum_Sepolia = "Ethereum_Sepolia",
    Hedera = "Hedera",
    Hedera_Testnet = "Hedera_Testnet",
    HyperEVM = "HyperEVM",
    HyperEVM_Testnet = "HyperEVM_Testnet",
    Ink = "Ink",
    Ink_Testnet = "Ink_Testnet",
    Linea = "Linea",
    Linea_Sepolia = "Linea_Sepolia",
    Monad = "Monad",
    Monad_Testnet = "Monad_Testnet",
    NEAR = "NEAR",
    NEAR_Testnet = "NEAR_Testnet",
    Noble = "Noble",
    Noble_Testnet = "Noble_Testnet",
    Optimism = "Optimism",
    Optimism_Sepolia = "Optimism_Sepolia",
    Polkadot_Asset_Hub = "Polkadot_Asset_Hub",
    Polkadot_Westmint = "Polkadot_Westmint",
    Plume = "Plume",
    Plume_Testnet = "Plume_Testnet",
    Polygon = "Polygon",
    Polygon_Amoy_Testnet = "Polygon_Amoy_Testnet",
    Sei = "Sei",
    Sei_Testnet = "Sei_Testnet",
    Solana = "Solana",
    Solana_Devnet = "Solana_Devnet",
    Sonic = "Sonic",
    Sonic_Testnet = "Sonic_Testnet",
    Stellar = "Stellar",
    Stellar_Testnet = "Stellar_Testnet",
    Sui = "Sui",
    Sui_Testnet = "Sui_Testnet",
    Unichain = "Unichain",
    Unichain_Sepolia = "Unichain_Sepolia",
    World_Chain = "World_Chain",
    World_Chain_Sepolia = "World_Chain_Sepolia",
    XDC = "XDC",
    XDC_Apothem = "XDC_Apothem",
    ZKSync_Era = "ZKSync_Era",
    ZKSync_Sepolia = "ZKSync_Sepolia"
}

/**
 * Resolves a flexible chain identifier to a ChainDefinition.
 *
 * This function handles all three supported formats:
 * - ChainDefinition objects (passed through unchanged)
 * - Blockchain enum values (resolved via getChainByEnum)
 * - String literals of blockchain values (resolved via getChainByEnum)
 *
 * @param chainIdentifier - The chain identifier to resolve
 * @returns The resolved ChainDefinition object
 * @throws Error if the chain identifier cannot be resolved
 *
 * @example
 * ```typescript
 * import { resolveChainIdentifier } from '@core/chains'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * // All of these resolve to the same ChainDefinition:
 * const chain1 = resolveChainIdentifier(Ethereum)
 * const chain2 = resolveChainIdentifier(Blockchain.Ethereum)
 * const chain3 = resolveChainIdentifier('Ethereum')
 * ```
 */
declare function resolveChainIdentifier(chainIdentifier: ChainIdentifier): ChainDefinition;

/**
 * Core type definitions for blockchain transaction execution and gas estimation.
 *
 * This module provides TypeScript interfaces and types for handling blockchain
 * transactions across different networks, with a focus on EVM-compatible chains
 * and gas estimation.
 *
 * @module types
 */

/**
 * Estimated gas information for a blockchain transaction.
 *
 * This interface provides a unified way to represent gas costs across different
 * blockchain networks, supporting both EVM-style gas calculations and other
 * fee models.
 *
 * @interface EstimatedGas
 * @category Types
 * @example
 * ```typescript
 * // EVM chain example
 * const evmGas: EstimatedGas = {
 *   gas: 21000n,
 *   gasPrice: 1000000000n, // 1 Gwei
 *   fee: (21000n * 1000000000n).toString() // Total fee in wei
 * };
 *
 * // Solana example
 * const solanaGas: EstimatedGas = {
 *   gas: 5000n, // Lamports for compute units
 *   fee: '5000' // Total fee in Lamports
 * };
 * ```
 */
interface EstimatedGas {
    /**
     * The amount of gas estimated for the transaction.
     * For EVM chains, this represents the gas units.
     * For other chains, this might represent compute units or similar metrics.
     *
     * @example 21000n, 5000n
     */
    gas: bigint;
    /**
     * The estimated price per unit of gas.
     * This is primarily used in EVM chains where gas price is a separate metric.
     *
     * @example 1000000000n
     */
    gasPrice: bigint;
    /**
     * The total estimated fee as a string.
     * This field is useful for chains where gas/gasPrice isn't the whole story
     * or when the total fee needs to be represented in a different format.
     * For EVM chains, this is the total fee in wei (gas * gasPrice).
     *
     * @example "21000000000000", "5000"
     */
    fee: string;
}
/**
 * Override parameters for EVM gas estimation.
 *
 * These parameters allow customization of gas estimation behavior
 * for EVM-compatible chains.
 *
 * @interface EvmEstimateOverrides
 */
interface EvmEstimateOverrides {
    /**
     * The sender's address for the transaction.
     * @example "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
     */
    from?: string;
    /**
     * The value to be sent with the transaction in wei.
     * @example 1000000000000000000n // 1 ETH
     */
    value?: bigint;
    /**
     * The block tag to use for estimation.
     * @example "latest", "safe", "finalized"
     */
    blockTag?: 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';
    /**
     * The maximum gas limit for the transaction.
     * @example 3000000
     */
    gasLimit?: number;
    /**
     * The maximum fee per gas unit (EIP-1559).
     * @example 20000000000n // 20 Gwei
     */
    maxFeePerGas?: bigint;
    /**
     * The maximum priority fee per gas unit (EIP-1559).
     * @example 1500000000n // 1.5 Gwei
     */
    maxPriorityFeePerGas?: bigint;
}
/**
 * Extended override parameters for EVM transaction execution.
 *
 * Includes all estimation overrides plus additional parameters
 * specific to transaction execution.
 *
 * @interface EvmExecuteOverrides
 * @extends EvmEstimateOverrides
 */
interface EvmExecuteOverrides extends EvmEstimateOverrides {
    /**
     * The nonce to use for the transaction.
     * If not provided, the current nonce of the sender will be used.
     * @example 42
     */
    nonce?: number;
}
/**
 * Prepared contract execution for EVM chains.
 *
 * Represents a prepared contract execution that can be estimated
 * and executed on EVM-compatible chains.
 *
 * @interface EvmPreparedChainRequest
 */
interface EvmPreparedChainRequest {
    /** The type of the prepared execution. */
    type: 'evm';
    /**
     * Estimate the gas cost for the contract execution.
     *
     * @param overrides - Optional parameters to override the default estimation behavior
     * @param fallback - Optional fallback gas information to use if the estimation fails
     * @returns A promise that resolves to the estimated gas information
     * @throws If the estimation fails
     */
    estimate(overrides?: EvmEstimateOverrides, fallback?: EstimatedGas): Promise<EstimatedGas>;
    /**
     * Execute the prepared contract call.
     *
     * @param overrides - Optional parameters to override the default execution behavior
     * @returns A promise that resolves to the transaction hash
     * @throws If the execution fails
     */
    execute(overrides?: EvmExecuteOverrides): Promise<string>;
}
/**
 * Union type for all supported prepared contract executions.
 * Currently only supports EVM chains, but can be extended for other chains.
 */
type PreparedChainRequest = EvmPreparedChainRequest | SolanaPreparedChainRequest | NoopPreparedChainRequest;
/**
 * Parameters for preparing an EVM contract execution.
 */
type EvmPreparedChainRequestParams = {
    /** The type of the prepared execution. */
    type: 'evm';
    /** The ABI of the contract. */
    abi: Abi | string[];
    /** The address of the contract. */
    address: `0x${string}`;
    /** The name of the function to call. */
    functionName: string;
    /** The arguments to pass to the function. */
    args: unknown[];
} & Partial<EvmEstimateOverrides>;
/**
 * Solana-specific parameters for preparing a transaction.
 * @interface SolanaPreparedChainRequestParams
 */
interface SolanaPreparedChainRequestParams {
    /**
     * The array of instructions to include in the transaction.
     */
    instructions: TransactionInstruction[];
    /**
     * Additional signers besides the Adapter's wallet (e.g. program-derived authorities).
     */
    signers?: Signer[];
    /**
     * Optional override for how many compute units this transaction may consume.
     * If omitted, the network's default compute budget applies.
     */
    computeUnitLimit?: number;
    /**
     * Optional Address Lookup Table accounts for transaction compression.
     * Used to reduce transaction size by compressing frequently-used addresses.
     * This is used by @solana/web3.js adapters that have already fetched the ALT data.
     */
    addressLookupTableAccounts?: AddressLookupTableAccount[];
    /**
     * Optional Address Lookup Table addresses for transaction compression.
     * Used by adapters that need to fetch ALT data themselves (e.g., @solana/kit adapters).
     * These are base58-encoded addresses of ALT accounts to use for compression.
     */
    addressLookupTableAddresses?: string[];
}
/**
 * Solana-specific configuration for transaction estimation.
 * @interface SolanaEstimateOverrides
 */
interface SolanaEstimateOverrides {
    /** Optional compute unit limit for the transaction. */
    computeUnitLimit?: number;
}
/**
 * Solana-specific configuration for transaction execution.
 * @interface SolanaExecuteOverrides
 * @extends SolanaEstimateOverrides
 */
interface SolanaExecuteOverrides extends SolanaEstimateOverrides {
    /** The commitment level for the transaction. */
    preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
    /** The maximum number of retries for the transaction. */
    maxRetries?: number;
    /** Whether to skip the preflight check. */
    skipPreflight?: boolean;
}
/**
 * Solana-specific prepared chain request.
 * @interface SolanaPreparedChainRequest
 */
interface SolanaPreparedChainRequest {
    /** The type of the chain request. */
    type: 'solana';
    /** Estimate the compute units and fee for the transaction. */
    estimate(overrides?: SolanaEstimateOverrides, fallback?: EstimatedGas): Promise<EstimatedGas>;
    /** Execute the prepared transaction. */
    execute(overrides?: SolanaExecuteOverrides): Promise<string>;
}
/**
 * No-op prepared chain request for unsupported operations.
 *
 * This interface represents a prepared chain request that performs no operation.
 * It is returned when an action is not supported by the target chain or when
 * no actual blockchain interaction is required.
 *
 * @remarks
 * The estimate and execute methods return placeholder values since no actual
 * transaction is performed. This allows the calling code to handle unsupported
 * operations gracefully without breaking the expected interface contract.
 *
 * @example
 * ```typescript
 * const noopRequest: NoopPreparedChainRequest = {
 *   type: 'noop',
 *   estimate: async () => ({ gasLimit: 0n, gasPrice: 0n, totalFee: 0n }),
 *   execute: async () => '0x0000000000000000000000000000000000000000000000000000000000000000'
 * }
 * ```
 */
interface NoopPreparedChainRequest {
    /** The type of the prepared request. */
    type: 'noop';
    /**
     * Placeholder for the estimate method.
     * @returns The estimated gas cost.
     */
    estimate: (overrides?: EvmEstimateOverrides | SolanaEstimateOverrides, fallback?: EstimatedGas) => Promise<EstimatedGas>;
    /**
     * Placeholder for the execute method.
     * @returns The transaction hash.
     */
    execute: () => Promise<string>;
}
/**
 * Union type for all supported contract execution parameters.
 * Currently only supports EVM chains, but can be extended for other chains.
 */
type PreparedChainRequestParams = EvmPreparedChainRequestParams | SolanaPreparedChainRequestParams;
/**
 * Response from waiting for a transaction to be mined and confirmed on the blockchain.
 *
 * @interface WaitForTransactionResponse
 */
interface WaitForTransactionResponse {
    /**
     * The transaction hash identifier.
     * @example "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
     */
    txHash: string;
    /**
     * The final status of the transaction execution.
     * Indicates whether the transaction was successfully executed or reverted.
     * @example "success", "reverted"
     */
    status: 'success' | 'reverted';
    /**
     * The total amount of gas used by all transactions in the block up to and including this transaction.
     * Represents the cumulative gas consumption within the block.
     * @example 2100000n
     */
    cumulativeGasUsed?: bigint;
    /**
     * The amount of gas actually consumed by this specific transaction.
     * This value is always less than or equal to the gas limit set for the transaction.
     * @example 21000n
     */
    gasUsed?: bigint;
    /**
     * The block number where the transaction was mined.
     * Represents the sequential position of the block in the blockchain.
     * @example 18500000n
     */
    blockNumber?: bigint;
    /**
     * The hash of the block containing this transaction.
     * Provides a unique identifier for the block where the transaction was included.
     * @example "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
     */
    blockHash?: string;
    /**
     * The zero-based index position of the transaction within the block.
     * Indicates the order in which this transaction appears in the block.
     * @example 5
     */
    transactionIndex?: number;
    /**
     * The actual gas price paid per unit of gas for this transaction.
     * For EIP-1559 transactions, this reflects the base fee plus priority fee.
     * @example 15000000000n // 15 Gwei
     */
    effectiveGasPrice?: bigint;
}
interface WaitForTransactionConfig {
    /**
     * The timeout for the transaction to be mined and confirmed on the blockchain.
     * @example 10000
     */
    timeout?: number | undefined;
    /**
     * The number of confirmations to wait for the transaction to be mined and confirmed on the blockchain.
     * @example 1
     */
    confirmations?: number;
    /**
     * The maximum supported transaction version for getTransaction.
     * Defaults to 0 if not provided.
     * @example 0
     */
    maxSupportedTransactionVersion?: number;
}
/**
 * Type utility to extract the address context from adapter capabilities.
 *
 * @typeParam TAdapterCapabilities - The adapter capabilities type
 * @returns The address context type or never if capabilities are undefined
 */
type ExtractAddressContext<TAdapterCapabilities extends AdapterCapabilities> = TAdapterCapabilities extends {
    addressContext: infer TContext;
} ? TContext : never;
type AddressField<TAddressContext> = TAddressContext extends 'user-controlled' ? {
    /**
     * ℹ️ Address is forbidden for user-controlled adapters.
     *
     * User-controlled adapters (like browser wallets or private key adapters)
     * automatically resolve the address from the connected wallet or signer.
     * Providing an explicit address would conflict with this behavior.
     *
     * @example
     * ```typescript
     * // ℹ️ This will cause a TypeScript error:
     * const context: AdapterContext<{ addressContext: 'user-controlled' }> = {
     *   adapter: userAdapter,
     *   chain: 'Ethereum',
     *   address: '0x123...' // Error: Address is forbidden for user-controlled adapters
     * }
     * ```
     */
    address?: never;
} : TAddressContext extends 'developer-controlled' ? {
    /**
     * ℹ️ Address is required for developer-controlled adapters.
     *
     * Developer-controlled adapters (like enterprise providers or server-side adapters)
     * require an explicit address for each operation since they don't have a single
     * connected wallet. The address must be provided for every operation.
     *
     * @example
     * ```typescript
     * // ℹ️ This is required:
     * const context: AdapterContext<{ addressContext: 'developer-controlled' }> = {
     *   adapter: devAdapter,
     *   chain: 'Ethereum',
     *   address: '0x123...' // Required for developer-controlled adapters
     * }
     *
     * // ℹ️ This will cause a TypeScript error:
     * const context: AdapterContext<{ addressContext: 'developer-controlled' }> = {
     *   adapter: devAdapter,
     *   chain: 'Ethereum'
     *   // Error: Address is required for developer-controlled adapters
     * }
     * ```
     */
    address: string;
} : {
    /**
     * Address is optional for legacy adapters.
     *
     * Legacy adapters without defined capabilities maintain backward compatibility
     * by allowing optional address specification.
     */
    address?: string;
};
/**
 * Generic operation context for adapter methods with compile-time address validation.
 *
 * This type provides compile-time enforcement of address requirements based on the
 * adapter's capabilities. The address field behavior is determined by the adapter's
 * address control model:
 *
 * - **User-controlled adapters** (default): The `address` field is forbidden (never) because
 *   the address is automatically resolved from the connected wallet or signer.
 * - **Developer-controlled adapters**: The `address` field is required (string) because
 *   each operation must explicitly specify which address to use.
 * - **Legacy adapters**: The `address` field remains optional for backward compatibility.
 *
 * @typeParam TAdapterCapabilities - The adapter capabilities type to derive address requirements from
 *
 * @example
 * ```typescript
 * import { OperationContext } from '@core/adapter'
 *
 * // User-controlled adapter context (default - address forbidden)
 * type UserContext = OperationContext<{ addressContext: 'user-controlled', supportedChains: [] }>
 * const userCtx: UserContext = {
 *   chain: 'Ethereum'
 *   // address: '0x123...' // ❌ TypeScript error: address not allowed
 * }
 *
 * // Developer-controlled adapter context (explicit - address required)
 * type DevContext = OperationContext<{ addressContext: 'developer-controlled', supportedChains: [] }>
 * const devCtx: DevContext = {
 *   chain: 'Ethereum',
 *   address: '0x123...' // ✅ Required for developer-controlled
 * }
 * ```
 */
type OperationContext<TAdapterCapabilities extends AdapterCapabilities = AdapterCapabilities> = {
    /**
     * The blockchain network to use for this operation.
     */
    chain: ChainIdentifier;
} & AddressField<ExtractAddressContext<TAdapterCapabilities>>;
/**
 * Fully resolved context for an adapter operation, with concrete chain and address.
 *
 * This interface guarantees that both the blockchain network (`chain`) and the account
 * address (`address`) are present and valid. It is produced by resolving an {@link OperationContext},
 * which may have optional or conditional fields, into a form suitable for internal logic and action handlers.
 *
 * - `chain`: A fully resolved {@link ChainDefinition}, either explicitly provided or inferred from the adapter.
 * - `address`: A string representing the resolved account address, determined by the context or adapter,
 *   depending on the address control model (developer- or user-controlled).
 *
 * Use this type when an operation requires both the chain and address to be unambiguous and available.
 *
 * @example
 * ```ts
 * import { ResolvedOperationContext} from "@core/adapter"
 * import { Solana, ChainDefinition } from '@core/chains';
 *
 * const context: ResolvedOperationContext = {
 *   chain: Solana,
 *   address: '7Gk1v...abc123', // a valid Solana address
 * };
 *
 * // Use context.chain and context.address in adapter operations
 * ```
 */
interface ResolvedOperationContext {
    /**
     * The chain identifier for this operation.
     * Guaranteed to be defined - either from context or adapter default.
     */
    chain: ChainDefinition;
    /**
     * The address for this operation.
     * Guaranteed to be defined - either specified (developer-controlled) or resolved (user-controlled).
     */
    address: string;
}

/**
 * Base interface for all action parameter objects.
 *
 * Provide a compile-time marker to explicitly identify objects that represent
 * action parameters (leaf nodes) versus namespace containers that should be
 * traversed during type recursion.
 *
 * @remarks
 * This marker property exists only at the type level and is stripped away
 * during compilation. It serves as a deterministic way to identify action
 * parameter objects without relying on property name heuristics.
 *
 * All action parameter objects must extend this interface to be properly
 * recognized by the recursive utility types in the action system.
 */
interface ActionParameters {
    /**
     * Compile-time marker identifying this as an action parameter object.
     *
     * This property is used by the type system to distinguish between
     * namespace containers and action parameter definitions. It does not
     * exist at runtime and is purely for TypeScript's type checking.
     */
    readonly __isActionParams: true;
}

/**
 * EIP-2612 permit signature parameters for gasless token approvals.
 *
 * Contains the signature components and deadline required for permit-based
 * token spending authorization without requiring separate approval transactions.
 *
 * @example
 * ```typescript
 * const permitParams: PermitParams = {
 *   deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
 *   v: 27,
 *   r: '0x1234567890abcdef...',
 *   s: '0xfedcba0987654321...'
 * }
 * ```
 */
interface PermitParams {
    /**
     * Permit expiration timestamp (Unix timestamp in seconds).
     *
     * The permit signature becomes invalid after this timestamp.
     * Must be greater than the current block timestamp.
     */
    deadline: bigint;
    /**
     * Recovery parameter of the ECDSA signature (27 or 28).
     *
     * Used to recover the public key from the signature components.
     */
    v: number;
    /**
     * R component of the ECDSA signature.
     *
     * First 32 bytes of the signature as a hex string.
     */
    r: string;
    /**
     * S component of the ECDSA signature.
     *
     * Second 32 bytes of the signature as a hex string.
     */
    s: string;
}
/**
 * Action map for Circle's Cross-Chain Transfer Protocol (CCTP) version 2 operations.
 *
 * Define the parameter schemas for CCTP v2 actions that enable native USDC
 * transfers between supported blockchain networks. Use Circle's attestation
 * service to verify and complete cross-chain transactions with cryptographic
 * proof of burn and mint operations.
 *
 * @remarks
 * CCTP v2 represents Circle's native cross-chain transfer protocol that allows
 * USDC to move between chains without traditional lock-and-mint bridging.
 * Instead, USDC is burned on the source chain and minted natively on the
 * destination chain using cryptographic attestations.
 *
 * The protocol supports both "slow" (free) and "fast" (fee-based) transfer
 * modes, with configurable finality thresholds and destination execution
 * parameters for advanced use cases.
 *
 * @example
 * ```typescript
 * import type { CCTPv2ActionMap } from '@core/adapter/actions/cctp/v2'
 * import { mainnet, polygon } from '@core/chains'
 *
 * // Deposit and burn USDC for cross-chain transfer
 * const burnParams: CCTPv2ActionMap['depositForBurn'] = {
 *   amount: '1000000', // 1 USDC (6 decimals)
 *   mintRecipient: '0x742d35Cc6634C0532925a3b8D8E5e8d8D8e5e8d8D8e5e8',
 *   maxFee: '1000', // 0.001 USDC fast fee
 *   minFinalityThreshold: 65,
 *   fromChain: mainnet,
 *   toChain: polygon
 * }
 *
 * // Receive and mint USDC on destination chain
 * const receiveParams: CCTPv2ActionMap['receiveMessage'] = {
 *   eventNonce: '0x123abc...',
 *   attestation: '0xdef456...',
 *   message: '0x789012...',
 *   fromChain: mainnet,
 *   toChain: polygon
 * }
 * ```
 *
 * @see {@link ChainDefinitionWithCCTPv2} for supported chain definitions
 */
interface CCTPv2ActionMap {
    /**
     * Initiate a cross-chain USDC transfer by depositing and burning tokens on the source chain.
     *
     * Burn USDC tokens on the source chain and generate a message for attestation
     * by Circle's infrastructure. The burned tokens will be minted on the destination
     * chain once the attestation is obtained and the receive message is executed.
     *
     * @remarks
     * This action represents the first step in a CCTP cross-chain transfer. After
     * execution, you must wait for Circle's attestation service to observe the burn
     * event and provide a cryptographic attestation that can be used to mint the
     * equivalent amount on the destination chain.
     *
     * The `maxFee` parameter enables fast transfers through Circle's fast liquidity
     * network, where liquidity providers can fulfill transfers immediately in exchange
     * for a fee. Set to "0" for slower, free transfers that wait for full finality.
     */
    depositForBurn: ActionParameters & {
        /**
         * Amount of USDC to deposit and burn (in token's smallest unit).
         *
         * Specify the amount in the token's atomic units (e.g., for USDC with
         * 6 decimals, "1000000" represents 1 USDC). This amount will be burned
         * on the source chain and minted on the destination chain.
         */
        amount: bigint;
        /**
         * Address of the recipient who will receive minted tokens on the destination chain.
         *
         * Provide the destination address as a 32-byte hex string (bytes32 format).
         */
        mintRecipient: string;
        /**
         * Address authorized to call receiveMessage on the destination chain.
         *
         * Restrict who can execute the final minting step on the destination chain.
         * If not specified or set to bytes32(0), any address can call receiveMessage.
         * Use this for advanced integrations requiring specific execution control.
         *
         * @defaultValue bytes32(0) - allows any address to complete the transfer
         */
        destinationCaller?: string;
        /**
         * Maximum fee to pay for fast transfer fulfillment.
         *
         * Specify the maximum amount (in the same units as `amount`) you're willing
         * to pay for immediate liquidity. Set to "0" for free transfers that wait
         * for full chain finality. Higher fees increase the likelihood of fast
         * fulfillment.
         */
        maxFee: bigint;
        /**
         * Minimum finality threshold for attestation eligibility.
         *
         * Set the number of confirmations required before Circle's attestation
         * service will observe and attest to the burn event. Higher values
         * provide stronger finality guarantees but increase transfer time.
         * Typical values: 1000 for fast transfers, 2000 for maximum security.
         */
        minFinalityThreshold: number;
        /**
         * Source chain definition where tokens will be burned.
         */
        fromChain: ChainDefinitionWithCCTPv2;
        /**
         * Destination chain definition where tokens will be minted.
         */
        toChain: ChainDefinitionWithCCTPv2;
    };
    /**
     * Complete a cross-chain transfer by receiving and processing an attested message.
     *
     * Execute the final step of a CCTP transfer by submitting Circle's attestation
     * and the original message to mint USDC tokens on the destination chain.
     * This action consumes the attestation and delivers tokens to the specified
     * recipient from the original burn operation.
     *
     * @remarks
     * This action must be called after obtaining a valid attestation from Circle's
     * API for a corresponding `depositForBurn` operation. The attestation proves
     * that tokens were burned on the source chain and authorizes minting the
     * equivalent amount on the destination chain.
     *
     * The message parameter contains the original burn message data, while the
     * attestation provides the cryptographic proof. Both must match exactly
     * with Circle's records for the transaction to succeed.
     */
    receiveMessage: ActionParameters & {
        /**
         * Unique nonce identifying the specific burn event.
         *
         * Provide the event nonce from the MessageSent event emitted by the
         * depositForBurn transaction. This must be a 0x-prefixed 64-character
         * hex string representing the 32-byte nonce value.
         */
        readonly eventNonce: string;
        /**
         * Cryptographic attestation from Circle's infrastructure.
         *
         * Submit the attestation obtained from Circle's API that proves the
         * corresponding burn event occurred and was observed. This must be
         * a valid 0x-prefixed hex string containing Circle's signature data.
         */
        readonly attestation: string;
        /**
         * Original message bytes from the source chain burn event.
         *
         * Provide the raw message data emitted in the MessageSent event from
         * the depositForBurn transaction. This 0x-prefixed hex string contains
         * the encoded transfer details that will be verified against the attestation.
         */
        readonly message: string;
        /**
         * Source chain definition where the original burn occurred.
         */
        readonly fromChain: ChainDefinitionWithCCTPv2;
        /**
         * Destination chain definition where tokens will be minted.
         */
        readonly toChain: ChainDefinitionWithCCTPv2;
        /**
         * Optional destination wallet address on the destination chain to receive minted USDC.
         *
         * When provided (e.g., for Solana), the mint instruction will derive the
         * recipient's Associated Token Account (ATA) from this address instead of
         * the adapter's default address.
         */
        readonly destinationAddress?: string;
        /**
         * The mint recipient address from the decoded CCTP message.
         *
         * This is the actual address encoded in the burn message where tokens will be minted.
         * For Solana, this is already the Associated Token Account (ATA) address, not the owner.
         * For EVM chains, this is the recipient's wallet address.
         */
        readonly mintRecipient?: string;
    };
    /**
     * Initiate a cross-chain USDC transfer using a custom bridge contract with preapproval funnel.
     *
     * This action combines token approval and burning into a single transaction using
     * a custom bridge contract that supports preapproval functionality. It provides
     * enhanced gas efficiency by eliminating separate approval transactions while
     * maintaining the same developer interface as standard CCTP transfers.
     *
     * @remarks
     * This action is only available on chains that support custom bridge contracts,
     * as determined by `hasCustomContractSupport(chain, 'bridge')`. The custom bridge
     * handles token approval internally and supports advanced features like protocol
     * fees and custom routing logic.
     *
     * For basic use cases, this provides the same interface as `depositForBurn`.
     * For advanced use cases, optional protocol fee parameters enable custom fee
     * collection and revenue sharing models.
     *
     * @example
     * ```typescript
     * // Basic usage (same as depositForBurn)
     * await adapter.action('cctp.v2.customBurn', {
     *   amount: BigInt('1000000'),
     *   mintRecipient: '0x...',
     *   maxFee: BigInt('1000'),
     *   minFinalityThreshold: 65
     * })
     *
     * // Advanced usage with protocol fees
     * await adapter.action('cctp.v2.customBurn', {
     *   amount: BigInt('1000000'),
     *   mintRecipient: '0x...',
     *   maxFee: BigInt('1000'),
     *   minFinalityThreshold: 65,
     *   protocolFee: BigInt('100'),
     *   feeRecipient: '0xFeeRecipientAddress'
     * })
     * ```
     */
    customBurn: ActionParameters & {
        /**
         * Amount of USDC to burn (in token's smallest unit).
         *
         * Specify the amount in the token's atomic units (e.g., for USDC with
         * 6 decimals, 1000000n represents 1 USDC). This amount will be burned
         * on the source chain and minted on the destination chain.
         */
        amount: bigint;
        /**
         * Address of the recipient who will receive minted tokens on the destination chain.
         *
         * Provide the destination address as a 32-byte hex string (bytes32 format).
         */
        mintRecipient: string;
        /**
         * Address authorized to call receiveMessage on the destination chain.
         *
         * Restrict who can execute the final minting step on the destination chain.
         * If not specified or set to bytes32(0), any address can call receiveMessage.
         * Use this for advanced integrations requiring specific execution control.
         *
         * @defaultValue bytes32(0) - allows any address to complete the transfer
         */
        destinationCaller?: string;
        /**
         * Maximum fee to pay for fast transfer fulfillment.
         *
         * Specify the maximum amount (in the same units as `amount`) you're willing
         * to pay for immediate liquidity. Set to "0" for free transfers that wait
         * for full chain finality. Higher fees increase the likelihood of fast
         * fulfillment.
         */
        maxFee: bigint;
        /**
         * Minimum finality threshold for attestation eligibility.
         *
         * Set the number of confirmations required before Circle's attestation
         * service will observe and attest to the burn event. Higher values
         * provide stronger finality guarantees but increase transfer time.
         * Typical values: 65 for standard transfers, 2000 for maximum security.
         */
        minFinalityThreshold: number;
        /**
         * Protocol fee amount (in token's smallest unit).
         *
         * Additional fee charged by the custom bridge for enhanced functionality.
         * This fee is separate from the Circle fast transfer fee and is paid to
         * the specified fee recipient. Enables custom fee collection and revenue
         * sharing models for bridge operators.
         *
         * @defaultValue 0n - no protocol fee for basic usage
         */
        protocolFee?: bigint | undefined;
        /**
         * Address to receive the protocol fee.
         *
         * Wallet address where the protocol fee will be sent. This enables
         * custom fee collection and revenue sharing models for bridge operators.
         * Only relevant when protocolFee is greater than 0.
         *
         * @defaultValue bridge contract address - safe fallback for zero fees
         */
        feeRecipient?: string | undefined;
        /**
         * Source chain definition where tokens will be burned.
         */
        fromChain: ChainDefinitionWithCCTPv2;
        /**
         * Destination chain definition where tokens will be minted.
         */
        toChain: ChainDefinitionWithCCTPv2;
        /**
         * Permit parameters for the custom bridge contract.
         */
        permitParams?: PermitParams;
    };
}

/**
 * Central registry for Cross-Chain Transfer Protocol (CCTP) action namespaces.
 *
 * Define versioned action maps for CCTP operations across different protocol
 * versions. Each version key represents a specific CCTP implementation with
 * its own parameter schemas and operational requirements.
 *
 * @remarks
 * CCTP actions enable cross-chain USDC transfers through Circle's native
 * bridging protocol. Each version namespace contains actions specific to
 * that protocol iteration, allowing for protocol upgrades while maintaining
 * backward compatibility in the action system.
 *
 * This interface follows the same pattern as other action namespaces but
 * is organized by protocol version rather than token type.
 *
 * @see {@link CCTPv2ActionMap} for version 2 action definitions
 */
interface CCTPActionMap {
    /** CCTP version 2 operations for cross-chain USDC transfers. */
    readonly v2: CCTPv2ActionMap;
}

/**
 * Action map for native token operations (ETH, SOL, MATIC, etc.).
 *
 * Native tokens are the primary currency of each blockchain network,
 * used for paying transaction fees and as a store of value.
 * These actions operate on the native token without requiring
 * a separate token contract address.
 *
 * @remarks
 * Native token operations differ from ERC-20/SPL token operations
 * in that they don't require contract interactions for basic transfers
 * and balance checks.
 *
 * @see {@link ActionMap} for the complete action structure
 */
interface NativeActionMap {
    /**
     * Get the native token balance (SOL, ETH, etc.) for a wallet address.
     */
    balanceOf: ActionParameters & {
        /**
         * The address to check the native balance for. If not provided, it will be
         * automatically derived from the adapter context.
         */
        walletAddress?: string | undefined;
    };
}

interface TokenActionMap {
    /**
     * Set an allowance for a delegate to spend tokens on behalf of the wallet.
     *
     * On chains without native allowance support, this may return a noop result
     * indicating the step can be safely skipped.
     */
    approve: ActionParameters & {
        /**
         * The contract address of the token.
         */
        tokenAddress: string;
        /**
         * The address that will be approved to spend the tokens.
         */
        delegate: string;
        /**
         * The amount of tokens to approve for spending (in token's smallest unit).
         */
        amount: bigint;
    };
    /**
     * Check the current allowance between an owner and spender for any token.
     *
     * On chains without allowance support, this typically returns the maximum
     * possible value to indicate unlimited spending capability.
     */
    allowance: ActionParameters & {
        /**
         * The contract address of the token.
         */
        tokenAddress: string;
        /**
         * The address of the wallet that owns the tokens. If not provided, it will be
         * automatically derived from the adapter context.
         */
        walletAddress?: string | undefined;
        /**
         * The address to check the allowance for.
         */
        delegate: string;
    };
    /**
     * Transfer tokens directly from the wallet to another address.
     */
    transfer: ActionParameters & {
        /**
         * The contract address of the token.
         */
        tokenAddress: string;
        /**
         * The address to send the tokens to.
         */
        to: string;
        /**
         * The amount of tokens to transfer (in token's smallest unit).
         */
        amount: bigint;
    };
    /**
     * Transfer tokens from one address to another using a pre-approved allowance.
     *
     * On chains without allowance support, this may behave differently or throw
     * an error if the operation is not supported.
     */
    transferFrom: ActionParameters & {
        /**
         * The contract address of the token.
         */
        tokenAddress: string;
        /**
         * The address to transfer tokens from (must have given allowance to the caller).
         */
        from: string;
        /**
         * The address to send the tokens to.
         */
        to: string;
        /**
         * The amount of tokens to transfer (in token's smallest unit).
         */
        amount: bigint;
    };
    /**
     * Get the current token balance for a wallet address.
     */
    balanceOf: ActionParameters & {
        /**
         * The contract address of the token.
         */
        tokenAddress: string;
        /**
         * The address to check the balance for. If not provided, it will be
         * automatically derived from the adapter context.
         */
        walletAddress?: string | undefined;
    };
}

/**
 * USDC-specific operations that automatically resolve the token address.
 *
 * These include all standard ERC20 operations plus additional safety functions
 * that USDC supports. The interface provides the same core operations as
 * {@link TokenActionMap} but without requiring a `tokenAddress` parameter,
 * plus additional USDC-specific extensions.
 *
 * @example
 * ```typescript
 * // USDC operations (address auto-resolved)
 * await adapter.action('usdc.approve', {
 *   delegate: '0x1234...',
 *   amount: '1000000' // 1 USDC
 * })
 *
 * // USDC-specific safe allowance functions
 * await adapter.action('usdc.increaseAllowance', {
 *   delegate: '0x1234...',
 *   amount: '500000' // increase by 0.5 USDC
 * })
 *
 * // vs. general token operations (address required)
 * await adapter.action('token.approve', {
 *   tokenAddress: '0xA0b86a33E6441c8C1c7C16e4c5e3e5b5e4c5e3e5b5e4c5e',
 *   delegate: '0x1234...',
 *   amount: '1000000'
 * })
 * ```
 */
type BaseUSDCActions = {
    [K in keyof TokenActionMap]: Omit<TokenActionMap[K], 'tokenAddress'>;
};
/**
 * USDC action map with both standard ERC20 operations and USDC-specific extensions.
 *
 * This provides all standard token operations plus additional safety functions
 * that USDC implements beyond the base ERC20 standard.
 */
interface USDCActionMap {
    /**
     * Set an allowance for a delegate to spend USDC tokens on behalf of the wallet.
     *
     * Automatically uses the USDC contract address for the current chain.
     * On chains without native allowance support, this may return a noop result.
     */
    approve: BaseUSDCActions['approve'];
    /**
     * Check the current allowance between an owner and spender for USDC tokens.
     *
     * Automatically uses the USDC contract address for the current chain.
     * This is a read-only operation.
     */
    allowance: BaseUSDCActions['allowance'];
    /**
     * Safely increase the allowance for a delegate to spend USDC tokens.
     *
     * This is a USDC-specific function that provides safer allowance management
     * compared to direct approve() calls. Automatically uses the USDC contract
     * address for the current chain.
     */
    increaseAllowance: ActionParameters & {
        /**
         * The address that will have their allowance increased.
         */
        delegate: string;
        /**
         * The amount to increase the allowance by (in USDC's smallest unit).
         */
        amount: bigint;
        /**
         * The chain definition for the current chain.
         */
        chain?: ChainDefinition;
    };
    /**
     * Safely decrease the allowance for a delegate to spend USDC tokens.
     *
     * This is a USDC-specific function that provides safer allowance management.
     * Automatically uses the USDC contract address for the current chain.
     */
    decreaseAllowance: ActionParameters & {
        /**
         * The address that will have their allowance decreased.
         */
        delegate: string;
        /**
         * The amount to decrease the allowance by (in USDC's smallest unit).
         */
        amount: bigint;
    };
    /**
     * Transfer USDC tokens directly from the wallet to another address.
     *
     * Automatically uses the USDC contract address for the current chain.
     */
    transfer: BaseUSDCActions['transfer'];
    /**
     * Transfer USDC tokens from one address to another using a pre-approved allowance.
     *
     * Automatically uses the USDC contract address for the current chain.
     * The caller must have sufficient allowance from the 'from' address.
     */
    transferFrom: BaseUSDCActions['transferFrom'];
    /**
     * Get the current USDC balance for a wallet address.
     *
     * Automatically uses the USDC contract address for the current chain.
     * This is a read-only operation.
     */
    balanceOf: Omit<BaseUSDCActions['balanceOf'], 'tokenAddress'>;
}

/**
 * Central registry of all available action namespaces and their operations.
 *
 * Define the complete action map structure used throughout the bridge kit.
 * Each top-level key represents a namespace (e.g., 'token', 'usdc') containing
 * related operations. The structure supports arbitrary nesting depth through
 * the recursive utility types provided in this module.
 *
 * @remarks
 * This interface serves as the foundation for type-safe action dispatching
 * and provides compile-time validation of action keys and payload types.
 * All action-related utility types derive from this central definition.
 *
 * @see {@link ActionKeys} for dot-notation action paths
 * @see {@link ActionPayload} for extracting payload types
 */
interface ActionMap {
    /** CCTP-specific operations with automatic address resolution. */
    readonly cctp: CCTPActionMap;
    /** Native token operations (ETH, SOL, MATIC, etc.). */
    readonly native: NativeActionMap;
    /** General token operations requiring explicit token addresses. */
    readonly token: TokenActionMap;
    /** USDC-specific operations with automatic address resolution. */
    readonly usdc: USDCActionMap;
}
/**
 * Determine if a type represents an action parameter object (leaf node).
 *
 * Check whether a type extends the ActionParameters interface, which provides
 * an explicit marker for identifying action parameter objects versus namespace
 * containers that should be traversed during type recursion.
 *
 * @typeParam T - The type to examine for parameter object characteristics
 *
 * @remarks
 * This utility type provides deterministic leaf detection for the recursive
 * type system. By requiring all action parameter objects to extend the
 * ActionParameters interface, we eliminate the need for property name
 * heuristics and make the system more maintainable.
 *
 * @see {@link ActionParameters} for the base interface
 * @see {@link NestedKeys} for usage in path extraction
 */
type IsActionParameterObject<T> = T extends ActionParameters ? true : false;
/**
 * Recursively extract all nested keys from an object type as dot-notation string literals.
 *
 * Traverse object structures of arbitrary depth and generate string literal
 * types representing all possible paths through the structure using dot
 * notation. Stop recursion when encountering action parameter objects (leaves).
 *
 * @typeParam T - The object type to extract nested keys from
 *
 * @remarks
 * This type is the foundation for generating type-safe action paths in
 * dot notation. It automatically adapts to changes in the ActionMap
 * structure and supports unlimited nesting depth for future extensibility.
 *
 * The recursion stops when it encounters objects that match the
 * {@link IsActionParameterObject} criteria, ensuring that only valid
 * action paths are generated.
 *
 * @see {@link ActionKeys} for ActionMap-specific paths
 * @see {@link NestedValue} for extracting types at specific paths
 * @see {@link IsActionParameterObject} for leaf detection logic
 */
type NestedKeys<T> = {
    [K in Extract<keyof T, string>]: IsActionParameterObject<T[K]> extends true ? K : T[K] extends object ? `${K}.${NestedKeys<T[K]>}` : never;
}[Extract<keyof T, string>];
/**
 * Recursively extract the value type at a given dot-notation path.
 *
 * Navigate through nested object types using a dot-notation string path
 * and return the type of the value at that location. Parse the path
 * recursively by splitting on dots and traversing the object structure.
 *
 * @typeParam T - The object type to navigate through
 * @typeParam K - The dot-notation path as a string literal type
 *
 * @remarks
 * This utility type enables type-safe access to deeply nested object
 * properties using dot notation paths. It forms the foundation for
 * extracting payload types from action paths in the ActionMap.
 *
 * @see {@link ActionPayload} for ActionMap-specific value extraction
 * @see {@link NestedKeys} for generating valid path types
 */
type NestedValue<T, K extends string> = K extends `${infer First}.${infer Rest}` ? First extends keyof T ? NestedValue<T[First], Rest> : never : K extends keyof T ? T[K] : never;
/**
 * Union type of all nested action keys in dot notation.
 *
 * Generate string literal types for all possible action paths in the
 * ActionMap structure. Automatically adapt to changes in the ActionMap
 * and support arbitrary levels of nesting for future extensibility.
 *
 * @remarks
 * This type serves as the canonical source for all valid action identifiers
 * in the bridge kit. It ensures compile-time validation of action keys
 * and enables type-safe action dispatching throughout the application.
 *
 * @see {@link ActionPayload} for extracting parameter types
 * @see {@link NamespaceActions} for namespace-specific actions
 * @see {@link ActionMap} for the underlying structure
 */
type ActionKeys = NestedKeys<ActionMap>;
/**
 * Extract the payload type for a specific action based on its dot-notation key.
 *
 * Resolve the parameter type for any action by providing its complete path
 * in dot notation. Leverage the recursive NestedValue type to navigate to
 * the correct payload type regardless of nesting depth. The internal
 * ActionParameters marker is automatically removed from the result.
 *
 * @typeParam T - The action key in dot notation (must extend ActionKeys)
 *
 * @remarks
 * This utility type enables type-safe parameter passing for action
 * dispatching. It automatically infers the correct parameter shape
 * based on the action key, providing compile-time validation and
 * excellent IntelliSense support.
 *
 * The internal `__isActionParams` marker used for type system recursion
 * is automatically omitted from the resulting type, providing clean
 * parameter objects for consumers.
 *
 * @see {@link ActionKeys} for available action identifiers
 * @see {@link NestedValue} for the underlying path resolution logic
 */
type ActionPayload<T extends ActionKeys> = Omit<NestedValue<ActionMap, T>, '__isActionParams'>;

/**
 * Type-safe action handler function signature for specific action types.
 *
 * Defines the contract for functions that process action payloads and return
 * prepared chain requests. Each handler is strongly typed to accept only the
 * payload structure corresponding to its specific action key.
 *
 * @typeParam TActionKey - The specific action key this handler processes.
 * @param params - The action payload matching the specified action key.
 * @param context - The resolved operation context with concrete chain and address values.
 * @returns A promise resolving to a prepared chain request.
 *
 * @example
 * ```typescript
 * import type { ActionHandler } from '@core/adapter'
 *
 * const depositHandler: ActionHandler<'cctp.v2.depositForBurn'> = async (params, context) => {
 *   // context is always defined and has concrete chain and address values
 *   console.log(context.chain.name);
 *   console.log(context.address);
 *   // ... handler logic ...
 *   return preparedRequest;
 * }
 * ```
 */
type ActionHandler<TActionKey extends ActionKeys> = (params: ActionPayload<TActionKey>, context: ResolvedOperationContext) => Promise<PreparedChainRequest>;
/**
 * Type-safe mapping of all available action keys to their corresponding handlers.
 *
 * This type defines a registry object where each key is a valid action key
 * (as defined by {@link ActionKeys}) and each value is an {@link ActionHandler}
 * capable of processing the payload for that action. This enables strongly-typed
 * handler registration and lookup for all supported actions in the Stablecoin Kits.
 *
 * @remarks
 * Each handler is typed as {@link ActionHandler}, which means the handler
 * must accept the payload type for the specific action key it is registered under.
 * This provides type safety for handler registration and execution, but does not
 * enforce per-key handler parameterization at the type level. For stricter per-key
 * typing, consider using mapped types or generic registry patterns.
 *
 * @example
 * ```typescript
 * import type { ActionHandlers } from '@core/adapter'
 * import type { ActionHandler } from '@core/adapter'
 *
 * const handlers: ActionHandlers = {
 *   'cctp.v2.depositForBurn': async (params, resolved) => {
 *     // params is correctly typed for 'cctp.v2.depositForBurn'
 *     // resolved has concrete chain and address values
 *     // ...handler logic...
 *   },
 *   'usdc.approve': async (params, resolved) => {
 *     // params is correctly typed for 'usdc.approve'
 *     // resolved has concrete chain and address values
 *     // ...handler logic...
 *   }
 * }
 * ```
 */
type ActionHandlers = {
    [K in ActionKeys]?: ActionHandler<K>;
};
/**
 * Type-safe registry for managing and executing blockchain action handlers.
 *
 * Provides a centralized system for registering action handlers with full
 * TypeScript type safety, ensuring that handlers can only be registered
 * with compatible action keys and payload types. Supports both individual
 * handler registration and batch registration operations.
 *
 * @remarks
 * The registry uses a Map internally for O(1) lookups and maintains type
 * safety through generic constraints and careful type assertions. All
 * type assertions are validated at registration time to ensure runtime
 * type safety matches compile-time guarantees.
 */
declare class ActionRegistry {
    readonly actionHandlers: Map<ActionKeys, ActionHandler<ActionKeys>>;
    /**
     * Register a type-safe action handler for a specific action key.
     *
     * Associates an action handler function with its corresponding action key,
     * ensuring compile-time type safety between the action and its expected
     * payload structure. The handler will be available for execution via
     * {@link executeAction}.
     *
     * @typeParam TActionKey - The specific action key being registered.
     * @param action - The action key to register the handler for.
     * @param handler - The handler function for processing this action type.
     * @returns Void.
     *
     * @throws Error When action parameter is not a valid string.
     * @throws TypeError When handler parameter is not a function.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     * import type { ActionHandler } from '@core/adapter'
     *
     * const registry = new ActionRegistry()
     *
     * // Register a CCTP deposit handler
     * const depositHandler: ActionHandler<'cctp.v2.depositForBurn'> = async (params, resolved) => {
     *   console.log('Processing deposit:', params.amount)
     *   return {
     *     chainId: params.chainId,
     *     data: '0x...',
     *     to: '0x...',
     *     value: '0'
     *   }
     * }
     *
     * registry.registerHandler('cctp.v2.depositForBurn', depositHandler)
     * ```
     */
    registerHandler<TActionKey extends ActionKeys>(action: TActionKey, handler: ActionHandler<TActionKey>): void;
    /**
     * Register multiple action handlers in a single operation.
     *
     * Efficiently register multiple handlers from a record object, where keys
     * are action identifiers and values are their corresponding handler
     * functions. Provides a convenient way to bulk-register handlers while
     * maintaining type safety.
     *
     * @param handlers - A record mapping action keys to their handler functions.
     * @returns Void.
     *
     * @throws {Error} When handlers parameter is not a valid object.
     * @throws {Error} When any individual handler registration fails.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     * import type { ActionHandler, ActionHandlers } from '@core/adapter'
     *
     * const registry = new ActionRegistry()
     *
     * // Register multiple handlers at once
     * const tokenHandlers: ActionHandlers = {
     *   'token.approve': async (params, resolved) => ({
     *     chainId: resolved.chain,
     *     data: '0x095ea7b3...',
     *     to: params.tokenAddress,
     *     value: '0'
     *   }),
     *   'token.transfer': async (params, resolved) => ({
     *     chainId: resolved.chain,
     *     data: '0xa9059cbb...',
     *     to: params.tokenAddress,
     *     value: '0'
     *   })
     * }
     *
     * registry.registerHandlers(tokenHandlers)
     * console.log('Registered multiple token handlers')
     * ```
     */
    registerHandlers(handlers: ActionHandlers): void;
    /**
     * Check whether a specific action is supported by this registry.
     *
     * Determine if a handler has been registered for the given action key.
     * Use this method to conditionally execute actions or provide appropriate
     * error messages when actions are not available.
     *
     * @param action - The action key to check for support.
     * @returns True if the action is supported, false otherwise.
     *
     * @throws {Error} When action parameter is not a valid string.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     *
     * const registry = new ActionRegistry()
     *
     * // Check if actions are supported before attempting to use them
     * if (registry.supportsAction('token.approve')) {
     *   console.log('Token approval is supported')
     * } else {
     *   console.log('Token approval not available')
     * }
     *
     * // Conditional logic based on support
     * const action = 'cctp.v2.depositForBurn'
     * if (registry.supportsAction(action)) {
     *   // Safe to execute
     *   console.log(`${action} is available`)
     * } else {
     *   console.warn(`${action} is not registered`)
     * }
     * ```
     */
    supportsAction(action: ActionKeys): boolean;
    /**
     * Execute a registered action handler with type-safe parameters.
     *
     * Look up and execute the handler associated with the given action key,
     * passing the provided parameters and context, returning the resulting prepared
     * chain request. TypeScript ensures the parameters match the expected
     * structure for the specified action.
     *
     * @typeParam TActionKey - The specific action key being executed.
     * @param action - The action key identifying which handler to execute.
     * @param params - The parameters to pass to the action handler.
     * @param context - The resolved operation context with concrete chain and address values.
     * @returns A promise resolving to the prepared chain request.
     * @throws {KitError} When the handler execution fails with a structured error.
     * @throws {Error} When no handler is registered for the specified action.
     * @throws {Error} When the handler execution fails with an unstructured error.
     *
     * @example
     * ```typescript
     * import { ActionRegistry } from '@core/adapter'
     * import type { ChainEnum } from '@core/chains'
     *
     * const registry = new ActionRegistry()
     *
     * // First register a handler
     * registry.registerHandler('token.approve', async (params, context) => ({
     *   chainId: context.chain, // Always defined
     *   data: '0x095ea7b3...',
     *   to: params.tokenAddress,
     *   value: '0'
     * }))
     *
     * // Execute the action with resolved context (typically called from adapter.prepareAction)
     * const resolvedContext = { chain: 'Base', address: '0x123...' }
     * const result = await registry.executeAction('token.approve', {
     *   chainId: ChainEnum.Ethereum,
     *   tokenAddress: '0xA0b86a33E6441c8C1c7C16e4c5e3e5b5e4c5e3e5b5e4c5e',
     *   delegate: '0x1234567890123456789012345678901234567890',
     *   amount: '1000000'
     * }, resolvedContext)
     *
     * console.log('Transaction prepared:', result.data)
     * ```
     */
    executeAction<TActionKey extends ActionKeys>(action: TActionKey, params: ActionPayload<TActionKey>, context: ResolvedOperationContext): Promise<PreparedChainRequest>;
}

/**
 * Defines the capabilities of an adapter, including address handling patterns and supported chains.
 *
 * @interface TAdapterCapabilities
 * @category Types
 * @description
 * This interface specifies how an adapter manages address control and which blockchain networks it supports.
 * It is used for capability discovery, validation, and to inform consumers about the adapter's operational model.
 *
 * The `addressContext` property determines both address selection behavior and bridge API requirements:
 * - `'user-controlled'`: User controls addresses through wallet UI, address optional in operations
 * - `'developer-controlled'`: Service manages addresses programmatically, address required in operations
 *
 * @example
 * ```typescript
 * // Browser wallet adapter (user-controlled)
 * const capabilities: AdapterCapabilities = {
 *   addressContext: 'user-controlled', // User selects address in wallet UI
 *   supportedChains: [Ethereum, Base, Polygon]
 * }
 *
 * // Enterprise provider adapter (developer-controlled)
 * const capabilities: AdapterCapabilities = {
 *   addressContext: 'developer-controlled', // Address must be specified per operation
 *   supportedChains: [Ethereum, Base, Solana]
 * }
 * ```
 */
interface AdapterCapabilities {
    /**
     * Defines who controls address selection for wallet operations.
     *
     * - `'user-controlled'`: User controls addresses through wallet UI (browser wallets, hardware wallets)
     *   - Address is implicit in bridge operations (uses wallet's current address)
     *   - Adapter may listen for accountsChanged/chainChanged events
     *   - Suitable for MetaMask, Coinbase Wallet, WalletConnect, private keys, etc.
     *
     * - `'developer-controlled'`: Service manages addresses programmatically (enterprise providers)
     *   - Address must be explicitly provided in bridge operations
     *   - No event listening (addresses controlled programmatically)
     *   - Suitable for Fireblocks, Circle Wallets, institutional custody, etc.
     */
    addressContext: 'user-controlled' | 'developer-controlled';
    /**
     * The set of blockchain networks this adapter supports.
     * Used for validation, capability discovery, and to restrict operations to supported chains.
     */
    supportedChains: ChainDefinition[];
}
/**
 * Abstract class defining the standard interface for an adapter that interacts with a specific blockchain.
 *
 * A `Adapter` is responsible for encapsulating chain-specific logic necessary to
 * perform operations like sending transactions, querying balances, or interacting with smart contracts.
 * Implementations of this class will provide concrete logic for a particular blockchain protocol.
 *
 * This abstraction allows the Stablecoin Kits to work with multiple blockchains in a uniform way.
 *
 * @typeParam TAdapterCapabilities - The adapter capabilities type for compile-time address validation.
 * When provided, enables strict typing of operation context based on the adapter's address control model.
 */
declare abstract class Adapter<TAdapterCapabilities extends AdapterCapabilities = AdapterCapabilities> {
    /**
     * The type of the chain for this adapter.
     *
     * - For concrete adapters, this should be a real chain type (e.g., `'evm'`, `'solana'`, etc.) from the ChainType union.
     * - For hybrid adapters (adapters that route to concrete adapters supporting multiple ecosystems),
     *   set this property to the string literal `'hybrid'`.
     *
     * Note: `'hybrid'` is not a legal ChainType and should only be used as a marker for multi-ecosystem adapters.
     * Hybrid adapters do not interact directly with any chain, but instead route requests to a concrete underlying adapter.
     *
     * @example
     *   // For an EVM-only adapter:
     *   chainType = 'evm'
     *
     *   // For a hybrid adapter:
     *   chainType = 'hybrid'
     */
    abstract chainType: ChainType | 'hybrid';
    /**
     * Capabilities of this adapter, defining address control model and supported chains.
     *
     * This property determines how the adapter behaves, especially for address selection
     * and bridge API requirements. The `addressContext` must match the adapter's type parameter.
     *
     * @remarks
     * The `addressContext` value must align with the adapter's generic type parameter for proper
     * type safety in bridge operations.
     *
     * @example
     * ```typescript
     * // User-controlled adapter (private key, browser wallet)
     * capabilities = {
     *   addressContext: 'user-controlled', // Address implicit in bridge operations
     *   supportedChains: [Ethereum, Base, Polygon]
     * }
     *
     * // Developer-controlled adapter (enterprise provider)
     * capabilities = {
     *   addressContext: 'developer-controlled', // Address required in bridge operations
     *   supportedChains: [Ethereum, Base, Solana]
     * }
     * ```
     */
    capabilities?: TAdapterCapabilities;
    /**
     * Registry of available actions for this adapter.
     *
     * The {@link ActionRegistry} provides a catalog of supported operations
     * (such as token transfers, approvals, etc.) that can be performed by this adapter
     * on the connected blockchain. This enables dynamic discovery and invocation
     * of chain-specific or cross-chain actions in a type-safe manner.
     *
     * @readonly
     */
    readonly actionRegistry: ActionRegistry;
    /**
     * Prepares (but does not execute) an action for the connected blockchain.
     *
     * This method looks up the appropriate action handler for the given action key
     * and prepares the transaction request using the provided parameters. The returned
     * {@link PreparedChainRequest} allows developers to estimate gas costs and execute
     * the transaction at a later time, enabling pre-flight simulation and deferred execution.
     *
     * **Compile-time Address Validation**: When used with typed adapters that have capabilities,
     * this method enforces address requirements at compile time:
     * - **User-controlled adapters**: The `address` field is forbidden in the context
     * - **Developer-controlled adapters**: The `address` field is required in the context
     * - **Legacy adapters**: The `address` field remains optional for backward compatibility
     *
     * @remarks
     * This method does not send any transaction to the network. Instead, it returns a
     * prepared request object with `estimate()` and `execute()` methods, allowing
     * developers to inspect, simulate, or submit the transaction as needed.
     *
     * @param action - The action key identifying which handler to use for preparation.
     * @param params - The parameters to pass to the action handler.
     * @param ctx - Operation context with compile-time validated address requirements based on adapter capabilities.
     * @returns A promise that resolves to a {@link PreparedChainRequest} for estimation and execution.
     * @throws Error If the specified action key does not correspond to a registered handler.
     * @throws Error If the provided parameters are invalid for the action.
     * @throws Error If the operation context cannot be resolved.
     *
     * @example
     * ```typescript
     * // User-controlled adapter (address forbidden)
     * const userAdapter: Adapter<{ addressContext: 'user-controlled', supportedChains: [] }>
     * await userAdapter.prepareAction('token.approve', params, {
     *   chain: 'Ethereum'
     *   // address: '0x123...' // ❌ TypeScript error: address not allowed
     * })
     *
     * // Developer-controlled adapter (address required)
     * const devAdapter: Adapter<{ addressContext: 'developer-controlled', supportedChains: [] }>
     * await devAdapter.prepareAction('token.approve', params, {
     *   chain: 'Ethereum',
     *   address: '0x123...' // ✅ Required for developer-controlled
     * })
     * ```
     */
    prepareAction<TActionKey extends ActionKeys>(action: TActionKey, params: ActionPayload<TActionKey>, ctx: OperationContext<TAdapterCapabilities>): Promise<PreparedChainRequest>;
    /**
     * Prepares a transaction for future gas estimation and execution.
     *
     * This method should handle any preliminary steps required before a transaction
     * can be estimated or sent. This might include things like serializing transaction
     * data, but it should NOT yet send anything to the network.
     *
     * The returned object contains two functions:
     *  - `estimate()`: Asynchronously calculates and returns the {@link EstimatedGas} for the prepared transaction.
     *  - `execute()`: Asynchronously executes the prepared transaction and returns a promise that resolves
     *                 with the transaction result (e.g., a transaction hash, receipt, or other chain-specific response).
     *
     * **Compile-time Address Validation**: When used with typed adapters that have capabilities,
     * this method enforces address requirements at compile time:
     * - **User-controlled adapters**: The `address` field is forbidden in the context
     * - **Developer-controlled adapters**: The `address` field is required in the context
     * - **Legacy adapters**: The `address` field remains optional for backward compatibility
     *
     * @remarks
     * The specific parameters for `prepare` might vary greatly between chain implementations.
     * Consider defining a generic type or a base type for `transactionRequest` if common patterns emerge,
     * or allow `...args: any[]` if extreme flexibility is needed by implementers.
     * For this abstract definition, we keep it parameter-less, assuming implementations will add specific
     * parameters as needed for their `prepare` method (e.g. `prepare(txDetails: MyChainTxDetails)`).
     *
     * @param params - The prepared chain request parameters for the specific blockchain.
     * @param ctx - Operation context with compile-time validated address requirements based on adapter capabilities.
     * @returns An object containing `estimate` and `execute` methods for the prepared transaction.
     *
     * @example
     * ```typescript
     * // User-controlled adapter (address forbidden)
     * const userAdapter: Adapter<{ addressContext: 'user-controlled', supportedChains: [] }>
     * await userAdapter.prepare(params, {
     *   chain: 'Ethereum'
     *   // address: '0x123...' // ❌ TypeScript error: address not allowed
     * })
     *
     * // Developer-controlled adapter (address required)
     * const devAdapter: Adapter<{ addressContext: 'developer-controlled', supportedChains: [] }>
     * await devAdapter.prepare(params, {
     *   chain: 'Ethereum',
     *   address: '0x123...' // ✅ Required for developer-controlled
     * })
     * ```
     */
    abstract prepare(params: PreparedChainRequestParams, ctx: OperationContext<TAdapterCapabilities>): Promise<PreparedChainRequest>;
    /**
     * Retrieves the public address of the connected wallet.
     *
     * This address is used as the default sender for transactions
     * and interactions initiated by this adapter.
     *
     * @param chain - The chain to use for address resolution.
     * @returns A promise that resolves to the blockchain address as a string.
     */
    abstract getAddress(chain: ChainDefinition): Promise<string>;
    /**
     * Switches the adapter to operate on the specified chain.
     *
     * This abstract method must be implemented by concrete adapters to handle their specific
     * chain switching logic. The behavior varies by adapter type:
     * - **Private key adapters**: Recreate clients with new RPC endpoints
     * - **Browser wallet adapters**: Request chain switch via EIP-1193 or equivalent
     * - **Multi-entity adapters**: Typically a no-op (operations are contextual)
     *
     * @param chain - The target chain to switch to.
     * @returns A promise that resolves when the chain switch is complete.
     * @throws When the chain switching fails or is not supported.
     *
     * @remarks
     * This method is called by `ensureChain()` after validation is complete.
     * Implementations should focus only on the actual switching logic, not validation.
     *
     * @example
     * ```typescript
     * // EVM adapter implementation
     * protected async switchToChain(chain: ChainDefinition): Promise<void> {
     *   if (chain.type !== 'evm') {
     *     throw new Error('Only EVM chains supported')
     *   }
     *   await this.recreateWalletClient(chain)
     * }
     *
     * // Multi-entity adapter implementation
     * protected async switchToChain(chain: ChainDefinition): Promise<void> {
     *   // No-op - operations are contextual
     *   return
     * }
     * ```
     */
    abstract switchToChain(chain: ChainDefinition): Promise<void>;
    /**
     * Ensures the adapter is operating on the specified chain, switching if necessary.
     *
     * This method provides a unified interface for establishing chain preconditions across different adapter types.
     * The behavior varies based on the adapter's capabilities:
     * - **Private key adapters**: Recreate clients with new RPC endpoints
     * - **Browser wallet adapters**: Request chain switch via EIP-1193 or equivalent
     * - **Multi-entity adapters**: Validate chain support (operations are contextual)
     *
     * @param chain - The target chain for operations.
     * @returns A promise that resolves when the adapter is operating on the specified chain.
     * @throws When the target chain is not supported or chain switching fails.
     *
     * @remarks
     * This method always calls `switchToChain()` to ensure consistency across all adapter types.
     * The underlying implementations handle idempotent switching efficiently (e.g., browser wallets
     * gracefully handle switching to the current chain, private key adapters recreate lightweight clients).
     *
     * @example
     * ```typescript
     * // Private key adapter - switches chains seamlessly
     * await privateKeyAdapter.ensureChain(Base)
     *
     * // Browser wallet - requests user to switch chains
     * await metamaskAdapter.ensureChain(Polygon)
     *
     * // Multi-entity adapter - validates chain is supported
     * await circleWalletsAdapter.ensureChain(Ethereum)
     * ```
     */
    ensureChain(targetChain: ChainDefinition): Promise<void>;
    /**
     * Validate that the target chain is supported by this adapter.
     *
     * @param targetChain - The chain to validate.
     * @throws KitError with INVALID_CHAIN code if the chain is not supported by this adapter.
     */
    validateChainSupport(targetChain: ChainDefinition): void;
    /**
     * Waits for a transaction to be mined and confirmed on the blockchain.
     *
     * This method should block until the transaction is confirmed on the blockchain.
     * The response includes comprehensive transaction details for the confirmed transaction.
     *
     * @param txHash - The hash of the transaction to wait for.
     * @param config - Optional configuration for waiting behavior including timeout and confirmations.
     * @param chain - The chain definition where the transaction was submitted.
     * @returns Promise resolving to comprehensive transaction details.
     */
    abstract waitForTransaction(txHash: string, config: WaitForTransactionConfig | undefined, chain: ChainDefinition): Promise<WaitForTransactionResponse>;
    /**
     * Calculate the total transaction fee including compute cost and buffer for the configured chain.
     *
     * This method computes the fee by multiplying the base compute units by the current
     * fee rate, then adds a configurable buffer to account for fee fluctuations and ensure
     * transaction success. The buffer is specified in basis points (1 basis point = 0.01%).
     *
     * @param baseComputeUnits - The base compute units for the transaction (gas for EVM, compute units for Solana, etc.).
     * @param bufferBasisPoints - The buffer to add as basis points (e.g., 500 = 5%). Defaults to implementation-specific value.
     * @param chain - The chain definition to calculate fees for.
     * @returns A promise that resolves to the total transaction fee as a bigint.
     */
    abstract calculateTransactionFee(baseComputeUnits: bigint, bufferBasisPoints: bigint | undefined, chain: ChainDefinition): Promise<EstimatedGas>;
}

/**
 * Type utility that infers the final adapter capabilities from partial overrides.
 * This provides clean type inference without complex conditional types.
 */
type InferAdapterCapabilities<T extends Partial<AdapterCapabilities>> = T & {
    addressContext: T extends {
        addressContext: infer A;
    } ? A : 'user-controlled';
    supportedChains: T extends {
        supportedChains: infer S;
    } ? S : ChainDefinition[];
};

/**
 * EIP-712 domain structure for typed data signing.
 *
 * Represents the domain separator fields as defined by the EIP-712 standard.
 * Used to prevent signature replay across different domains (contracts, chains, etc).
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-712}
 *
 * @example
 * ```typescript
 * const domain: EIP712Domain = {
 *   name: "USD Coin",
 *   version: "2",
 *   chainId: 1,
 *   verifyingContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 * }
 * ```
 */
interface EIP712Domain {
    /** Human-readable name of the signing domain (e.g., "USD Coin") */
    name: string;
    /** Current major version of the signing domain (e.g., "2") */
    version: string;
    /** EVM chain ID where the contract is deployed */
    chainId: number | bigint;
    /** Address of the contract that will verify the signature */
    verifyingContract: `0x${string}`;
    /** Optional salt for domain separation (as hex string) */
    salt?: `0x${string}`;
}
/**
 * Field definition for EIP-712 typed data.
 *
 * Each field describes a property in a struct, including its name and Solidity type.
 *
 * @example
 * ```typescript
 * const field: TypedDataField = { name: "owner", type: "address" }
 * ```
 */
interface TypedDataField {
    /** Name of the struct field */
    name: string;
    /** Solidity type of the struct field (e.g., "address", "uint256") */
    type: string;
}
/**
 * EIP-712 Typed Data structure.
 *
 * Represents a fully-typed EIP-712 message, including domain, types, primary type, and message payload.
 *
 * @typeParam Types - Mapping of struct names to their field definitions
 * @typeParam Message - The message payload type
 *
 * @example
 * ```typescript
 * const typedData: TypedData<typeof types, typeof message> = {
 *   domain,
 *   types,
 *   primaryType: "Permit",
 *   message
 * }
 * ```
 */
interface TypedData<Types extends Record<string, TypedDataField[]>, Message extends Record<string, unknown>> {
    /** EIP-712 domain separator */
    domain: EIP712Domain;
    /** Mapping of struct names to their field definitions */
    types: Types;
    /** The root struct type being signed (must be a key of `types`) */
    primaryType: keyof Types & string;
    /** The message payload to be signed */
    message: Message;
}
/**
 * Standard ECDSA signature format (r, s, v components).
 *
 * Used for all EIP-712 and permit/authorization signatures.
 *
 * @example
 * ```typescript
 * const sig: Signature = { v: 28, r: "0x...", s: "0x..." }
 * ```
 */
interface Signature {
    /** Recovery identifier (27 or 28) */
    v: number;
    /** ECDSA signature r value (32-byte hex string) */
    r: `0x${string}`;
    /** ECDSA signature s value (32-byte hex string) */
    s: `0x${string}`;
}
declare const PERMIT_STANDARDS: readonly ["EIP-2612"];
type KnownPermitStandard = (typeof PERMIT_STANDARDS)[number];
/**
 * Supported permit/authorization standards for cross-chain USDC.
 *
 * Extend this union as new standards are supported.
 */
type PermitStandardName = KnownPermitStandard
/**
 * Branded string type to keep this union from collapsing into plain `string`.
 * This lets TS/your IDE still offer autocomplete for the known literals
 * while allowing any other string without casting.
 */
 | (string & {
    readonly __brand?: 'PermitStandardName';
});
/**
 * Metadata required to construct an EIP-712 domain.
 *
 * Used as input to typed data builders for various standards.
 *
 * @example
 * ```typescript
 * const meta: DomainMeta = {
 *   name: "USD Coin",
 *   version: "2",
 *   chainId: 1,
 *   verifyingContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 * }
 * ```
 */
interface DomainMeta {
    /** Human-readable name of the signing domain */
    name: string;
    /** Current major version of the signing domain */
    version: string;
    /** EVM chain ID */
    chainId: number | bigint;
    /** Address of the verifying contract */
    verifyingContract: `0x${string}`;
}

/**
 * Utility module for handling ECDSA signatures and EIP-712 typed data.
 *
 * This file provides:
 * 1. parseSignature: Take a raw hexadecimal signature and split it into its three
 *    ECDSA components: r, s, and v (recovery identifier). Used when verifying
 *    Ethereum transactions and signed messages.
 *
 * 2. buildTypedData: Assemble a data structure compliant with EIP-712, which standardizes
 *    how structured data is formatted and hashed for secure off-chain signing.
 *
 * Key concepts:
 * - Cryptographic signatures (r, s, v) ensure that only the holder of a private key can
 *   authorize actions or sign messages. The 'v' component enables recovering the public key
 *   from the signature, confirming the signer’s identity.
 * - EIP-712 typed data enforces a clear schema for signing, preventing ambiguous or replayable
 *   signatures and simplifying integration with common wallet libraries.
 */

/**
 * parseSignature
 *
 * Parse a 65-byte ECDSA signature into its r, s, and v components, expressed in hex.
 *
 * Ethereum signatures are structured as:
 *   signature = r (32 bytes) || s (32 bytes) || v (1 byte)
 *
 * - r, s: Big-endian hex values (32 bytes each)
 * - v: Recovery identifier, used by secp256k1 to reconstruct the signer’s public key
 *
 * @param signatureHex - Signature as a hex string, optionally prefixed with "0x".
 * @returns { r, s, v }
 *   - r: Hex string of the R component.
 *   - s: Hex string of the S component.
 *   - v: Numeric recovery ID.
 *
 * @throws Error if:
 *   - Input is not valid hex.
 *   - Incorrect length (must be exactly 65 bytes / 130 hex chars).
 *   - v is outside the supported range (Legacy or EIP-155 formula).
 *
 * Notes on EIP-155 overload:
 * EIP-155 repurposes the v field so that:
 *   v = 35 + (2 * chainId) + recoveryId(0 or 1)
 * Any v value >= 35 indicates the chain-id is encoded, preventing cross-chain replay.
 * r and s values remain unchanged.
 *
 * Example:
 * ```typescript
 * const rawSig = '0x6c1b...f02b'
 * try {
 *   const { r, s, v } = parseSignature(rawSig)
 *   console.log('R:', r)
 *   console.log('S:', s)
 *   console.log('Recovery ID (v):', v)
 * } catch (err) {
 *   console.error('Signature parse error:', err.message)
 * }
 * ```
 */
declare function parseSignature(signatureHex: string): Signature;

/**
 * Core type definitions for EVM-compatible blockchain transaction execution
 * and gas estimation.
 *
 * This module provides TypeScript interfaces and types for handling EVM-compatible
 * blockchain transactions across different networks.
 *
 * @module types
 */

/**
 * Parameters for reading a contract function on an EVM-compatible chain.
 *
 * @interface ReadContractParams
 * @example
 * ```typescript
 * const params: ReadContractParams = {
 *   address: '0x1234567890abcdef1234567890abcdef12345678',
 *   abi: myAbi,
 *   functionName: 'balanceOf',
 *   args: ['0xabcdef...']
 * }
 * ```
 */
interface ReadContractParams {
    /**
     * The address of the contract to read from.
     * @example '0x1234567890abcdef1234567890abcdef12345678'
     */
    address: `0x${string}`;
    /**
     * The ABI of the contract.
     */
    abi: Abi;
    /**
     * The name of the function to call.
     * @example 'balanceOf'
     */
    functionName: string;
    /**
     * The arguments to pass to the function.
     * @example ['0xabcdef...']
     */
    args: unknown[];
}

/**
 * Abstract base class for EVM-compatible blockchain adapters.
 *
 * This class extends the generic `Adapter` to provide EVM-specific functionality
 * for interacting with Ethereum Virtual Machine compatible blockchains. It automatically
 * registers EVM-specific action handlers during construction and sets the chain type to 'evm'.
 *
 * The signTypedData method uses a generic TypedData interface from the signTypedData module,
 * making it compatible with any EIP-712 standard (EIP-2612, EIP-7597, ERC-3009, etc.) while
 * maintaining type safety throughout the signing process.
 *
 * Includes caching and synchronization capabilities for provider-based adapters that need
 * to respond to account and chain changes from external wallets (e.g., MetaMask).
 */
declare abstract class EvmAdapter<TAdapterCapabilities extends AdapterCapabilities = AdapterCapabilities> extends Adapter<TAdapterCapabilities> {
    /**
     * The type of chain this adapter is for.
     */
    chainType: ChainType;
    /**
     * Cached gas price for the current network.
     */
    cachedGasPrice?: bigint;
    /**
     * The constructor for the EVM adapter.
     *
     * @remarks
     * This constructor registers the action handlers for the EVM adapter.
     */
    constructor();
    /**
     * Signs EIP-712 typed data using a generic, type-safe interface.
     *
     * This method accepts strongly-typed EIP-712 data that works with any standard
     * (EIP-2612, EIP-7597, ERC-3009, etc.) and delegates to the framework-specific
     * implementation (viem, ethers, web3.js) for actual signing.
     *
     * @typeParam Types - The EIP-712 types definition for the standard being signed
     * @typeParam Message - The message structure for the standard being signed
     * @param typedData - The EIP-712 typed data to sign with full type safety
     * @param ctx - Required operation context specifying the chain and address for this operation
     * @returns Promise resolving to the signature as a hex string
     * @throws Error when the wallet client is not available or signing fails
     * @throws Error when OperationContext resolution fails
     *
     * @example
     * ```typescript
     * // Works with any EIP-712 standard
     * import { buildEIP2612TypedData } from '@core/adapter-evm'
     *
     * const typedData = await buildEIP2612TypedData(meta, adapter, options)
     * const signature = await adapter.signTypedData(typedData, {
     *   chain: 'Base' // Chain specified in context
     * })
     * ```
     */
    abstract signTypedData<Types extends Record<string, TypedDataField[]>, Message extends Record<string, unknown>>(typedData: TypedData<Types, Message>, ctx: OperationContext<TAdapterCapabilities>): Promise<`0x${string}`>;
    /**
     * Fetches the current EIP-2612 nonce for a token owner.
     *
     * This method queries the token contract's `nonces(address)` function to get
     * the current nonce value for permit signatures. It uses the adapter's `prepare`
     * method to handle the contract interaction, making it framework-agnostic.
     *
     * @param tokenAddress - The ERC-20 token contract address
     * @param ownerAddress - The address of the token owner
     * @returns Promise resolving to the current nonce value
     * @throws Error when the contract call fails or the token doesn't support EIP-2612
     *
     * @example
     * ```typescript
     * // Get current nonce for permit signing
     * const nonce = await adapter.fetchEIP2612Nonce(
     *   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
     *   '0x123...' // owner address
     * )
     * ```
     */
    fetchEIP2612Nonce(tokenAddress: `0x${string}`, ownerAddress: `0x${string}`, ctx: OperationContext<TAdapterCapabilities>): Promise<bigint>;
    /**
     * Read a contract function.
     *
     * @typeParam TReturnType - The expected return type of the contract function.
     * @param params - The parameters for the contract function read.
     * @param chain - The chain definition where the contract is deployed.
     * @returns A promise that resolves to the result of the contract function read.
     */
    abstract readContract<TReturnType = unknown>(params: ReadContractParams, chain: EVMChainDefinition): Promise<TReturnType>;
    /**
     * Fetches the current gas price from the network, bypassing cache.
     *
     * This abstract method must be implemented by concrete adapters to fetch
     * the current gas price using their specific client libraries. This method
     * should not implement caching - caching is handled by the base class.
     *
     * @param chain - The chain definition to fetch gas price for.
     * @returns Promise resolving to the current gas price in wei
     * @throws Error when gas price retrieval fails
     */
    abstract fetchGasPrice(chain: EVMChainDefinition): Promise<bigint>;
    /**
     * Reads the native token balance (ETH, MATIC, etc.) for a given address.
     *
     * This abstract method must be implemented by concrete adapters to fetch
     * the native token balance using their specific client libraries.
     *
     * @param address - The wallet address to check the balance for.
     * @param chain - The chain definition to fetch the balance from.
     * @returns Promise resolving to the balance in wei as a bigint.
     * @throws Error when balance retrieval fails.
     */
    abstract readNativeBalance(address: string, chain: EVMChainDefinition): Promise<bigint>;
    /**
     * Calculate the total transaction fee including compute cost and buffer for the configured chain.
     *
     * This method computes the fee by multiplying the estimated compute units by the
     * current gas price, then adds a configurable buffer to account for fee fluctuations
     * and ensure transaction success. The buffer is specified in basis points (1 basis
     * point = 0.01%).
     *
     * @param baseComputeUnits - The base compute units for the transaction.
     * @param bufferBasisPoints - The buffer to add as basis points (e.g., 500 = 5%). Defaults to DEFAULT_BUFFER_BASIS_POINTS (5%).
     * @param chain - The chain definition to fetch gas price for.
     * @returns A promise that resolves to the estimated gas cost including buffer.
     * @throws Error when gas price retrieval fails.
     *
     * @example
     * ```typescript
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2'
     * import { Ethereum } from '@core/chains'
     *
     * const adapter = new ViemAdapter({ publicClient, walletClient })
     *
     * // Calculate transaction fee with default 5% buffer
     * const fee = await adapter.calculateTransactionFee(1000000000n, undefined, Ethereum)
     * console.log('Transaction fee:', fee.toString(), 'wei')
     *
     * // Calculate transaction fee with custom 10% buffer
     * const feeWithCustomBuffer = await adapter.calculateTransactionFee(1000000000n, 1000n, Ethereum)
     * console.log('Transaction fee with custom buffer:', feeWithCustomBuffer.toString(), 'wei')
     * ```
     */
    calculateTransactionFee(baseComputeUnits: bigint, bufferBasisPoints: bigint | undefined, chain: EVMChainDefinition): Promise<EstimatedGas>;
}

/**
 * EIP-2612 permit type definition.
 * Defines the structure for permit signatures according to EIP-2612 specification.
 *
 * @see {@link https://eips.ethereum.org/EIPS/eip-2612 | EIP-2612 Specification}
 */
declare const EIP2612_TYPES: {
    readonly Permit: TypedDataField[];
};
/**
 * EIP-2612 permit message structure.
 * This is the exact data that gets signed according to EIP-2612.
 */
interface EIP2612Message extends Record<string, unknown> {
    /** Token owner address */
    owner: `0x${string}`;
    /** Address permitted to spend tokens */
    spender: `0x${string}`;
    /** Amount of tokens permitted */
    value: bigint;
    /** Current nonce for the owner */
    nonce: bigint;
    /** Deadline timestamp (Unix timestamp in seconds) */
    deadline: bigint;
}
/**
 * Input options for building an EIP-2612 permit.
 * Nonce and deadline can be omitted and will be fetched/computed automatically.
 *
 * **Address Formatting**: Addresses are automatically formatted with proper EIP-55
 * checksumming, so you can provide addresses in any case format.
 */
interface EIP2612Options extends Record<string, unknown> {
    /** Token owner address (automatically formatted with EIP-55 checksumming) */
    owner: `0x${string}`;
    /** Address that will be permitted to spend tokens (automatically formatted with EIP-55 checksumming) */
    spender: `0x${string}`;
    /** Amount of tokens to permit */
    value: bigint;
    /** Optional nonce - will be fetched from token contract if not provided */
    nonce?: bigint;
    /** Optional deadline - will default to 1 hour from now if not provided */
    deadline?: bigint;
}
/**
 * Function type for fetching nonces from EIP-2612 compatible tokens.
 *
 * @param owner - Token owner address
 * @param token - Token contract address
 * @returns Promise resolving to current nonce
 */
type EIP2612NonceFetcher = (token: `0x${string}`, owner: `0x${string}`) => Promise<bigint>;

interface EIP2612Adapter {
    fetchEIP2612Nonce(tokenAddress: `0x${string}`, ownerAddress: `0x${string}`, ctx: OperationContext): Promise<bigint>;
}
/**
 * Build EIP-2612 typed data for permit signing.
 *
 * This function creates the complete EIP-712 typed data structure required
 * for EIP-2612 permit signatures, including automatic nonce fetching using
 * the adapter's built-in nonce fetching capability.
 *
 * **Address Formatting**: All addresses are automatically formatted with proper
 * EIP-55 checksumming using the `convertAddress` utility, ensuring compatibility
 * with strict validation libraries like viem.
 *
 * **Nonce Handling**: The nonce can be provided explicitly or will be fetched
 * automatically using the adapter's `fetchEIP2612Nonce` method, which queries
 * the token contract's `nonces(owner)` function.
 *
 * **Deadline Calculation**: If no deadline is provided, it defaults to 24 hours
 * from the current time (computed using `computeDefaultDeadline`).
 *
 * @param meta - Domain metadata for the token contract
 * @param adapter - Adapter instance with nonce-fetching capability
 * @param opts - EIP-2612 permit options including owner, spender, value
 * @returns Complete EIP-712 typed data ready for signing
 *
 * @example
 * ```typescript
 * import { buildEIP2612TypedData } from '@core/adapter-evm'
 *
 * const typedData = await buildEIP2612TypedData(
 *   {
 *     name: 'USD Coin',
 *     version: '2',
 *     chainId: 1,
 *     verifyingContract: '0xa0b86a33e6441e4d178bb0c14ce0e9ce9c83bdd8'
 *   },
 *   adapter,
 *   {
 *     owner: '0x742d35cc6639c0532fbe9002b3a2265ca4c878f8e',
 *     spender: '0x1234567890123456789012345678901234567890',
 *     value: 1000000n
 *   }
 * )
 *
 * const signature = await adapter.signTypedData(typedData)
 * ```
 */
declare function buildEIP2612TypedData(meta: DomainMeta, adapter: EIP2612Adapter, opts: EIP2612Options, ctx: OperationContext): Promise<TypedData<typeof EIP2612_TYPES, EIP2612Message>>;

/**
 * Compute default deadline for permit signatures.
 *
 * Returns a timestamp 1 hour (3600 seconds) from the current time,
 * converted to Unix timestamp format as a bigint. This is commonly
 * used as the default expiration time for EIP-2612 permit signatures.
 *
 * @returns Unix timestamp (in seconds) 1 hour from now as a bigint
 *
 * @example
 * ```typescript
 * import { computeDefaultDeadline } from '@core/adapter-evm'
 *
 * const deadline = computeDefaultDeadline()
 * console.log(`Permit expires at: ${deadline}`)
 * // Output: Permit expires at: 1640998800
 * ```
 */
declare function computeDefaultDeadline(): bigint;

/**
 * @packageDocumentation
 * @module ViemAdapter
 *
 * This module provides a concrete implementation of the {@link EvmAdapter} abstract class,
 * using the `viem` library for interacting with Ethereum-compatible blockchains.
 * The implementation provides full functionality for gas estimation, contract interaction,
 * and transaction execution.
 */
/**
 * Configuration options for ViemAdapter using pre-configured viem clients.
 *
 * This interface provides a clean, single-pattern API that supports both synchronous
 * and asynchronous wallet client initialization through the getWalletClient getter function.
 * The getter pattern enables lazy initialization, better lifecycle control, and improved
 * performance by deferring wallet client creation until actually needed.
 *
 * @interface ViemAdapterOptions
 * @category Types
 *
 * @example
 * ```typescript
 * // Synchronous getter (simple case)
 * import { Ethereum } from '@core/chains';
 *
 * const account = privateKeyToAccount('0x...')
 * const adapter = new ViemAdapter({
 *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
 *   getWalletClient: ({ chain }) => createWalletClient({
 *     account,
 *     chain,
 *     transport: http()
 *   })
 * }, {
 *   addressContext: 'user-controlled',
 *   supportedChains: [Ethereum]
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Asynchronous getter (complex initialization)
 * import { Ethereum } from '@core/chains';
 *
 * const adapter = new ViemAdapter({
 *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
 *   getWalletClient: async ({ chain }) => {
 *     const wallet = await connectWallet()
 *     return createWalletClient({
 *       account: wallet.account,
 *       chain,
 *       transport: custom(wallet.provider)
 *     })
 *   }
 * }, {
 *   addressContext: 'user-controlled',
 *   supportedChains: [Ethereum]
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Conditional wallet setup with environment detection
 * import { Ethereum } from '@core/chains';
 *
 * const serverAccount = typeof window === 'undefined'
 *   ? privateKeyToAccount(process.env.PRIVATE_KEY!)
 *   : undefined
 * const adapter = new ViemAdapter({
 *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
 *   getWalletClient: ({ chain }) => {
 *     if (typeof window !== 'undefined') {
 *       return createWalletClient({ chain, transport: custom(window.ethereum) })
 *     }
 *     return createWalletClient({
 *       account: serverAccount!,
 *       chain,
 *       transport: http()
 *     })
 *   }
 * }, {
 *   addressContext: 'user-controlled',
 *   supportedChains: [Ethereum]
 * })
 * ```
 */
interface ViemAdapterOptions {
    /**
     * Pre-configured Viem PublicClient factory function for read operations.
     * @remarks
     * Used for blockchain state queries, gas estimation, and other non-mutating operations.
     * This function is called when a PublicClient is needed for a specific chain.
     */
    getPublicClient: (params: {
        chain: Chain;
    }) => PublicClient;
    /**
     * Chain-aware getter function for wallet client initialization.
     * @remarks
     * Supports both synchronous and asynchronous wallet client creation patterns.
     * The function is called with chain parameters to enable multi-chain wallet support.
     * Results are cached per chain to prevent multiple initializations.
     *
     * **Enhanced for Developer-Controlled Scenarios:**
     * For developer-controlled adapters, the resolved address from OperationContext
     * should ideally be passed to this function to enable address-specific wallet
     * client creation (e.g., for custody solutions like Fireblocks where different
     * addresses correspond to different vaults).
     *
     * **Benefits:**
     * - **Chain-aware** - supports multi-chain operations seamlessly
     * - **Address-aware** - could support multi-address scenarios (future enhancement)
     * - **Lazy initialization** - wallet client created only when needed
     * - **Better performance** - avoid unnecessary initialization overhead
     * - **Better security** - delayed private key access in server environments
     * - **Flexible setup** - supports complex async initialization logic
     * - **Per-chain caching** - automatic result caching per chain prevents duplicate creation
     *
     * **Synchronous Usage:** Return the wallet client directly for simple cases.
     * **Asynchronous Usage:** Return a Promise for complex initialization (async wallet connections, etc.)
     *
     * @param params - Required parameters including the target chain for the wallet client
     * @returns WalletClient instance or Promise resolving to WalletClient instance
     */
    getWalletClient: (params: {
        chain: Chain;
    }) => Promise<WalletClient> | WalletClient;
}
/**
 * A `Adapter` implementation using `viem` for Ethereum-compatible blockchain interactions.
 *
 * This class encapsulates `viem` specific logic, using `PublicClient` and `WalletClient`
 * for reading data and sending transactions. It provides comprehensive gas estimation,
 * contract call simulation, and transaction execution capabilities with full OperationContext support.
 *
 * @remarks
 * The constructor requires both configuration options and explicit capabilities to ensure
 * consistent behavior across all EVM adapters. The capabilities define address control patterns
 * and supported chains. Both synchronous and asynchronous wallet client getters are supported.
 *
 * @example
 * ```typescript
 * import { createPublicClient, createWalletClient, http } from 'viem';
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { mainnet } from 'viem/chains';
 * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
 * import { Ethereum, Base, Polygon } from '@core/chains';
 *
 * // Zero-config factory approach (recommended)
 * const adapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...'
 *   // Gets smart defaults: user-controlled + all EVM chains
 * })
 *
 * // OperationContext provides chain - no factory complexity!
 * const prepared = await adapter.prepare({
 *   address: '0x1234567890123456789012345678901234567890',
 *   abi: contractAbi,
 *   functionName: 'approve',
 *   args: ['0xspender', BigInt(1000)]
 * }, {
 *   chain: 'Base' // Chain specified here
 * });
 * ```
 */
declare class ViemAdapter<TAdapterCapabilities extends AdapterCapabilities = AdapterCapabilities> extends EvmAdapter<TAdapterCapabilities> {
    /**
     * Configuration options for this ViemAdapter instance.
     */
    options: ViemAdapterOptions;
    /**
     * Cached wallet clients per chain ID to prevent multiple initializations.
     */
    private readonly cachedWalletClients;
    /**
     * Promises for ongoing wallet client initialization per chain to prevent concurrent calls.
     */
    private readonly walletClientInitPromises;
    /**
     * Cached public clients.
     */
    private readonly cachedPublicClients;
    /**
     * Constructs a new `ViemAdapter` with getter-based wallet client configuration.
     *
     * This constructor creates an adapter using the OperationContext pattern, requiring
     * explicit capabilities configuration for type safety. Both synchronous and asynchronous
     * wallet client getters are supported for maximum flexibility in initialization patterns.
     *
     * @param options - Configuration options with getPublicClient and getWalletClient functions.
     * @param capabilities - Adapter capabilities defining address control and supported chains. Required for OperationContext pattern.
     * @throws Error when configuration validation fails.
     * @throws Error when capabilities.addressContext is not explicitly defined.
     * @throws Error when capabilities.addressContext has an invalid value.
     * @throws Error when capabilities.supportedChains contains non-EVM chains.
     *
     * @example
     * ```typescript
     * import { createPublicClient, createWalletClient, http } from 'viem';
     * import { privateKeyToAccount } from 'viem/accounts';
     * import { mainnet } from 'viem/chains';
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum, Base } from '@core/chains';
     *
     * // Server-side adapter with private key account
     * const account = privateKeyToAccount('0x...');
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({
     *     chain,
     *     transport: http()
     *   }),
     *   getWalletClient: ({ chain }) => createWalletClient({
     *     account,
     *     chain,
     *     transport: http()
     *   })
     * }, {
     *   addressContext: 'developer-controlled',
     *   supportedChains: [Ethereum, Base]
     * });
     * ```
     *
     * @example
     * ```typescript
     * import { createPublicClient, createWalletClient, custom } from 'viem';
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum } from '@core/chains';
     *
     * // Browser adapter with window.ethereum provider
     * const browserAdapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({
     *     chain,
     *     transport: http()
     *   }),
     *   getWalletClient: ({ chain }) => createWalletClient({
     *     chain,
     *     transport: custom(window.ethereum)
     *   })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     * ```
     *
     * @example
     * ```typescript
     * import { createPublicClient, createWalletClient, http } from 'viem';
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum, Base, Polygon } from '@core/chains';
     *
     * // Async wallet client initialization for complex setups
     * const asyncAdapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({
     *     chain,
     *     transport: http()
     *   }),
     *   getWalletClient: async ({ chain }) => {
     *     // Complex async initialization (wallet connection, etc.)
     *     const wallet = await connectWallet();
     *     return createWalletClient({
     *       account: wallet.account,
     *       chain,
     *       transport: custom(wallet.provider)
     *     });
     *   }
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum, Base, Polygon]
     * });
     * ```
     *
     * @example
     * ```typescript
     * import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
     * import { Ethereum } from '@core/chains';
     *
     * // Using the adapter with OperationContext pattern
     * const adapter = new ViemAdapter(options, capabilities);
     *
     * // Chain specified in OperationContext, not in adapter configuration
     * const prepared = await adapter.prepare({
     *   address: '0x1234567890123456789012345678901234567890',
     *   abi: contractAbi,
     *   functionName: 'transfer',
     *   args: ['0xrecipient', BigInt(1000)]
     * }, {
     *   chain: 'Ethereum' // Chain comes from context, not adapter
     * });
     *
     * const result = await prepared.execute();
     * console.log('Transaction hash:', result);
     * ```
     */
    constructor(options: ViemAdapterOptions, capabilities: TAdapterCapabilities);
    /**
     * Resets all cached state in the adapter, including Viem-specific caches.
     *
     * This method extends the base class resetState() to also clear Viem-specific
     * caches like public clients and cached wallet clients. It ensures a clean state when
     * the adapter needs to be reinitialized (e.g., after chain or account changes).
     *
     * @override
     * @remarks
     * For wallet clients initialized via getter functions, this will clear the cache
     * and the getter function will be called again on the next access.
     *
     * @example
     * ```typescript
     * // Called automatically during chain switches or account changes
     * adapter.resetState()
     *
     * // Or called manually to clear all caches
     * adapter.resetState()
     * ```
     */
    resetState(): void;
    /**
     * Ensures that the adapter is connected to the correct chain.
     * Switches the adapter to operate on the specified chain.
     *
     * This implementation handles chain switching for ViemAdapter. On the server side (Node.js),
     * it recreates the wallet client with the target chain. In the browser, it uses the
     * wallet's switchChain method. All validation is handled by the base class ensureChain method.
     *
     * @param chain - The target chain to switch to (already validated by base class).
     * @returns A promise that resolves when the chain switch is complete.
     * @throws When chain switching fails.
     */
    switchToChain(chain: ChainDefinition): Promise<void>;
    /**
     * Parses and validates the ABI and function name.
     *
     * @internal
     * @param abiInput - Raw ABI input (string array or parsed ABI)
     * @param functionName - Name of the function to validate
     * @returns Parsed and validated ABI
     * @throws Error when ABI parsing fails or function is not found
     */
    private parseAndValidateAbi;
    /**
     * Prepares a state-changing function call for gas estimation and execution.
     *
     * @internal
     * @param _walletClient - The wallet client for transaction signing (used only in execute method closure)
     * @param publicClient - The public client for simulation and estimation
     * @param address - Contract address
     * @param abi - Validated contract ABI
     * @param functionName - Function name to call
     * @param args - Function arguments
     * @param targetChain - The chain to execute on
     * @param resolvedAddress - The resolved address from OperationContext (may differ from wallet account)
     * @returns Prepared chain request for state-changing function
     */
    private prepareStateChangingFunction;
    /**
     * Prepares a function call for gas estimation and execution.
     *
     * @param params - Configuration options for the function call.
     * @param ctx - Required operation context specifying the chain and address for this operation.
     * @returns An object with `estimate` and `execute` methods.
     * @throws Error when WalletClient is not configured or no wallet is connected.
     * @throws Error when PublicClient is not configured.
     * @throws Error when required parameters (address, abi, functionName, args) are missing or invalid.
     * @throws Error when function call simulation fails.
     * @throws Error when OperationContext resolution fails.
     * @example
     * ```typescript
     * import { Ethereum, Base } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     *
     * // OperationContext is required for all operations
     * const prepared = await adapter.prepare({
     *   address: '0x1234567890123456789012345678901234567890',
     *   abi: contractAbi,
     *   functionName: 'approve',
     *   args: ['0xspender', BigInt(1000)]
     * }, {
     *   chain: 'Base' // Chain specified in context
     * });
     *
     * const estimatedGas = await prepared.estimate();
     * console.log('Estimated Gas', estimatedGas);
     * ```
     */
    prepare(params: EvmPreparedChainRequestParams, ctx: OperationContext<TAdapterCapabilities>): Promise<EvmPreparedChainRequest>;
    /**
     * Handles read-only function calls with noop estimation.
     *
     * @param publicClient - The Viem public client configured for the target chain.
     * @param address - The contract address to call.
     * @param abi - The validated contract ABI.
     * @param functionName - The name of the function to call.
     * @param args - The function arguments.
     * @returns A prepared chain request for read-only function execution.
     */
    private handleReadOnlyFunction;
    /**
     * Retrieves the connected wallet address.
     *
     * @param chain - The chain to use for address resolution.
     * @returns A promise that resolves to the connected wallet address.
     * @throws When the wallet has no addresses available.
     * @throws When no chain is provided (should not happen with OperationContext pattern).
     * @example
     * ```typescript
     * import { Ethereum } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: async ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     *
     * // Chain is provided by OperationContext resolution
     * const address = await adapter.getAddress(Ethereum);
     * console.log('Adapter Address', address);
     * ```
     */
    getAddress(chain: EVMChainDefinition): Promise<string>;
    /**
     * Gets the Viem Chain object for the given chain definition.
     *
     * @param chain - The chain definition to get the Viem Chain object for.
     * @returns The Viem Chain object for the given chain definition.
     * @example
     * ```typescript
     * import { Ethereum, EthereumSepolia } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: async ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     * const viemChain = await adapter.getViemChain(EthereumSepolia);
     * console.log('Viem Chain', viemChain);
     * ```
     */
    getViemChain(chain: EVMChainDefinition): Promise<Chain>;
    /**
     * Gets the cached PublicClient or initializes it from options if not already cached.
     *
     * @param chain - The chain definition for which to get the PublicClient (required).
     * @returns The Viem PublicClient instance.
     * @remarks
     * This method ensures we only store one instance of the PublicClient per chain.
     * The chain parameter is required to prevent accidentally using the wrong chain,
     * which could lead to serious issues and real costs for users.
     * @example
     * ```typescript
     * const adapter = new ViemAdapter(options, capabilities);
     * const publicClient = await adapter.getPublicClient(Ethereum);
     * const blockNumber = await publicClient.getBlockNumber();
     * ```
     */
    getPublicClient(chainDef: EVMChainDefinition): Promise<PublicClient>;
    /**
     * Wallet client initialization with proper caching and error handling.
     *
     * @param chain - The chain definition for the wallet client
     * @returns Promise resolving to initialized WalletClient
     * @throws Error when wallet client is not available or getter function fails.
     * @remarks
     * This method ensures we only initialize the WalletClient once per chain, even if it's provided as a getter function.
     * The getter function can return either a WalletClient directly (synchronous) or a Promise<WalletClient> (asynchronous).
     * Both patterns are normalized to Promise<WalletClient> internally for consistent handling.
     *
     * Wallet clients are cached per chain ID to enable seamless multi-chain operations within a single adapter instance.
     *
     * @example
     * ```typescript
     * // Get wallet client for specific chain (explicit and clear)
     * const walletClient = await adapter.initializeWalletClient(Base);
     *
     * // Cached calls return the same instance
     * const sameClient = await adapter.initializeWalletClient(Base); // Returns cached instance
     * ```
     */
    initializeWalletClient(chain: EVMChainDefinition): Promise<WalletClient>;
    /**
     * Waits for a transaction to be mined and confirmed on the blockchain.
     *
     * This method polls the blockchain until the specified transaction is confirmed
     * with the required number of confirmations. It provides comprehensive transaction
     * details once the transaction is finalized.
     *
     * @param txHash - The hash of the transaction to wait for. Must be a valid 32-byte hex string prefixed with '0x'.
     * @param config - Optional configuration for waiting behavior including timeout and confirmations.
     * @returns Promise resolving to comprehensive transaction details including status, gas usage, and block information.
     * @throws Error when txHash is invalid (not a string, empty, or malformed hex).
     * @throws Error when config parameters are invalid (negative values).
     * @throws Error when transaction is not found or network issues occur.
     * @throws Error when timeout is exceeded before transaction confirmation.
     * @example
     * ```typescript
     * import { Ethereum } from '@core/chains';
     *
     * const adapter = new ViemAdapter({
     *   getPublicClient: ({ chain }) => createPublicClient({ chain, transport: http() }),
     *   getWalletClient: ({ chain }) => createWalletClient({ account, chain, transport: http() })
     * }, {
     *   addressContext: 'user-controlled',
     *   supportedChains: [Ethereum]
     * });
     *
     * // Wait with default settings
     * const result = await adapter.waitForTransaction('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
     * console.log('Transaction status:', result.status);
     * console.log('Block number:', result.blockNumber);
     *
     * // Wait with custom configuration
     * const customResult = await adapter.waitForTransaction(
     *   '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
     *   { confirmations: 3, timeout: 60000 }
     * );
     * console.log('Gas used:', customResult.gasUsed.toString());
     * console.log('Block hash:', customResult.blockHash);
     * ```
     */
    waitForTransaction(txHash: `0x${string}`, config: WaitForTransactionConfig | undefined, chain: EVMChainDefinition): Promise<WaitForTransactionResponse>;
    /**
     * Fetches the current gas price from the network.
     *
     * @param chain - The chain definition to fetch gas price for.
     * @returns Promise resolving to the current gas price in wei
     * @throws Error when gas price retrieval fails
     */
    fetchGasPrice(chain: EVMChainDefinition): Promise<bigint>;
    /**
     * Reads the native token balance (ETH, MATIC, etc.) for a given address.
     *
     * @param address - The wallet address to check the balance for.
     * @param chain - The chain definition to fetch the balance from.
     * @returns Promise resolving to the balance in wei as a bigint.
     * @throws Error when balance retrieval fails.
     *
     * @example
     * ```typescript
     * const balance = await adapter.readNativeBalance(
     *   '0x1234...',
     *   Ethereum
     * )
     * console.log('Balance:', balance.toString(), 'wei')
     * ```
     */
    readNativeBalance(address: string, chain: EVMChainDefinition): Promise<bigint>;
    /**
     * Signs EIP-712 typed data using a generic, type-safe interface.
     *
     * This method accepts strongly-typed EIP-712 data from any standard and converts
     * it to viem's expected format for signing. This provides end-to-end type safety
     * from standard definitions through to framework implementation.
     *
     * @typeParam Types - The EIP-712 types definition for the standard being signed
     * @typeParam Message - The message structure for the standard being signed
     * @param typedData - The EIP-712 typed data to sign with full type safety
     * @param ctx - Operation context specifying the chain for signing (required)
     * @returns Promise resolving to the signature as a hex string
     * @throws Error when the wallet client is not available or signing fails
     * @throws Error when OperationContext resolution fails
     *
     * @example
     * ```typescript
     * import { Ethereum } from '@core/chains';
     *
     * // OperationContext is required - chain must be specified
     * const signature = await adapter.signTypedData(typedData, {
     *   chain: 'Base' // Chain specified in context
     * });
     * ```
     */
    signTypedData<Types extends Record<string, TypedDataField[]>, Message extends Record<string, unknown>>(typedData: TypedData<Types, Message>, ctx: OperationContext<TAdapterCapabilities>): Promise<`0x${string}`>;
    /**
     * Reads a contract function using Viem v2.
     *
     * @typeParam TReturnType - The expected return type of the contract function.
     * @param params - The parameters for the contract function read.
     * @returns A promise that resolves to the result of the contract function read.
     *
     * @example
     * ```typescript
     * const result = await adapter.readContract<bigint>({
     *   address: '0x1234...',
     *   abi: erc20Abi,
     *   functionName: 'balanceOf',
     *   args: ['0x1234...'],
     * })
     * console.log(result) // 1000000n (for 1 USDC with 6 decimals) - properly typed as bigint
     * ```
     *
     * @param params - The parameters for the contract function read.
     * @returns A promise that resolves to the result of the contract function read.
     */
    readContract<TReturnType = unknown>(params: ReadContractParams, chain: EVMChainDefinition): Promise<TReturnType>;
}

/**
 * Parameters for creating a ViemAdapter from a private key.
 *
 * This interface defines the configuration options available when creating
 * a ViemAdapter instance using the `createViemAdapterFromPrivateKey` factory function.
 *
 * @typeParam TCapabilities - The adapter capabilities type for compile-time address validation
 */
interface CreateViemAdapterFromPrivateKeyParams<TCapabilities extends Partial<AdapterCapabilities> = AdapterCapabilities> {
    /**
     * The private key to use for account derivation.
     * Must be a valid 32-byte hex string, with or without '0x' prefix.
     * If the prefix is omitted, it will be added automatically during validation.
     */
    privateKey: string;
    /**
     * Optional function to create public clients for different chains.
     * If not provided, a default implementation using HTTP transport will be used.
     */
    getPublicClient?: (params: {
        chain: Chain;
    }) => PublicClient;
    /**
     * Optional function to create wallet clients for different chains.
     * If not provided, a default wallet client will be created using the derived account
     * and HTTP transport with default RPC endpoints.
     *
     * Use this to specify custom RPC URLs or transport configurations for wallet operations
     * like transaction signing and broadcasting.
     *
     * The callback receives an object with:
     * - `chain`: The target chain for the wallet client.
     * - `account`: The account derived from the private key (must be used for signing).
     */
    getWalletClient?: (params: {
        chain: Chain;
        account: PrivateKeyAccount;
    }) => Promise<WalletClient> | WalletClient;
    /**
     * Optional adapter capabilities configuration.
     * Defines address control model and supported chains.
     * If not provided, defaults to user-controlled with all EVM chains supported.
     */
    capabilities?: TCapabilities;
}
/**
 * @deprecated Use {@link CreateViemAdapterFromPrivateKeyParams} instead
 *
 * Parameters for creating a ViemAdapter from a private key.
 *
 * This interface defines the configuration options available when creating
 * a ViemAdapter instance using the `createViemAdapterFromPrivateKey` factory function.
 *
 * @typeParam TCapabilities - The adapter capabilities type for compile-time address validation
 */
type CreateAdapterFromPrivateKeyParams<TCapabilities extends Partial<AdapterCapabilities> = AdapterCapabilities> = CreateViemAdapterFromPrivateKeyParams<TCapabilities>;
/**
 * Creates a ViemAdapter instance from a private key with automatic type inference.
 *
 * This function creates a ViemAdapter for server-side or programmatic use
 * by deriving an account from the provided private key. It automatically
 * infers the adapter capabilities from the provided configuration, ensuring
 * type safety without requiring explicit generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns A configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or account derivation fails
 *
 * @example
 * ```typescript
 * // Default adapter (user-controlled)
 * const defaultAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...'
 * })
 *
 * const defaultAdapter1 = createViemAdapterFromPrivateKey({
 *   privateKey: '1234...abcd', // Without prefix
 * })
 *
 * // Developer-controlled adapter (requires addresses)
 * const devAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...',
 *   capabilities: { addressContext: 'developer-controlled' }
 * })
 *
 * const devAdapter1 = createViemAdapterFromPrivateKey({
 *   privateKey: '1234...abcd', // Without prefix
 *   capabilities: { addressContext: 'developer-controlled' }
 * })
 *
 * // User-controlled adapter (addresses forbidden)
 * const userAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...',
 *   capabilities: { addressContext: 'user-controlled' }
 * })
 *
 * const userAdapter1 = createViemAdapterFromPrivateKey({
 *   privateKey: '1234...abcd', // Without prefix
 *   capabilities: { addressContext: 'user-controlled' }
 * })
 *
 * // Custom RPC endpoints for both public and wallet clients
 * const customRpcAdapter = createViemAdapterFromPrivateKey({
 *   privateKey: '0x...',
 *   getPublicClient: ({ chain }) => createPublicClient({
 *     chain,
 *     transport: http('https://custom-rpc.example.com')
 *   }),
 *   getWalletClient: ({ chain, account }) => createWalletClient({
 *     chain,
 *     account,
 *     transport: http('https://custom-rpc.example.com')
 *   })
 * })
 * ```
 */
declare function createViemAdapterFromPrivateKey<const TCapabilities extends Partial<AdapterCapabilities> = object>(params: CreateViemAdapterFromPrivateKeyParams<TCapabilities>): ViemAdapter<InferAdapterCapabilities<TCapabilities>>;
/**
 * @deprecated Use {@link createViemAdapterFromPrivateKey} instead
 *
 * Creates a ViemAdapter instance from a private key with automatic type inference.
 *
 * This function creates a ViemAdapter for server-side or programmatic use
 * by deriving an account from the provided private key. It automatically
 * infers the adapter capabilities from the provided configuration, ensuring
 * type safety without requiring explicit generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns A configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or account derivation fails
 */
declare const createAdapterFromPrivateKey: typeof createViemAdapterFromPrivateKey;

/**
 * Parameters for creating a ViemAdapter from an EIP1193 provider.
 *
 * This interface defines the configuration options available when creating
 * a ViemAdapter instance using the `createViemAdapterFromProvider` factory function.
 *
 * @typeParam TCapabilities - The adapter capabilities type for compile-time address validation
 */
interface CreateViemAdapterFromProviderParams<TCapabilities extends Partial<AdapterCapabilities> = object> {
    /**
     * The EIP1193-compatible provider (e.g., MetaMask, WalletConnect).
     * Must support the standard provider interface for account access and signing.
     */
    provider: EIP1193Provider;
    /**
     * Optional function to create public clients for different chains.
     * If not provided, a default implementation using HTTP transport will be used.
     */
    getPublicClient?: (params: {
        chain: Chain;
    }) => PublicClient;
    /**
     * Optional adapter capabilities configuration.
     * Defines address control model and supported chains.
     * If not provided, defaults to user-controlled with all EVM chains supported.
     */
    capabilities?: TCapabilities;
}
/**
 * @deprecated Use {@link CreateViemAdapterFromProviderParams} instead
 *
 * Parameters for creating a ViemAdapter from an EIP1193 provider.
 *
 * This interface defines the configuration options available when creating
 * a ViemAdapter instance using the `createViemAdapterFromProvider` factory function.
 *
 * @typeParam TCapabilities - The adapter capabilities type for compile-time address validation
 */
type CreateAdapterFromProviderParams<TCapabilities extends Partial<AdapterCapabilities> = object> = CreateViemAdapterFromProviderParams<TCapabilities>;
/**
 * Creates a ViemAdapter instance from an EIP1193-compatible provider with automatic type inference.
 *
 * This function creates a ViemAdapter by connecting to an EIP1193 provider
 * (such as MetaMask, WalletConnect, or other browser wallets). It uses lazy
 * account derivation and automatically infers the adapter capabilities from
 * the provided configuration, ensuring type safety without requiring explicit
 * generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns Promise resolving to a configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or provider operations fail
 *
 * @example
 * ```typescript
 * // Developer-controlled adapter (requires addresses)
 * const devAdapter = await createViemAdapterFromProvider({
 *   provider: window.ethereum,
 *   capabilities: { addressContext: 'developer-controlled' }
 * })
 *
 * // User-controlled adapter (addresses forbidden)
 * const userAdapter = await createViemAdapterFromProvider({
 *   provider: window.ethereum,
 *   capabilities: { addressContext: 'user-controlled' }
 * })
 *
 * // Default adapter (user-controlled)
 * const defaultAdapter = await createViemAdapterFromProvider({
 *   provider: window.ethereum
 * })
 * ```
 */
declare function createViemAdapterFromProvider<const TCapabilities extends Partial<AdapterCapabilities> = object>(params: CreateViemAdapterFromProviderParams<TCapabilities>): Promise<ViemAdapter<InferAdapterCapabilities<TCapabilities>>>;
/**
 * @deprecated Use {@link createViemAdapterFromProvider} instead
 *
 * Creates a ViemAdapter instance from an EIP1193-compatible provider with automatic type inference.
 *
 * This function creates a ViemAdapter by connecting to an EIP1193 provider
 * (such as MetaMask, WalletConnect, or other browser wallets). It uses lazy
 * account derivation and automatically infers the adapter capabilities from
 * the provided configuration, ensuring type safety without requiring explicit
 * generic type arguments.
 *
 * @param params - Configuration parameters for creating the adapter
 * @returns Promise resolving to a configured ViemAdapter instance with automatically inferred capabilities
 * @throws Error when validation fails or provider operations fail
 */
declare const createAdapterFromProvider: typeof createViemAdapterFromProvider;

export { Blockchain, ViemAdapter, buildEIP2612TypedData, computeDefaultDeadline, createAdapterFromPrivateKey, createAdapterFromProvider, createViemAdapterFromPrivateKey, createViemAdapterFromProvider, parseSignature, resolveChainIdentifier };
export type { ChainIdentifier, CreateAdapterFromPrivateKeyParams, CreateAdapterFromProviderParams, CreateViemAdapterFromPrivateKeyParams, CreateViemAdapterFromProviderParams, EIP2612Message, EIP2612NonceFetcher, EIP2612Options, PermitStandardName, Signature, TypedData, TypedDataField, ViemAdapterOptions };
