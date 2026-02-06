# CCTPv2 Bridging Provider

<div align="center">

[![npm version](https://badge.fury.io/js/@circle-fin%2Fprovider-cctp-v2.svg)](https://badge.fury.io/js/@circle-fin%2Fprovider-cctp-v2)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Discord](https://img.shields.io/discord/473781666251538452?label=Discord&logo=discord)](https://discord.com/invite/buildoncircle)

**Circle's Cross-Chain Transfer Protocol v2 provider for Bridge Kit**

_Native USDC bridging across 34 chains using Circle's battle-tested protocols._

</div>

## Table of Contents

- [CCTPv2 Bridging Provider](#cctpv2-bridging-provider)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Why CCTPv2 Provider?](#why-cctpv2-provider)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
    - [Option 1: With Bridge Kit (Recommended)](#option-1-with-bridge-kit-recommended)
    - [Option 2: Direct Provider Usage](#option-2-direct-provider-usage)
  - [Features](#features)
  - [Supported Chains \& Routes](#supported-chains--routes)
    - [Mainnet Chains](#mainnet-chains)
    - [Testnet Chains](#testnet-chains)
  - [Usage Examples](#usage-examples)
    - [Basic Bridge Operation](#basic-bridge-operation)
    - [Route Validation](#route-validation)
    - [Bridge Configurations](#bridge-configurations)
  - [Error Handling](#error-handling)
  - [Bridge Process](#bridge-process)
  - [Integration with Bridge Kit](#integration-with-bridge-kit)
  - [API Reference](#api-reference)
    - [Core Methods](#core-methods)
    - [Transfer Parameters](#transfer-parameters)
  - [Development](#development)
  - [Contributing](#contributing)
  - [License](#license)

## Overview

The CCTPv2 Bridging Provider is a strongly-typed implementation of Circle's Cross-Chain Transfer Protocol (CCTP) version 2 that enables **native USDC bridging** between 34+ supported blockchain networks.

While primarily designed to power the [Bridge Kit](https://www.npmjs.com/package/@circle-fin/bridge-kit), this provider can also be used **directly in applications** that need fine-grained control over the CCTP transfer process or want to integrate CCTP without the full Stablecoin Kits framework.

### Why CCTPv2 Provider?

- **🔒 Circle's official protocol**: Uses Circle's native CCTP infrastructure for maximum security
- **⚡ 34 chain support**: Enables bridging across all CCTPv2-supported networks
- **🎯 Native USDC**: Bridges actual USDC tokens, not wrapped or synthetic versions
- **🔧 Type-safe operations**: Built with TypeScript strict mode and comprehensive validation
- **🛠️ Direct integration**: Use standalone or with custom orchestration logic

## Installation

```bash
npm install @circle-fin/provider-cctp-v2
# or
yarn add @circle-fin/provider-cctp-v2
```

> **Note**: This provider is included by default with the [Bridge Kit](https://www.npmjs.com/package/@circle-fin/bridge-kit). You can import this provider if you need to do a custom CCTP integration.

## Quick Start

### Option 1: With Bridge Kit (Recommended)

```typescript
import { BridgeKit } from '@circle-fin/bridge-kit'

// Provider included by default
const kit = new BridgeKit()

const result = await kit.bridge({
  from: { adapter: sourceAdapter, chain: 'Ethereum' },
  to: { adapter: destAdapter, chain: 'Base' },
  amount: '100.50',
})
```

### Option 2: Direct Provider Usage

```typescript
import { CCTPV2BridgingProvider } from '@circle-fin/provider-cctp-v2'
import { ViemAdapter } from '@circle-fin/adapter-viem-v2'
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet, base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount(process.env.PRIVATE_KEY)
const provider = new CCTPV2BridgingProvider()

// Create adapters
const sourceAdapter = new ViemAdapter({
  publicClient: createPublicClient({ chain: mainnet, transport: http() }),
  walletClient: createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  }),
})

const destAdapter = new ViemAdapter({
  publicClient: createPublicClient({ chain: base, transport: http() }),
  walletClient: createWalletClient({ account, chain: base, transport: http() }),
})

// Check route support
const isSupported = provider.supportsRoute('Ethereum', 'Base', 'USDC')

// Get bridge estimate
const estimate = await provider.estimate({
  from: { adapter: sourceAdapter, chain: 'Ethereum' },
  to: { adapter: destAdapter, chain: 'Base' },
  amount: '100.50',
  config: { transferSpeed: 'FAST' },
})

// Execute bridge operation with custom logic
const result = await provider.bridge({
  from: { adapter: sourceAdapter, chain: 'Ethereum' },
  to: { adapter: destAdapter, chain: 'Base' },
  amount: '100.50',
  config: { transferSpeed: 'FAST' },
})
```

## Features

- ✅ **Native USDC bridging** - Move real USDC between supported networks
- ✅ **CCTP v2 integration** - Direct integration with Circle's CCTP v2 protocol
- ✅ **Comprehensive validation** - Route validation and parameter checking
- ✅ **Multi-chain support** - Works across all 34 CCTPv2-supported chains
- ✅ **Type safety** - Full TypeScript support with detailed error handling
- ✅ **Bridge speeds** - Support for both FAST and SLOW bridge configurations

## Supported Chains & Routes

The provider supports **544 total bridge routes** across these chains:

### Mainnet Chains

**Arbitrum**, **Avalanche**, **Base**, **Codex**, **Ethereum**, **HyperEVM**, **Ink**, **Linea**, **OP Mainnet**, **Plume**, **Polygon PoS**, **Sei**, **Solana**, **Sonic**, **Unichain**, **World Chain**, **XDC**

### Testnet Chains

**Arbitrum Sepolia**, **Avalanche Fuji**, **Base Sepolia**, **Codex Testnet**, **Ethereum Sepolia**, **HyperEVM Testnet**, **Ink Testnet**, **Linea Sepolia**, **OP Sepolia**, **Plume Testnet**, **Polygon PoS Amoy**, **Sei Testnet**, **Solana Devnet**, **Sonic Testnet**, **Unichain Sepolia**, **World Chain Sepolia**, **XDC Apothem**

## Error Handling

The provider implements thoughtful error handling for different scenarios:

```typescript
// Using the same kit and adapters from the examples above
const params = {
  from: { adapter: sourceAdapter, chain: 'Ethereum' },
  to: { adapter: destAdapter, chain: 'Base' },
  amount: '100.50',
}

try {
  const result = await kit.bridge(params)

  if (result.state === 'success') {
    console.log('Bridge completed successfully!')

    // Display explorer URLs for each step
    result.steps.forEach((step) => {
      if (step.explorerUrl) {
        console.log(`${step.name}: ${step.explorerUrl}`)
      }
    })
  } else {
    // Handle partial completion
    const successfulSteps = result.steps.filter((s) => s.state === 'success')
    const failedStep = result.steps.find((s) => s.state === 'error')

    console.log('Successful steps:', successfulSteps)
    console.log('Failed at:', failedStep)
  }
} catch (error) {
  // Handle validation or configuration errors
  console.error('Bridge failed:', error.message)
}
```

## Bridge Process

The CCTPv2 provider handles the complete cross-chain bridging flow:

1. **Approval** - Approve USDC spending (if needed)
2. **Burn** - Burn USDC on source chain via `depositForBurn`
3. **Attestation** - Fetch Circle's attestation for the burn
4. **Mint** - Mint USDC on destination chain using attestation

Each step is tracked and can be monitored through the Provider's event system. Transaction details for each step include explorer URLs for easy verification on block explorers.

## Integration with Bridge Kit

This provider is designed specifically for the [Bridge Kit](https://www.npmjs.com/package/@circle-fin/bridge-kit):

```typescript
import { BridgeKit } from '@circle-fin/bridge-kit'
import { ViemAdapter } from '@circle-fin/adapter-viem-v2'
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet, base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount(process.env.PRIVATE_KEY)

// Provider is included by default
const kit = new BridgeKit()

const sourceAdapter = new ViemAdapter({
  publicClient: createPublicClient({ chain: mainnet, transport: http() }),
  walletClient: createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  }),
})

const destAdapter = new ViemAdapter({
  publicClient: createPublicClient({ chain: base, transport: http() }),
  walletClient: createWalletClient({ account, chain: base, transport: http() }),
})

// Monitor transfer events
kit.on('*', (event) => console.log('Event:', event)) // subscribe to all events
kit.on('approve', (event) => console.log('Approval:', event.values.txHash))
kit.on('burn', (event) => console.log('Burn:', event.values.txHash))
kit.on('fetchAttestation', (event) =>
  console.log('Attestation:', event.values.data),
)
kit.on('mint', (event) => console.log('Mint:', event.values.txHash))

// Execute transfer
const result = await kit.bridge({
  from: { adapter: sourceAdapter, chain: 'Ethereum' },
  to: { adapter: destAdapter, chain: 'Base' },
  amount: '25.0',
})
```

## Development

This package is part of the Stablecoin Kits monorepo.

```bash
# Build
nx build @circle-fin/provider-cctp-v2

# Test
nx test @circle-fin/provider-cctp-v2
```

## License

This project is licensed under the Apache 2.0 License. Contact [support](https://help.circle.com/s/submit-ticket) for details.

---

<div align="center">

**Ready for cross-chain bridging?**

[Join Discord](https://discord.com/invite/buildoncircle) •
[Visit our Help-Desk](https://help.circle.com/s/submit-ticket)

_Built with ❤️ by Circle_

</div>
