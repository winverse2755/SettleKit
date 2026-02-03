# SettleKit: Testnet Transaction Evidence

## Arc Cross-Chain Flow (Base → Arc → Unichain)

### 1. Base Sepolia → Arc Testnet
**Bridge Kit Transaction:**
- Approve: https://sepolia.basescan.org/tx/0x03a76ad73662193910385877c89e3b7fcde81f177041ef2db07c1ffe566675d0
- Burn: https://sepolia.basescan.org/tx/0x68cbcf64141beac067bec9f63ed72864692714239010c0dc8f388e9356a81829
- Mint: https://testnet.arcscan.app/tx/0x5333518da305ccca9f25b52b7b73dcbae6149ef8d46d7feb9305386f4fe2ed1d
- Amount: 5 USDC

### 2. Arc Testnet → Unichain Sepolia
**Bridge Kit Transaction:**
- Approve: https://testnet.arcscan.app/tx/0x5b6bb4efe716775912a0c026be562050559d6e2a07f1d2770084df82c4728b9d
- Burn: https://testnet.arcscan.app/tx/0xcc2967b9f34aca22c46d9ca8db88d5789ca9fed11a63f9f9aac2d7379f414dff
- Mint: https://unichain-sepolia.blockscout.com/tx/0xdc1dc4930849494603bc7c76c6a729808ae39fca0d5833a5f39abe563443a97f
- Amount: 3 USDC

## Uniswap v4 Infrastructure

### Pool Initialization
- Pool: USDC/WETH (0.3% fee, tick spacing 60)
- Contract: 0x00b036b58a818b1bc34d502d3fe730db729e62ac (PoolManager)
- Status: Initialized and ready for swaps

### Agent Evaluation
- Risk simulation implemented
- Policy-based decision making
- Ready for autonomous execution

## Summary
✅ Complete cross-chain USDC flow demonstrated
✅ Arc as liquidity hub proven
✅ Uniswap v4 infrastructure ready
✅ Agent framework implemented