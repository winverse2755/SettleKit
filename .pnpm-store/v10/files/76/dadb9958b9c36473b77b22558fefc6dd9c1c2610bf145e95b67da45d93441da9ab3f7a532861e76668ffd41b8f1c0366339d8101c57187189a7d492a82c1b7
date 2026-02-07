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

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Blockchain Enum
// -----------------------------------------------------------------------------
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
var Blockchain;
(function (Blockchain) {
    Blockchain["Algorand"] = "Algorand";
    Blockchain["Algorand_Testnet"] = "Algorand_Testnet";
    Blockchain["Aptos"] = "Aptos";
    Blockchain["Aptos_Testnet"] = "Aptos_Testnet";
    Blockchain["Arc_Testnet"] = "Arc_Testnet";
    Blockchain["Arbitrum"] = "Arbitrum";
    Blockchain["Arbitrum_Sepolia"] = "Arbitrum_Sepolia";
    Blockchain["Avalanche"] = "Avalanche";
    Blockchain["Avalanche_Fuji"] = "Avalanche_Fuji";
    Blockchain["Base"] = "Base";
    Blockchain["Base_Sepolia"] = "Base_Sepolia";
    Blockchain["Celo"] = "Celo";
    Blockchain["Celo_Alfajores_Testnet"] = "Celo_Alfajores_Testnet";
    Blockchain["Codex"] = "Codex";
    Blockchain["Codex_Testnet"] = "Codex_Testnet";
    Blockchain["Ethereum"] = "Ethereum";
    Blockchain["Ethereum_Sepolia"] = "Ethereum_Sepolia";
    Blockchain["Hedera"] = "Hedera";
    Blockchain["Hedera_Testnet"] = "Hedera_Testnet";
    Blockchain["HyperEVM"] = "HyperEVM";
    Blockchain["HyperEVM_Testnet"] = "HyperEVM_Testnet";
    Blockchain["Ink"] = "Ink";
    Blockchain["Ink_Testnet"] = "Ink_Testnet";
    Blockchain["Linea"] = "Linea";
    Blockchain["Linea_Sepolia"] = "Linea_Sepolia";
    Blockchain["Monad"] = "Monad";
    Blockchain["Monad_Testnet"] = "Monad_Testnet";
    Blockchain["NEAR"] = "NEAR";
    Blockchain["NEAR_Testnet"] = "NEAR_Testnet";
    Blockchain["Noble"] = "Noble";
    Blockchain["Noble_Testnet"] = "Noble_Testnet";
    Blockchain["Optimism"] = "Optimism";
    Blockchain["Optimism_Sepolia"] = "Optimism_Sepolia";
    Blockchain["Polkadot_Asset_Hub"] = "Polkadot_Asset_Hub";
    Blockchain["Polkadot_Westmint"] = "Polkadot_Westmint";
    Blockchain["Plume"] = "Plume";
    Blockchain["Plume_Testnet"] = "Plume_Testnet";
    Blockchain["Polygon"] = "Polygon";
    Blockchain["Polygon_Amoy_Testnet"] = "Polygon_Amoy_Testnet";
    Blockchain["Sei"] = "Sei";
    Blockchain["Sei_Testnet"] = "Sei_Testnet";
    Blockchain["Solana"] = "Solana";
    Blockchain["Solana_Devnet"] = "Solana_Devnet";
    Blockchain["Sonic"] = "Sonic";
    Blockchain["Sonic_Testnet"] = "Sonic_Testnet";
    Blockchain["Stellar"] = "Stellar";
    Blockchain["Stellar_Testnet"] = "Stellar_Testnet";
    Blockchain["Sui"] = "Sui";
    Blockchain["Sui_Testnet"] = "Sui_Testnet";
    Blockchain["Unichain"] = "Unichain";
    Blockchain["Unichain_Sepolia"] = "Unichain_Sepolia";
    Blockchain["World_Chain"] = "World_Chain";
    Blockchain["World_Chain_Sepolia"] = "World_Chain_Sepolia";
    Blockchain["XDC"] = "XDC";
    Blockchain["XDC_Apothem"] = "XDC_Apothem";
    Blockchain["ZKSync_Era"] = "ZKSync_Era";
    Blockchain["ZKSync_Sepolia"] = "ZKSync_Sepolia";
})(Blockchain || (Blockchain = {}));
// -----------------------------------------------------------------------------
// Bridge Chain Enum (CCTPv2 Supported Chains)
// -----------------------------------------------------------------------------
/**
 * Enumeration of blockchains that support cross-chain bridging via CCTPv2.
 *
 * The enum is derived from the full {@link Blockchain} enum but filtered to only
 * include chains with active CCTPv2 support. When new chains gain CCTPv2 support,
 * they are added to this enum.
 *
 * @enum
 * @category Enums
 *
 * @remarks
 * - This enum is the **canonical source** of bridging-supported chains.
 * - Use this enum (or its string literals) in `kit.bridge()` calls for type safety.
 * - Attempting to use a chain not in this enum will produce a TypeScript compile error.
 *
 * @example
 * ```typescript
 * import { BridgeKit, BridgeChain } from '@circle-fin/bridge-kit'
 *
 * const kit = new BridgeKit()
 *
 * // ✅ Valid - autocomplete suggests only supported chains
 * await kit.bridge({
 *   from: { adapter, chain: BridgeChain.Ethereum },
 *   to: { adapter, chain: BridgeChain.Base },
 *   amount: '100'
 * })
 *
 * // ✅ Also valid - string literals work with autocomplete
 * await kit.bridge({
 *   from: { adapter, chain: 'Ethereum_Sepolia' },
 *   to: { adapter, chain: 'Base_Sepolia' },
 *   amount: '100'
 * })
 *
 * // ❌ Compile error - Algorand is not in BridgeChain
 * await kit.bridge({
 *   from: { adapter, chain: 'Algorand' }, // TypeScript error!
 *   to: { adapter, chain: 'Base' },
 *   amount: '100'
 * })
 * ```
 *
 * @see {@link Blockchain} for the complete list of all known blockchains.
 * @see {@link BridgeChainIdentifier} for the type that accepts these values.
 */
