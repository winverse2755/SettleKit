# @circle-fin/adapter-viem-v2

## 1.4.0

### Minor Changes

- Monad chain support added

  Monad mainnet and testnet are now supported for cross-chain USDC transfers. Use `'Monad'` or `'Monad_Testnet'` as chain identifiers in your bridge operations.

## 1.3.0

### Minor Changes

- Add `native.balanceOf` action to query native token balances (ETH, SOL, etc.)
  - Added `NativeActionMap` with `balanceOf` action to check native token balance for any wallet address
  - Added abstract `readNativeBalance(address, chain)` method to base adapters
  - Implemented `readNativeBalance` in all concrete adapters (Viem, Ethers, Solana, SolanaKit)
  - Registered `native.balanceOf` action handlers for EVM and Solana chains
  - Balance reads are gas-free operations returning balance as string (wei for EVM, lamports for Solana)

### Patch Changes

- **Faster balance and allowance checks**: Read-only operations like checking token balances or allowances no longer require wallet network switching. This means no wallet popups asking for permission to switch networks, resulting in quicker responses and a smoother user experience.

## 1.2.0

### Minor Changes

- Clearer viem factory names eliminate aliasing when using multiple adapters. Prefer `createViemAdapterFromProvider` and `createViemAdapterFromPrivateKey` over the deprecated generic `createAdapterFromProvider` and `createAdapterFromPrivateKey`. Existing code works unchanged.

### Patch Changes

- Fixed an issue where custom RPC URLs were not fully respected in Viem adapter, ensuring users can now properly configure alternative RPC endpoints.
- Validation errors now use standardized error codes for consistent error handling. All validation failures return the same `KitError` structure as other SDK errors.

  **Migration:** If you're catching validation errors, update your error handling:
  - Check `error.code === 1098` instead of `instanceof ValidationError`
  - Access details via `error.cause?.trace?.validationErrors` instead of `error.errors`

  The legacy `ValidationError` class remains available for backward compatibility.

## 1.1.1

### Patch Changes

- Fixed adapter `getAddress()` types to match function logic by requiring a `chain` parameter, and updated documentation accordingly.
- Improved error handling with more informative and consistent error messages.

  Errors now include:
  - Specific error codes for programmatic handling
  - Error type categorization (BALANCE, ONCHAIN, RPC, NETWORK)
  - Recoverability information (FATAL vs RETRYABLE)
  - Clearer error messages with chain context
  - Original error details preserved for debugging

- Fixed bug where tokens could be burned when bridging to unsupported chains. Bridge operations now fail immediately if the adapter doesn't support the source or destination chain, before any tokens are approved or burned. Error messages now clearly list all supported chains when an unsupported chain is used, and chain validation errors use the correct `INVALID_CHAIN` error code instead of `UNSUPPORTED_ROUTE`.

## 1.1.0

### Minor Changes

- Improves static gas estimate values for contract calls. Updates adapters' `prepare()` method so that transaction simulation is now performed only during `execute()`, not during `estimate()`. Adds an optional fallback parameter to `estimate()` for cases where gas estimation fails.

### Patch Changes

- Fix CommonJS compatibility by correcting file extensions and package exports. This resolves a "ReferenceError: require is not defined" error that occurred when using packages in CommonJS projects with ts-node.

- Fixes an important bug affecting developer-controlled adapter scenarios (such as when using Fireblocks or Circle Wallets). Previously, these adapters would mistakenly attempt to use the connected wallet's account during contract execution, which could cause failures if no user wallet was connected. With this update, developer-controlled adapters now correctly use the address specified in your operation (as a JSON-RPC account), ensuring API-based signing services work as intended. User-controlled adapters continue to use the connected wallet account as before. If you use programmatic signing (such as MPC or custody APIs), this update resolves issues with transaction execution and integration with non-wallet-based flows.

## 1.0.1

### Patch Changes

- Add support for Arc Testnet chain definition. Arc is Circle's EVM-compatible Layer-1 blockchain designed for stablecoin finance and asset
  tokenization, featuring USDC as the native gas token and sub-second finality via the Malachite BFT consensus engine.
- Improve error messages for developer-controlled address contexts. Calling `getAddress()` on an adapter configured with `addressContext: 'developer-controlled'` now throws a clear error explaining that addresses must be provided explicitly in the operation context.
- Update Sonic Testnet chain definition to canonical network. The `SonicTestnet` chain definition now points to the official Sonic Testnet (chainId: 14601) instead of the deprecated Sonic Blaze Testnet (chainId: 57054). The RPC endpoint has been updated to `https://rpc.testnet.soniclabs.com`, the display name simplified to "Sonic Testnet", and the USDC contract address updated to the new deployment.

  **Breaking Changes:**
  - **Chain ID:** 57054 → 14601
  - **RPC Endpoint:** `https://rpc.blaze.soniclabs.com` → `https://rpc.testnet.soniclabs.com`
  - **USDC Address:** `0xA4879Fed32Ecbef99399e5cbC247E533421C4eC6` → `0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51`

  **Migration:** If you were using `SonicTestnet`, your application will automatically connect to the new network upon upgrading. Any accounts, contracts, or transactions on the old Blaze testnet (chainId: 57054) will need to be recreated on the new testnet.

## 1.0.0

### Major Changes

- # Viem v2 Adapter 1.0.0 Release 🎉

  Modern EVM blockchain adapter built on viem v2 - providing cutting-edge EVM integration with superior performance, type safety, and developer experience.

  ## 🚀 Modern EVM Features
  - **Viem v2 Integration**: Built on the latest viem with best-in-class performance
  - **Superior Type Safety**: Enhanced TypeScript support with viem's advanced type system
  - **Optimized Performance**: Faster RPC calls and improved caching mechanisms
  - **Modern Architecture**: Clean, composable APIs following modern web3 patterns

  ## 🔗 Advanced Network Support
  - **All EVM Networks**: Comprehensive support for Ethereum and EVM-compatible chains
  - **Built-in Chain Definitions**: Pre-configured support for major networks
  - **Custom Chain Support**: Easy configuration for custom or private networks
  - **Network Switching**: Seamless chain switching with automatic configuration

  ## 💼 Flexible Address Management

  **User-Controlled Adapters**
  - Wallet integration with automatic address resolution
  - Support for modern wallet standards and connection methods
  - Real-time account and network change detection

  **Developer-Controlled Adapters**
  - Private key-based signing for server applications
  - Deterministic address management for automated workflows
  - Secure key handling with viem's security best practices

  ```typescript
  // User-controlled adapter with wallet
  const adapter = createAdapterFromWallet({
    walletClient: walletClient,
  })

  // Developer-controlled adapter with private key
  const adapter = createViemAdapterFromPrivateKey({
    privateKey: '0x...',
  })
  ```

  ## ⚡ Performance Optimizations
  - **Efficient RPC Management**: Optimized RPC client with intelligent caching
  - **Batch Operations**: Support for batched RPC calls to reduce latency
  - **Smart Gas Estimation**: Advanced gas estimation with minimal overhead
  - **Connection Pooling**: Efficient connection management for high-throughput applications

  ## 🔐 Enhanced Security
  - **Viem Security Model**: Leverages viem's security-first design principles
  - **Type-Safe Transactions**: Compile-time validation of transaction parameters
  - **Secure Key Management**: Best-practice key handling and signing flows
  - **Comprehensive Validation**: Runtime validation with detailed error reporting

  ## 🛠️ Developer Experience
  - **Modern TypeScript**: Full TypeScript support with advanced type inference
  - **Rich Documentation**: Comprehensive JSDoc with practical examples
  - **Intuitive APIs**: Clean, predictable interfaces following viem conventions
  - **Excellent Tooling**: Superior IDE support and debugging capabilities

  ## 🌟 Viem Advantages
  - **Tree Shaking**: Optimized bundle sizes with excellent tree shaking support
  - **Modular Design**: Use only the features you need for minimal footprint
  - **Active Development**: Built on the rapidly evolving viem ecosystem
  - **Community Support**: Backed by the growing viem community and ecosystem

  This adapter represents the future of EVM integration, providing developers with the most modern and efficient tools for cross-chain USDC transfers while maintaining the highest standards of security and reliability.