var BridgeChain;
(function (BridgeChain) {
    // Mainnet chains with CCTPv2 support
    BridgeChain["Arbitrum"] = "Arbitrum";
    BridgeChain["Avalanche"] = "Avalanche";
    BridgeChain["Base"] = "Base";
    BridgeChain["Codex"] = "Codex";
    BridgeChain["Ethereum"] = "Ethereum";
    BridgeChain["HyperEVM"] = "HyperEVM";
    BridgeChain["Ink"] = "Ink";
    BridgeChain["Linea"] = "Linea";
    BridgeChain["Monad"] = "Monad";
    BridgeChain["Optimism"] = "Optimism";
    BridgeChain["Plume"] = "Plume";
    BridgeChain["Polygon"] = "Polygon";
    BridgeChain["Sei"] = "Sei";
    BridgeChain["Solana"] = "Solana";
    BridgeChain["Sonic"] = "Sonic";
    BridgeChain["Unichain"] = "Unichain";
    BridgeChain["World_Chain"] = "World_Chain";
    BridgeChain["XDC"] = "XDC";
    // Testnet chains with CCTPv2 support
    BridgeChain["Arc_Testnet"] = "Arc_Testnet";
    BridgeChain["Arbitrum_Sepolia"] = "Arbitrum_Sepolia";
    BridgeChain["Avalanche_Fuji"] = "Avalanche_Fuji";
    BridgeChain["Base_Sepolia"] = "Base_Sepolia";
    BridgeChain["Codex_Testnet"] = "Codex_Testnet";
    BridgeChain["Ethereum_Sepolia"] = "Ethereum_Sepolia";
    BridgeChain["HyperEVM_Testnet"] = "HyperEVM_Testnet";
    BridgeChain["Ink_Testnet"] = "Ink_Testnet";
    BridgeChain["Linea_Sepolia"] = "Linea_Sepolia";
    BridgeChain["Monad_Testnet"] = "Monad_Testnet";
    BridgeChain["Optimism_Sepolia"] = "Optimism_Sepolia";
    BridgeChain["Plume_Testnet"] = "Plume_Testnet";
    BridgeChain["Polygon_Amoy_Testnet"] = "Polygon_Amoy_Testnet";
    BridgeChain["Sei_Testnet"] = "Sei_Testnet";
    BridgeChain["Solana_Devnet"] = "Solana_Devnet";
    BridgeChain["Sonic_Testnet"] = "Sonic_Testnet";
    BridgeChain["Unichain_Sepolia"] = "Unichain_Sepolia";
    BridgeChain["World_Chain_Sepolia"] = "World_Chain_Sepolia";
    BridgeChain["XDC_Apothem"] = "XDC_Apothem";
})(BridgeChain || (BridgeChain = {}));

/**
 * Helper function to define a chain with proper TypeScript typing.
 *
 * This utility function works with TypeScript's `as const` assertion to create
 * strongly-typed, immutable chain definition objects. It preserves literal types
 * from the input and ensures the resulting object maintains all type information.
 *
 * When used with `as const`, it allows TypeScript to infer the most specific
 * possible types for all properties, including string literals and numeric literals,
 * rather than widening them to general types like string or number.
 * @typeParam T - The specific chain definition type (must extend ChainDefinition)
 * @param chain - The chain definition object, typically with an `as const` assertion
 * @returns The same chain definition with preserved literal types
 * @example
 * ```typescript
 * // Define an EVM chain with literal types preserved
 * const Ethereum = defineChain({
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   chainId: 1,
 *   name: 'Ethereum',
 *   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
 *   isTestnet: false,
 *   usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
 *   eurcAddress: null,
 *   cctp: {
 *     domain: 0,
 *     contracts: {
 *       TokenMessengerV1: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
 *       MessageTransmitterV1: '0x0a992d191deec32afe36203ad87d7d289a738f81'
 *     }
 *   }
 * } as const);
 * ```
 */
function defineChain(chain) {
    return chain;
}

/**
 * Algorand Mainnet chain definition
 * @remarks
 * This represents the official production network for the Algorand blockchain.
 */
defineChain({
    type: 'algorand',
    chain: Blockchain.Algorand,
    name: 'Algorand',
    title: 'Algorand Mainnet',
    nativeCurrency: {
        name: 'Algo',
        symbol: 'ALGO',
        decimals: 6,
    },
    isTestnet: false,
    explorerUrl: 'https://explorer.perawallet.app/tx/{hash}',
    rpcEndpoints: ['https://mainnet-api.algonode.cloud'],
    eurcAddress: null,
    usdcAddress: '31566704',
    cctp: null,
});

/**
 * Algorand Testnet chain definition
 * @remarks
 * This represents the official testnet for the Algorand blockchain.
 */
defineChain({
    type: 'algorand',
    chain: Blockchain.Algorand_Testnet,
    name: 'Algorand Testnet',
    title: 'Algorand Test Network',
    nativeCurrency: {
        name: 'Algo',
        symbol: 'ALGO',
        decimals: 6,
    },
    isTestnet: true,
    explorerUrl: 'https://testnet.explorer.perawallet.app/tx/{hash}',
    rpcEndpoints: ['https://testnet-api.algonode.cloud'],
    eurcAddress: null,
    usdcAddress: '10458941',
    cctp: null,
});

/**
 * Aptos Mainnet chain definition
 * @remarks
 * This represents the official production network for the Aptos blockchain.
 */
defineChain({
    type: 'aptos',
    chain: Blockchain.Aptos,
    name: 'Aptos',
    title: 'Aptos Mainnet',
    nativeCurrency: {
        name: 'Aptos',
        symbol: 'APT',
        decimals: 8,
    },
    isTestnet: false,
    explorerUrl: 'https://explorer.aptoslabs.com/txn/{hash}?network=mainnet',
    rpcEndpoints: ['https://fullnode.mainnet.aptoslabs.com/v1'],
    eurcAddress: null,
    usdcAddress: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    cctp: {
        domain: 9,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9bce6734f7b63e835108e3bd8c36743d4709fe435f44791918801d0989640a9d',
                messageTransmitter: '0x177e17751820e4b4371873ca8c30279be63bdea63b88ed0f2239c2eea10f1772',
                confirmations: 1,
            },
        },
    },
});

/**
 * Aptos Testnet chain definition
 * @remarks
 * This represents the official test network for the Aptos blockchain.
 */
defineChain({
    type: 'aptos',
    chain: Blockchain.Aptos_Testnet,
    name: 'Aptos Testnet',
    title: 'Aptos Test Network',
    nativeCurrency: {
        name: 'Aptos',
        symbol: 'APT',
        decimals: 8,
    },
    isTestnet: true,
    explorerUrl: 'https://explorer.aptoslabs.com/txn/{hash}?network=testnet',
    rpcEndpoints: ['https://fullnode.testnet.aptoslabs.com/v1'],
    eurcAddress: null,
    usdcAddress: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
    cctp: {
        domain: 9,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9',
                messageTransmitter: '0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9',
                confirmations: 1,
            },
        },
    },
});

/**
 * The bridge contract address for EVM testnet networks.
 *
 * This contract handles USDC transfers on testnet environments across
 * EVM-compatible chains. Use this address when deploying or testing
 * cross-chain USDC transfers on test networks.
 */
const BRIDGE_CONTRACT_EVM_TESTNET = '0xC5567a5E3370d4DBfB0540025078e283e36A363d';
/**
 * The bridge contract address for EVM mainnet networks.
 *
 * This contract handles USDC transfers on mainnet environments across
 * EVM-compatible chains. Use this address for production cross-chain
 * USDC transfers on live networks.
 */
const BRIDGE_CONTRACT_EVM_MAINNET = '0xB3FA262d0fB521cc93bE83d87b322b8A23DAf3F0';

/**
 * Arc Testnet chain definition
 * @remarks
 * This represents the test network for the Arc blockchain,
 * Circle's EVM-compatible Layer-1 designed for stablecoin finance
 * and asset tokenization. Arc uses USDC as the native gas token and
 * features the Malachite Byzantine Fault Tolerant (BFT) consensus
 * engine for sub-second finality.
 */
const ArcTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Arc_Testnet,
    name: 'Arc Testnet',
    title: 'ArcTestnet',
    nativeCurrency: {
        name: 'USDC',
        symbol: 'USDC',
        // Arc uses native USDC with 18 decimals for gas payments (EVM standard).
        // Note: The ERC-20 USDC contract at usdcAddress uses 6 decimals.
        // See: https://docs.arc.network/arc/references/contract-addresses
        decimals: 18,
    },
    chainId: 5042002,
    isTestnet: true,
    explorerUrl: 'https://testnet.arcscan.app/tx/{hash}',
    rpcEndpoints: ['https://rpc.testnet.arc.network/'],
    eurcAddress: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    usdcAddress: '0x3600000000000000000000000000000000000000',
    cctp: {
        domain: 26,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Arbitrum Mainnet chain definition
 * @remarks
 * This represents the official production network for the Arbitrum blockchain.
 */
const Arbitrum = defineChain({
    type: 'evm',
    chain: Blockchain.Arbitrum,
    name: 'Arbitrum',
    title: 'Arbitrum Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 42161,
    isTestnet: false,
    explorerUrl: 'https://arbiscan.io/tx/{hash}',
    rpcEndpoints: ['https://arb1.arbitrum.io/rpc'],
    eurcAddress: null,
    usdcAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    cctp: {
        domain: 3,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
                messageTransmitter: '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Arbitrum Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Arbitrum blockchain on Sepolia.
 */
const ArbitrumSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.Arbitrum_Sepolia,
    name: 'Arbitrum Sepolia',
    title: 'Arbitrum Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 421614,
    isTestnet: true,
    explorerUrl: 'https://sepolia.arbiscan.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia-rollup.arbitrum.io/rpc'],
    eurcAddress: null,
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    cctp: {
        domain: 3,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Avalanche Mainnet chain definition
 * @remarks
 * This represents the official production network for the Avalanche blockchain.
 */
const Avalanche = defineChain({
    type: 'evm',
    chain: Blockchain.Avalanche,
    name: 'Avalanche',
    title: 'Avalanche Mainnet',
    nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
    },
    chainId: 43114,
    isTestnet: false,
    explorerUrl: 'https://subnets.avax.network/c-chain/tx/{hash}',
    rpcEndpoints: ['https://api.avax.network/ext/bc/C/rpc'],
    eurcAddress: '0xc891eb4cbdeff6e073e859e987815ed1505c2acd',
    usdcAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    cctp: {
        domain: 1,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x6b25532e1060ce10cc3b0a99e5683b91bfde6982',
                messageTransmitter: '0x8186359af5f57fbb40c6b14a588d2a59c0c29880',
                confirmations: 1,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Avalanche Fuji Testnet chain definition
 * @remarks
 * This represents the official test network for the Avalanche blockchain.
 */
const AvalancheFuji = defineChain({
    type: 'evm',
    chain: Blockchain.Avalanche_Fuji,
    name: 'Avalanche Fuji',
    title: 'Avalanche Fuji Testnet',
    nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
    },
    chainId: 43113,
    isTestnet: true,
    explorerUrl: 'https://subnets-test.avax.network/c-chain/tx/{hash}',
    eurcAddress: '0x5e44db7996c682e92a960b65ac713a54ad815c6b',
    usdcAddress: '0x5425890298aed601595a70ab815c96711a31bc65',
    cctp: {
        domain: 1,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0',
                messageTransmitter: '0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79',
                confirmations: 1,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    rpcEndpoints: ['https://api.avax-test.network/ext/bc/C/rpc'],
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Base chain definition
 * @remarks
 * This represents the official production network for the Base blockchain.
 */
const Base = defineChain({
    type: 'evm',
    chain: Blockchain.Base,
    name: 'Base',
    title: 'Base Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 8453,
    isTestnet: false,
    explorerUrl: 'https://basescan.org/tx/{hash}',
    rpcEndpoints: ['https://mainnet.base.org', 'https://base.publicnode.com'],
    eurcAddress: '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cctp: {
        domain: 6,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
                messageTransmitter: '0xAD09780d193884d503182aD4588450C416D6F9D4',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Base Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Base blockchain on Sepolia.
 */
const BaseSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.Base_Sepolia,
    name: 'Base Sepolia',
    title: 'Base Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 84532,
    isTestnet: true,
    explorerUrl: 'https://sepolia.basescan.org/tx/{hash}',
    rpcEndpoints: ['https://sepolia.base.org'],
    eurcAddress: '0x808456652fdb597867f38412077A9182bf77359F',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    cctp: {
        domain: 6,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Celo Mainnet chain definition
 * @remarks
 * This represents the official production network for the Celo blockchain.
 */
defineChain({
    type: 'evm',
    chain: Blockchain.Celo,
    name: 'Celo',
    title: 'Celo Mainnet',
    nativeCurrency: {
        name: 'Celo',
        symbol: 'CELO',
        decimals: 18,
    },
    chainId: 42220,
    isTestnet: false,
    explorerUrl: 'https://celoscan.io/tx/{hash}',
    rpcEndpoints: ['https://forno.celo.org'],
    eurcAddress: null,
    usdcAddress: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    cctp: null,
});

/**
 * Celo Alfajores Testnet chain definition
 * @remarks
 * This represents the official test network for the Celo blockchain.
 */
defineChain({
    type: 'evm',
    chain: Blockchain.Celo_Alfajores_Testnet,
    name: 'Celo Alfajores',
    title: 'Celo Alfajores Testnet',
    nativeCurrency: {
        name: 'Celo',
        symbol: 'CELO',
        decimals: 18,
    },
    chainId: 44787,
    isTestnet: true,
    explorerUrl: 'https://alfajores.celoscan.io/tx/{hash}',
    rpcEndpoints: ['https://alfajores-forno.celo-testnet.org'],
    eurcAddress: null,
    usdcAddress: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
    cctp: null,
});

/**
 * Codex Mainnet chain definition
 * @remarks
 * This represents the main network for the Codex blockchain.
 */
const Codex = defineChain({
    type: 'evm',
    chain: Blockchain.Codex,
    name: 'Codex Mainnet',
    title: 'Codex Mainnet',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 81224,
    isTestnet: false,
    explorerUrl: 'https://explorer.codex.xyz/tx/{hash}',
    rpcEndpoints: ['https://rpc.codex.xyz'],
    eurcAddress: null,
    usdcAddress: '0xd996633a415985DBd7D6D12f4A4343E31f5037cf',
    cctp: {
        domain: 12,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Codex Testnet chain definition
 * @remarks
 * This represents the test network for the Codex blockchain.
 */
const CodexTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Codex_Testnet,
    name: 'Codex Testnet',
    title: 'Codex Testnet',
    nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 812242,
    isTestnet: true,
    explorerUrl: 'https://explorer.codex-stg.xyz/tx/{hash}',
    rpcEndpoints: ['https://rpc.codex-stg.xyz'],
    eurcAddress: null,
    usdcAddress: '0x6d7f141b6819C2c9CC2f818e6ad549E7Ca090F8f',
    cctp: {
        domain: 12,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Ethereum Mainnet chain definition
 * @remarks
 * This represents the official production network for the Ethereum blockchain.
 */
const Ethereum = defineChain({
    type: 'evm',
    chain: Blockchain.Ethereum,
    name: 'Ethereum',
    title: 'Ethereum Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 1,
    isTestnet: false,
    explorerUrl: 'https://etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://eth.merkle.io', 'https://ethereum.publicnode.com'],
    eurcAddress: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c',
    usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    cctp: {
        domain: 0,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0xbd3fa81b58ba92a82136038b25adec7066af3155',
                messageTransmitter: '0x0a992d191deec32afe36203ad87d7d289a738f81',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 2,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Ethereum Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Ethereum blockchain on Sepolia.
 */
const EthereumSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.Ethereum_Sepolia,
    name: 'Ethereum Sepolia',
    title: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 11155111,
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia.drpc.org'],
    eurcAddress: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    cctp: {
        domain: 0,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 2,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Hedera Mainnet chain definition
 * @remarks
 * This represents the official production network for the Hedera blockchain.
 */
defineChain({
    type: 'hedera',
    chain: Blockchain.Hedera,
    name: 'Hedera',
    title: 'Hedera Mainnet',
    nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18,
    },
    isTestnet: false,
    explorerUrl: 'https://hashscan.io/mainnet/transaction/{hash}', // Note: Hedera uses `transaction_id`, not hash. Format is typically `0.0.X-YYYY...`.
    rpcEndpoints: ['https://mainnet.hashio.io/api'],
    eurcAddress: null,
    usdcAddress: '0.0.456858',
    cctp: null,
});

/**
 * Hedera Testnet chain definition
 * @remarks
 * This represents the official test network for the Hedera blockchain.
 */
defineChain({
    type: 'hedera',
    chain: Blockchain.Hedera_Testnet,
    name: 'Hedera Testnet',
    title: 'Hedera Test Network',
    nativeCurrency: {
        name: 'HBAR',
        symbol: 'HBAR',
        decimals: 18,
    },
    isTestnet: true,
    explorerUrl: 'https://hashscan.io/testnet/transaction/{hash}', // Note: Hedera uses `transaction_id`, not hash. Format is typically `0.0.X-YYYY...`.
    rpcEndpoints: ['https://testnet.hashio.io/api'],
    eurcAddress: null,
    usdcAddress: '0.0.429274',
    cctp: null,
});

/**
 * HyperEVM Mainnet chain definition
 * @remarks
 * This represents the official production network for the HyperEVM blockchain.
 * HyperEVM is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const HyperEVM = defineChain({
    type: 'evm',
    chain: Blockchain.HyperEVM,
    name: 'HyperEVM',
    title: 'HyperEVM Mainnet',
    nativeCurrency: {
        name: 'Hype',
        symbol: 'HYPE',
        decimals: 18,
    },
    chainId: 999,
    isTestnet: false,
    explorerUrl: 'https://hyperevmscan.io/tx/{hash}',
    rpcEndpoints: ['https://rpc.hyperliquid.xyz/evm'],
    eurcAddress: null,
    usdcAddress: '0xb88339CB7199b77E23DB6E890353E22632Ba630f',
    cctp: {
        domain: 19,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * HyperEVM Testnet chain definition
 * @remarks
 * This represents the official testnet for the HyperEVM blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const HyperEVMTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.HyperEVM_Testnet,
    name: 'HyperEVM Testnet',
    title: 'HyperEVM Test Network',
    nativeCurrency: {
        name: 'Hype',
        symbol: 'HYPE',
        decimals: 18,
    },
    chainId: 998,
    isTestnet: true,
    explorerUrl: 'https://testnet.hyperliquid.xyz/explorer/tx/{hash}',
    rpcEndpoints: ['https://rpc.hyperliquid-testnet.xyz/evm'],
    eurcAddress: null,
    usdcAddress: '0x2B3370eE501B4a559b57D449569354196457D8Ab',
    cctp: {
        domain: 19,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Ink Mainnet chain definition
 * @remarks
 * This represents the official production network for the Ink blockchain.
 * Ink is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const Ink = defineChain({
    type: 'evm',
    chain: Blockchain.Ink,
    name: 'Ink',
    title: 'Ink Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 57073,
    isTestnet: false,
    explorerUrl: 'https://explorer.inkonchain.com/tx/{hash}',
    rpcEndpoints: [
        'https://rpc-gel.inkonchain.com',
        'https://rpc-qnd.inkonchain.com',
    ],
    eurcAddress: null,
    usdcAddress: '0x2D270e6886d130D724215A266106e6832161EAEd',
    cctp: {
        domain: 21,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Ink Testnet chain definition
 * @remarks
 * This represents the official testnet for the Ink blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const InkTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Ink_Testnet,
    name: 'Ink Sepolia',
    title: 'Ink Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 763373,
    isTestnet: true,
    explorerUrl: 'https://explorer-sepolia.inkonchain.com/tx/{hash}',
    rpcEndpoints: [
        'https://rpc-gel-sepolia.inkonchain.com',
        'https://rpc-qnd-sepolia.inkonchain.com',
    ],
    eurcAddress: null,
    usdcAddress: '0xFabab97dCE620294D2B0b0e46C68964e326300Ac',
    cctp: {
        domain: 21,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Linea Mainnet chain definition
 * @remarks
 * This represents the official production network for the Linea blockchain.
 */
const Linea = defineChain({
    type: 'evm',
    chain: Blockchain.Linea,
    name: 'Linea',
    title: 'Linea Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 59144,
    isTestnet: false,
    explorerUrl: 'https://lineascan.build/tx/{hash}',
    rpcEndpoints: ['https://rpc.linea.build'],
    eurcAddress: null,
    usdcAddress: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    cctp: {
        domain: 11,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Linea Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Linea blockchain on Sepolia.
 */
const LineaSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.Linea_Sepolia,
    name: 'Linea Sepolia',
    title: 'Linea Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 59141,
    isTestnet: true,
    explorerUrl: 'https://sepolia.lineascan.build/tx/{hash}',
    rpcEndpoints: ['https://rpc.sepolia.linea.build'],
    eurcAddress: null,
    usdcAddress: '0xfece4462d57bd51a6a552365a011b95f0e16d9b7',
    cctp: {
        domain: 11,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Monad Mainnet chain definition
 * @remarks
 * This represents the official production network for the Monad blockchain.
 * Monad is a high-performance EVM-compatible Layer-1 blockchain featuring
 * over 10,000 TPS, sub-second finality, and near-zero gas fees.
 */
const Monad = defineChain({
    type: 'evm',
    chain: Blockchain.Monad,
    name: 'Monad',
    title: 'Monad Mainnet',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    chainId: 143,
    isTestnet: false,
    explorerUrl: 'https://monadscan.com/tx/{hash}',
    rpcEndpoints: ['https://rpc.monad.xyz'],
    eurcAddress: null,
    usdcAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
    cctp: {
        domain: 15,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Monad Testnet chain definition
 * @remarks
 * This represents the official test network for the Monad blockchain.
 * Monad is a high-performance EVM-compatible Layer-1 blockchain featuring
 * over 10,000 TPS, sub-second finality, and near-zero gas fees.
 */
const MonadTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Monad_Testnet,
    name: 'Monad Testnet',
    title: 'Monad Testnet',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    chainId: 10143,
    isTestnet: true,
    explorerUrl: 'https://testnet.monadscan.com/tx/{hash}',
    rpcEndpoints: ['https://testnet-rpc.monad.xyz'],
    eurcAddress: null,
    usdcAddress: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
    cctp: {
        domain: 15,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * NEAR Protocol Mainnet chain definition
 * @remarks
 * This represents the official production network for the NEAR Protocol blockchain.
 */
defineChain({
    type: 'near',
    chain: Blockchain.NEAR,
    name: 'NEAR Protocol',
    title: 'NEAR Mainnet',
    nativeCurrency: {
        name: 'NEAR',
        symbol: 'NEAR',
        decimals: 24,
    },
    isTestnet: false,
    explorerUrl: 'https://nearblocks.io/txns/{hash}',
    rpcEndpoints: ['https://eth-rpc.mainnet.near.org'],
    eurcAddress: null,
    usdcAddress: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    cctp: null,
});

/**
 * NEAR Testnet chain definition
 * @remarks
 * This represents the official test network for the NEAR Protocol blockchain.
 */
defineChain({
    type: 'near',
    chain: Blockchain.NEAR_Testnet,
    name: 'NEAR Protocol Testnet',
    title: 'NEAR Test Network',
    nativeCurrency: {
        name: 'NEAR',
        symbol: 'NEAR',
        decimals: 24,
    },
    isTestnet: true,
    explorerUrl: 'https://testnet.nearblocks.io/txns/{hash}',
    rpcEndpoints: ['https://eth-rpc.testnet.near.org'],
    eurcAddress: null,
    usdcAddress: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af',
    cctp: null,
});

/**
 * Noble Mainnet chain definition
 * @remarks
 * This represents the official production network for the Noble blockchain.
 */
defineChain({
    type: 'noble',
    chain: Blockchain.Noble,
    name: 'Noble',
    title: 'Noble Mainnet',
    nativeCurrency: {
        name: 'Noble USDC',
        symbol: 'USDC',
        decimals: 6,
    },
    isTestnet: false,
    explorerUrl: 'https://www.mintscan.io/noble/tx/{hash}',
    rpcEndpoints: ['https://noble-rpc.polkachu.com'],
    eurcAddress: null,
    usdcAddress: 'uusdc',
    cctp: {
        domain: 4,
        contracts: {
            v1: {
                type: 'merged',
                contract: 'noble12l2w4ugfz4m6dd73yysz477jszqnfughxvkss5',
                confirmations: 1,
            },
        },
    },
});

/**
 * Noble Testnet chain definition
 * @remarks
 * This represents the official test network for the Noble blockchain.
 */
defineChain({
    type: 'noble',
    chain: Blockchain.Noble_Testnet,
    name: 'Noble Testnet',
    title: 'Noble Test Network',
    nativeCurrency: {
        name: 'Noble USDC',
        symbol: 'USDC',
        decimals: 6,
    },
    isTestnet: true,
    explorerUrl: 'https://www.mintscan.io/noble-testnet/tx/{hash}',
    rpcEndpoints: ['https://noble-testnet-rpc.polkachu.com'],
    eurcAddress: null,
    usdcAddress: 'uusdc',
    cctp: {
        domain: 4,
        contracts: {
            v1: {
                type: 'merged',
                contract: 'noble12l2w4ugfz4m6dd73yysz477jszqnfughxvkss5',
                confirmations: 1,
            },
        },
    },
});

/**
 * Optimism Mainnet chain definition
 * @remarks
 * This represents the official production network for the Optimism blockchain.
 */
const Optimism = defineChain({
    type: 'evm',
    chain: Blockchain.Optimism,
    name: 'Optimism',
    title: 'Optimism Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 10,
    isTestnet: false,
    explorerUrl: 'https://optimistic.etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://mainnet.optimism.io'],
    eurcAddress: null,
    usdcAddress: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    cctp: {
        domain: 2,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x2B4069517957735bE00ceE0fadAE88a26365528f',
                messageTransmitter: '0x0a992d191deec32afe36203ad87d7d289a738f81',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Optimism Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Optimism blockchain on Sepolia.
 */
const OptimismSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.Optimism_Sepolia,
    name: 'Optimism Sepolia',
    title: 'Optimism Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 11155420,
    isTestnet: true,
    explorerUrl: 'https://sepolia-optimistic.etherscan.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia.optimism.io'],
    eurcAddress: null,
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    cctp: {
        domain: 2,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Plume Mainnet chain definition
 * @remarks
 * This represents the official production network for the Plume blockchain.
 * Plume is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const Plume = defineChain({
    type: 'evm',
    chain: Blockchain.Plume,
    name: 'Plume',
    title: 'Plume Mainnet',
    nativeCurrency: {
        name: 'Plume',
        symbol: 'PLUME',
        decimals: 18,
    },
    chainId: 98866,
    isTestnet: false,
    explorerUrl: 'https://explorer.plume.org/tx/{hash}',
    rpcEndpoints: ['https://rpc.plume.org'],
    eurcAddress: null,
    usdcAddress: '0x222365EF19F7947e5484218551B56bb3965Aa7aF',
    cctp: {
        domain: 22,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Plume Testnet chain definition
 * @remarks
 * This represents the official testnet for the Plume blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const PlumeTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Plume_Testnet,
    name: 'Plume Testnet',
    title: 'Plume Test Network',
    nativeCurrency: {
        name: 'Plume',
        symbol: 'PLUME',
        decimals: 18,
    },
    chainId: 98867,
    isTestnet: true,
    explorerUrl: 'https://testnet-explorer.plume.org/tx/{hash}',
    rpcEndpoints: ['https://testnet-rpc.plume.org'],
    eurcAddress: null,
    usdcAddress: '0xcB5f30e335672893c7eb944B374c196392C19D18',
    cctp: {
        domain: 22,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Polkadot Asset Hub chain definition
 * @remarks
 * This represents the official asset management parachain for the Polkadot blockchain.
 */
defineChain({
    type: 'polkadot',
    chain: Blockchain.Polkadot_Asset_Hub,
    name: 'Polkadot Asset Hub',
    title: 'Polkadot Asset Hub',
    nativeCurrency: {
        name: 'Polkadot',
        symbol: 'DOT',
        decimals: 10,
    },
    isTestnet: false,
    explorerUrl: 'https://polkadot.subscan.io/extrinsic/{hash}',
    rpcEndpoints: ['https://asset-hub-polkadot-rpc.n.dwellir.com'],
    eurcAddress: null,
    usdcAddress: '1337',
    cctp: null,
});

/**
 * Polkadot Westmint chain definition
 * @remarks
 * This represents an asset management parachain in the Polkadot ecosystem.
 */
defineChain({
    type: 'polkadot',
    chain: Blockchain.Polkadot_Westmint,
    name: 'Polkadot Westmint',
    title: 'Polkadot Westmint',
    nativeCurrency: {
        name: 'Polkadot',
        symbol: 'DOT',
        decimals: 10,
    },
    isTestnet: false,
    explorerUrl: 'https://assethub-polkadot.subscan.io/extrinsic/{hash}',
    rpcEndpoints: ['https://westmint-rpc.polkadot.io'],
    eurcAddress: null,
    usdcAddress: 'Asset ID 31337',
    cctp: null,
});

/**
 * Polygon Mainnet chain definition
 * @remarks
 * This represents the official production network for the Polygon blockchain.
 */
const Polygon = defineChain({
    type: 'evm',
    chain: Blockchain.Polygon,
    name: 'Polygon',
    title: 'Polygon Mainnet',
    nativeCurrency: {
        name: 'POL',
        symbol: 'POL',
        decimals: 18,
    },
    chainId: 137,
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com/tx/{hash}',
    rpcEndpoints: ['https://polygon-rpc.com', 'https://polygon.publicnode.com'],
    eurcAddress: null,
    usdcAddress: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    cctp: {
        domain: 7,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
                messageTransmitter: '0xF3be9355363857F3e001be68856A2f96b4C39Ba9',
                confirmations: 200,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 33,
                fastConfirmations: 13,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Polygon Amoy Testnet chain definition
 * @remarks
 * This represents the official test network for the Polygon blockchain.
 */
const PolygonAmoy = defineChain({
    type: 'evm',
    chain: Blockchain.Polygon_Amoy_Testnet,
    name: 'Polygon Amoy',
    title: 'Polygon Amoy Testnet',
    nativeCurrency: {
        name: 'POL',
        symbol: 'POL',
        decimals: 18,
    },
    chainId: 80002,
    isTestnet: true,
    explorerUrl: 'https://amoy.polygonscan.com/tx/{hash}',
    rpcEndpoints: ['https://rpc-amoy.polygon.technology'],
    eurcAddress: null,
    usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    cctp: {
        domain: 7,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
                messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
                confirmations: 200,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 33,
                fastConfirmations: 13,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Sei Mainnet chain definition
 * @remarks
 * This represents the official production network for the Sei blockchain.
 * Sei is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const Sei = defineChain({
    type: 'evm',
    chain: Blockchain.Sei,
    name: 'Sei',
    title: 'Sei Mainnet',
    nativeCurrency: {
        name: 'Sei',
        symbol: 'SEI',
        decimals: 18,
    },
    chainId: 1329,
    isTestnet: false,
    explorerUrl: 'https://seitrace.com/tx/{hash}?chain=pacific-1',
    rpcEndpoints: ['https://evm-rpc.sei-apis.com'],
    eurcAddress: null,
    usdcAddress: '0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392',
    cctp: {
        domain: 16,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Sei Testnet chain definition
 * @remarks
 * This represents the official testnet for the Sei blockchain.
 * Used for development and testing purposes before deploying to mainnet.
 */
const SeiTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Sei_Testnet,
    name: 'Sei Testnet',
    title: 'Sei Test Network',
    nativeCurrency: {
        name: 'Sei',
        symbol: 'SEI',
        decimals: 18,
    },
    chainId: 1328,
    isTestnet: true,
    explorerUrl: 'https://seitrace.com/tx/{hash}?chain=atlantic-2',
    rpcEndpoints: ['https://evm-rpc-testnet.sei-apis.com'],
    eurcAddress: null,
    usdcAddress: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
    cctp: {
        domain: 16,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Sonic Mainnet chain definition
 * @remarks
 * This represents the official production network for the Sonic blockchain.
 */
const Sonic = defineChain({
    type: 'evm',
    chain: Blockchain.Sonic,
    name: 'Sonic',
    title: 'Sonic Mainnet',
    nativeCurrency: {
        name: 'Sonic',
        symbol: 'S',
        decimals: 18,
    },
    chainId: 146,
    isTestnet: false,
    explorerUrl: 'https://sonicscan.org/tx/{hash}',
    rpcEndpoints: ['https://rpc.soniclabs.com'],
    eurcAddress: null,
    usdcAddress: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',
    cctp: {
        domain: 13,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Sonic Testnet chain definition
 * @remarks
 * This represents the official test network for the Sonic blockchain.
 */
const SonicTestnet = defineChain({
    type: 'evm',
    chain: Blockchain.Sonic_Testnet,
    name: 'Sonic Testnet',
    title: 'Sonic Testnet',
    nativeCurrency: {
        name: 'Sonic',
        symbol: 'S',
        decimals: 18,
    },
    chainId: 14601,
    isTestnet: true,
    explorerUrl: 'https://testnet.sonicscan.org/tx/{hash}',
    rpcEndpoints: ['https://rpc.testnet.soniclabs.com'],
    eurcAddress: null,
    usdcAddress: '0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51',
    cctp: {
        domain: 13,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 1,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * Solana Mainnet chain definition
 * @remarks
 * This represents the official production network for the Solana blockchain.
 */
const Solana = defineChain({
    type: 'solana',
    chain: Blockchain.Solana,
    name: 'Solana',
    title: 'Solana Mainnet',
    nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
    },
    isTestnet: false,
    explorerUrl: 'https://solscan.io/tx/{hash}',
    rpcEndpoints: ['https://api.mainnet-beta.solana.com'],
    eurcAddress: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
    usdcAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cctp: {
        domain: 5,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: 'CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3',
                messageTransmitter: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
                confirmations: 32,
            },
            v2: {
                type: 'split',
                tokenMessenger: 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe',
                messageTransmitter: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
                confirmations: 32,
                fastConfirmations: 3,
            },
        },
    },
    kitContracts: {
        bridge: 'DFaauJEjmiHkPs1JG89A4p95hDWi9m9SAEERY1LQJiC3',
    },
});

/**
 * Solana Devnet chain definition
 * @remarks
 * This represents the development test network for the Solana blockchain.
 */
const SolanaDevnet = defineChain({
    type: 'solana',
    chain: Blockchain.Solana_Devnet,
    name: 'Solana Devnet',
    title: 'Solana Development Network',
    nativeCurrency: {
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
    },
    isTestnet: true,
    explorerUrl: 'https://solscan.io/tx/{hash}?cluster=devnet',
    eurcAddress: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
    usdcAddress: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    cctp: {
        domain: 5,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: 'CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3',
                messageTransmitter: 'CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd',
                confirmations: 32,
            },
            v2: {
                type: 'split',
                tokenMessenger: 'CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe',
                messageTransmitter: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
                confirmations: 32,
                fastConfirmations: 3,
            },
        },
    },
    kitContracts: {
        bridge: 'DFaauJEjmiHkPs1JG89A4p95hDWi9m9SAEERY1LQJiC3',
    },
    rpcEndpoints: ['https://api.devnet.solana.com'],
});

/**
 * Stellar Mainnet chain definition
 * @remarks
 * This represents the official production network for the Stellar blockchain.
 */
defineChain({
    type: 'stellar',
    chain: Blockchain.Stellar,
    name: 'Stellar',
    title: 'Stellar Mainnet',
    nativeCurrency: {
        name: 'Stellar Lumens',
        symbol: 'XLM',
        decimals: 7,
    },
    isTestnet: false,
    explorerUrl: 'https://stellar.expert/explorer/public/tx/{hash}',
    rpcEndpoints: ['https://horizon.stellar.org'],
    eurcAddress: 'EURC-GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2',
    usdcAddress: 'USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    cctp: null,
});

/**
 * Stellar Testnet chain definition
 * @remarks
 * This represents the official test network for the Stellar blockchain.
 */
defineChain({
    type: 'stellar',
    chain: Blockchain.Stellar_Testnet,
    name: 'Stellar Testnet',
    title: 'Stellar Test Network',
    nativeCurrency: {
        name: 'Stellar Lumens',
        symbol: 'XLM',
        decimals: 7,
    },
    isTestnet: true,
    explorerUrl: 'https://stellar.expert/explorer/testnet/tx/{hash}',
    rpcEndpoints: ['https://horizon-testnet.stellar.org'],
    eurcAddress: 'EURC-GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO',
    usdcAddress: 'USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    cctp: null,
});

/**
 * Sui Mainnet chain definition
 * @remarks
 * This represents the official production network for the Sui blockchain.
 */
defineChain({
    type: 'sui',
    chain: Blockchain.Sui,
    name: 'Sui',
    title: 'Sui Mainnet',
    nativeCurrency: {
        name: 'Sui',
        symbol: 'SUI',
        decimals: 9,
    },
    isTestnet: false,
    explorerUrl: 'https://suiscan.xyz/mainnet/tx/{hash}',
    rpcEndpoints: ['https://fullnode.mainnet.sui.io'],
    eurcAddress: null,
    usdcAddress: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    cctp: {
        domain: 8,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x2aa6c5d56376c371f88a6cc42e852824994993cb9bab8d3e6450cbe3cb32b94e',
                messageTransmitter: '0x08d87d37ba49e785dde270a83f8e979605b03dc552b5548f26fdf2f49bf7ed1b',
                confirmations: 1,
            },
        },
    },
});

/**
 * Sui Testnet chain definition
 * @remarks
 * This represents the official test network for the Sui blockchain.
 */
defineChain({
    type: 'sui',
    chain: Blockchain.Sui_Testnet,
    name: 'Sui Testnet',
    title: 'Sui Test Network',
    nativeCurrency: {
        name: 'Sui',
        symbol: 'SUI',
        decimals: 9,
    },
    isTestnet: true,
    explorerUrl: 'https://suiscan.xyz/testnet/tx/{hash}',
    rpcEndpoints: ['https://fullnode.testnet.sui.io'],
    eurcAddress: null,
    usdcAddress: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
    cctp: {
        domain: 8,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x31cc14d80c175ae39777c0238f20594c6d4869cfab199f40b69f3319956b8beb',
                messageTransmitter: '0x4931e06dce648b3931f890035bd196920770e913e43e45990b383f6486fdd0a5',
                confirmations: 1,
            },
        },
    },
});

/**
 * Unichain Mainnet chain definition
 * @remarks
 * This represents the official production network for the Unichain blockchain.
 */
const Unichain = defineChain({
    type: 'evm',
    chain: Blockchain.Unichain,
    name: 'Unichain',
    title: 'Unichain Mainnet',
    nativeCurrency: {
        name: 'Uni',
        symbol: 'UNI',
        decimals: 18,
    },
    chainId: 130,
    isTestnet: false,
    explorerUrl: 'https://unichain.blockscout.com/tx/{hash}',
    rpcEndpoints: ['https://rpc.unichain.org', 'https://mainnet.unichain.org'],
    eurcAddress: null,
    usdcAddress: '0x078D782b760474a361dDA0AF3839290b0EF57AD6',
    cctp: {
        domain: 10,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x4e744b28E787c3aD0e810eD65A24461D4ac5a762',
                messageTransmitter: '0x353bE9E2E38AB1D19104534e4edC21c643Df86f4',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * Unichain Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the Unichain blockchain.
 */
const UnichainSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.Unichain_Sepolia,
    name: 'Unichain Sepolia',
    title: 'Unichain Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Uni',
        symbol: 'UNI',
        decimals: 18,
    },
    chainId: 1301,
    isTestnet: true,
    explorerUrl: 'https://unichain-sepolia.blockscout.com/tx/{hash}',
    rpcEndpoints: ['https://sepolia.unichain.org'],
    eurcAddress: null,
    usdcAddress: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    cctp: {
        domain: 10,
        contracts: {
            v1: {
                type: 'split',
                tokenMessenger: '0x8ed94B8dAd2Dc5453862ea5e316A8e71AAed9782',
                messageTransmitter: '0xbc498c326533d675cf571B90A2Ced265ACb7d086',
                confirmations: 65,
            },
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * World Chain chain definition
 * @remarks
 * This represents the main network for the World Chain blockchain.
 */
const WorldChain = defineChain({
    type: 'evm',
    chain: Blockchain.World_Chain,
    name: 'World Chain',
    title: 'World Chain',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 480,
    isTestnet: false,
    explorerUrl: 'https://worldscan.org/tx/{hash}',
    rpcEndpoints: ['https://worldchain-mainnet.g.alchemy.com/public'],
    eurcAddress: null,
    usdcAddress: '0x79A02482A880bCe3F13E09da970dC34dB4cD24D1',
    cctp: {
        domain: 14,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cF5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * World Chain Sepolia chain definition
 * @remarks
 * This represents the test network for the World Chain blockchain.
 */
const WorldChainSepolia = defineChain({
    type: 'evm',
    chain: Blockchain.World_Chain_Sepolia,
    name: 'World Chain Sepolia',
    title: 'World Chain Sepolia',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 4801,
    isTestnet: true,
    explorerUrl: 'https://sepolia.worldscan.org/tx/{hash}',
    rpcEndpoints: [
        'https://worldchain-sepolia.drpc.org',
        'https://worldchain-sepolia.g.alchemy.com/public',
    ],
    eurcAddress: null,
    usdcAddress: '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88',
    cctp: {
        domain: 14,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa',
                messageTransmitter: '0xe737e5cebeeba77efe34d4aa090756590b1ce275',
                confirmations: 65,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * XDC Mainnet chain definition
 * @remarks
 * This represents the official production network for the XDC blockchain.
 * XDC is a Layer 1 blockchain specialized for DeFi and trading applications
 * with native orderbook and matching engine.
 */
const XDC = defineChain({
    type: 'evm',
    chain: Blockchain.XDC,
    name: 'XDC',
    title: 'XDC Mainnet',
    nativeCurrency: {
        name: 'XDC',
        symbol: 'XDC',
        decimals: 18,
    },
    chainId: 50,
    isTestnet: false,
    explorerUrl: 'https://xdcscan.io/tx/{hash}',
    rpcEndpoints: ['https://erpc.xinfin.network'],
    eurcAddress: null,
    usdcAddress: '0xfA2958CB79b0491CC627c1557F441eF849Ca8eb1',
    cctp: {
        domain: 18,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
                messageTransmitter: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
                confirmations: 3,
                fastConfirmations: 3,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_MAINNET,
    },
});

/**
 * XDC Apothem Testnet chain definition
 * @remarks
 * This represents the official test network for the XDC Network, known as Apothem.
 */
const XDCApothem = defineChain({
    type: 'evm',
    chain: Blockchain.XDC_Apothem,
    name: 'Apothem Network',
    title: 'Apothem Network',
    nativeCurrency: {
        name: 'TXDC',
        symbol: 'TXDC',
        decimals: 18,
    },
    chainId: 51,
    isTestnet: true,
    explorerUrl: 'https://testnet.xdcscan.com/tx/{hash}',
    rpcEndpoints: ['https://erpc.apothem.network'],
    eurcAddress: null,
    usdcAddress: '0xb5AB69F7bBada22B28e79C8FFAECe55eF1c771D4',
    cctp: {
        domain: 18,
        contracts: {
            v2: {
                type: 'split',
                tokenMessenger: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
                messageTransmitter: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
                confirmations: 3,
                fastConfirmations: 1,
            },
        },
    },
    kitContracts: {
        bridge: BRIDGE_CONTRACT_EVM_TESTNET,
    },
});

/**
 * ZKSync Era Mainnet chain definition
 * @remarks
 * This represents the official production network for the ZKSync Era blockchain.
 */
defineChain({
    type: 'evm',
    chain: Blockchain.ZKSync_Era,
    name: 'ZKSync Era',
    title: 'ZKSync Era Mainnet',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 324,
    isTestnet: false,
    explorerUrl: 'https://explorer.zksync.io/tx/{hash}',
    rpcEndpoints: ['https://mainnet.era.zksync.io'],
    eurcAddress: null,
    usdcAddress: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4',
    cctp: null,
});

/**
 * ZKSync Era Sepolia Testnet chain definition
 * @remarks
 * This represents the official test network for the ZKSync Era blockchain on Sepolia.
 */
defineChain({
    type: 'evm',
    chain: Blockchain.ZKSync_Sepolia,
    name: 'ZKSync Era Sepolia',
    title: 'ZKSync Era Sepolia Testnet',
    nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    chainId: 300,
    isTestnet: true,
    explorerUrl: 'https://sepolia.explorer.zksync.io/tx/{hash}',
    rpcEndpoints: ['https://sepolia.era.zksync.dev'],
    eurcAddress: null,
    usdcAddress: '0xAe045DE5638162fa134807Cb558E15A3F5A7F853',
    cctp: null,
});

/**
 * Base schema for common chain definition properties.
 * This contains all properties shared between EVM and non-EVM chains.
 */
const baseChainDefinitionSchema = z.object({
    chain: z.nativeEnum(Blockchain, {
        required_error: 'Chain enum is required. Please provide a valid Blockchain enum value.',
        invalid_type_error: 'Chain must be a valid Blockchain enum value.',
    }),
    name: z.string({
        required_error: 'Chain name is required. Please provide a valid chain name.',
        invalid_type_error: 'Chain name must be a string.',
    }),
    title: z.string().optional(),
    nativeCurrency: z.object({
        name: z.string(),
        symbol: z.string(),
        decimals: z.number(),
    }),
    isTestnet: z.boolean({
        required_error: 'isTestnet is required. Please specify whether this is a testnet.',
        invalid_type_error: 'isTestnet must be a boolean.',
    }),
    explorerUrl: z.string({
        required_error: 'Explorer URL is required. Please provide a valid explorer URL.',
        invalid_type_error: 'Explorer URL must be a string.',
    }),
    rpcEndpoints: z.array(z.string()),
    eurcAddress: z.string().nullable(),
    usdcAddress: z.string().nullable(),
    cctp: z.any().nullable(), // We'll accept any CCTP config structure
    kitContracts: z
        .object({
        bridge: z.string().optional(),
    })
        .optional(),
});
/**
 * Zod schema for validating EVM chain definitions specifically.
 * This schema extends the base schema with EVM-specific properties.
 *
 * @example
 * ```typescript
 * import { evmChainDefinitionSchema } from '@core/chains/validation'
 * import { Blockchain } from '@core/chains'
 *
 * const ethereumChain = {
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   name: 'Ethereum',
 *   chainId: 1,
 *   nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
 *   isTestnet: false,
 *   explorerUrl: 'https://etherscan.io/tx/{hash}',
 *   usdcAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
 *   eurcAddress: null,
 *   cctp: null
 * }
 *
 * const result = evmChainDefinitionSchema.safeParse(ethereumChain)
 * if (result.success) {
 *   console.log('EVM chain definition is valid')
 * } else {
 *   console.error('Validation failed:', result.error)
 * }
 * ```
 */
const evmChainDefinitionSchema = baseChainDefinitionSchema
    .extend({
    type: z.literal('evm'),
    chainId: z.number({
        required_error: 'EVM chains must have a chainId. Please provide a valid EVM chain ID.',
        invalid_type_error: 'EVM chain ID must be a number.',
    }),
})
    .strict(); //// Reject any additional properties not defined in the schema
/**
 * Zod schema for validating non-EVM chain definitions.
 * This schema extends the base schema with non-EVM specific properties.
 */
const nonEvmChainDefinitionSchema = baseChainDefinitionSchema
    .extend({
    type: z.enum([
        'algorand',
        'avalanche',
        'solana',
        'aptos',
        'near',
        'stellar',
        'sui',
        'hedera',
        'noble',
        'polkadot',
    ]),
})
    .strict(); // Reject any additional properties not defined in the schema
/**
 * Discriminated union schema for all chain definitions.
 * This schema validates different chain types based on their 'type' field.
 *
 * @example
 * ```typescript
 * import { chainDefinitionSchema } from '@core/chains/validation'
 * import { Blockchain } from '@core/chains'
 *
 * // EVM chain
 * chainDefinitionSchema.parse({
 *   type: 'evm',
 *   chain: Blockchain.Ethereum,
 *   chainId: 1,
 *   // ... other properties
 * })
 *
 * // Non-EVM chain
 * chainDefinitionSchema.parse({
 *   type: 'solana',
 *   chain: Blockchain.Solana,
 *   // ... other properties (no chainId)
 * })
 * ```
 */
const chainDefinitionSchema = z.discriminatedUnion('type', [
    evmChainDefinitionSchema,
    nonEvmChainDefinitionSchema,
]);
/**
 * Zod schema for validating chain identifiers.
 * This schema accepts either a string blockchain identifier, a Blockchain enum value,
 * or a full ChainDefinition object.
 *
 * @example
 * ```typescript
 * import { chainIdentifierSchema } from '@core/chains/validation'
 * import { Blockchain, Ethereum } from '@core/chains'
 *
 * // All of these are valid:
 * chainIdentifierSchema.parse('Ethereum')
 * chainIdentifierSchema.parse(Blockchain.Ethereum)
 * chainIdentifierSchema.parse(Ethereum)
 * ```
 */
z.union([
    z
        .string()
        .refine((val) => val in Blockchain, 'Must be a valid Blockchain enum value as string'),
    z.nativeEnum(Blockchain),
    chainDefinitionSchema,
]);
/**
 * Zod schema for validating bridge chain identifiers.
 *
 * This schema validates that the provided chain is supported for CCTPv2 bridging.
 * It accepts either a BridgeChain enum value, a string matching a BridgeChain value,
 * or a ChainDefinition for a supported chain.
 *
 * Use this schema when validating chain parameters for bridge operations to ensure
 * only CCTPv2-supported chains are accepted at runtime.
 *
 * @example
 * ```typescript
 * import { bridgeChainIdentifierSchema } from '@core/chains/validation'
 * import { BridgeChain, Chains } from '@core/chains'
 *
 * // Valid - BridgeChain enum value
 * bridgeChainIdentifierSchema.parse(BridgeChain.Ethereum)
 *
 * // Valid - string literal
 * bridgeChainIdentifierSchema.parse('Base_Sepolia')
 *
 * // Valid - ChainDefinition (validated by CCTP support)
 * bridgeChainIdentifierSchema.parse(Chains.Solana)
 *
 * // Invalid - Algorand is not in BridgeChain (throws ZodError)
 * bridgeChainIdentifierSchema.parse('Algorand')
 * ```
 *
 * @see {@link BridgeChain} for the enum of supported chains.
 */
z.union([
    z.string().refine((val) => val in BridgeChain, (val) => ({
        message: `Chain "${val}" is not supported for bridging. Only chains in the BridgeChain enum support CCTPv2 bridging.`,
    })),
    chainDefinitionSchema.refine((chainDef) => chainDef.chain in BridgeChain, (chainDef) => ({
        message: `Chain "${chainDef.name}" (${chainDef.chain}) is not supported for bridging. Only chains in the BridgeChain enum support CCTPv2 bridging.`,
    })),
]);

export { Arbitrum, ArbitrumSepolia, ArcTestnet, Avalanche, AvalancheFuji, Base, BaseSepolia, BridgeChain, Codex, CodexTestnet, Ethereum, EthereumSepolia, HyperEVM, HyperEVMTestnet, Ink, InkTestnet, Linea, LineaSepolia, Monad, MonadTestnet, Optimism, OptimismSepolia, Plume, PlumeTestnet, Polygon, PolygonAmoy, Sei, SeiTestnet, Solana, SolanaDevnet, Sonic, SonicTestnet, Unichain, UnichainSepolia, WorldChain, WorldChainSepolia, XDC, XDCApothem };
//# sourceMappingURL=chains.mjs.map
