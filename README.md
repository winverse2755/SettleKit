# SettleKit

**Agentic Cross-Chain Settlement SDK for DeFi**

SettleKit is a TypeScript SDK that enables agents to execute complex cross-chain DeFi actions as a single deterministic settlement flow.

Instead of asking users to manually bridge, swap, and supply assets across multiple chains and interfaces, SettleKit turns these steps into a programmable **settlement recipe** that can be executed automatically by software.

**Verifiable Risk & Compliance Layer for Agentic Cross-Chain DeFi**

SettleKit Risk Guard extends SettleKit with a live risk monitoring and compliance system powered by Chainlink CRE. Before any settlement executes, a CRE Workflow evaluates real-time risk signals and either clears or blocks execution. Every decision is auditable, every outcome is traceable.

---

### The Problem

Agentic DeFi is coming — software that bridges and deploys capital across chains without user intervention. But agents executing financial flows autonomously have no safety net today. There is no standard way to evaluate whether a settlement is safe before it executes, and no verifiable record of the risk decisions made along the way.

---

### What It Does

SettleKit Risk Guard adds four things on top of the base SettleKit SDK:

**1. CRE Risk Workflow**
Before any settlement executes, a Chainlink CRE Workflow fans out to multiple data sources in parallel — Chainlink Data Feeds for verifiable oracle prices, the Uniswap v4 PoolManager for live pool health, and the Circle CCTP API for bridge status. It evaluates five risk checks and emits a signed report: `APPROVED`, `WARNING`, or `BLOCKED`. The Deterministic Executor only fires on `APPROVED`.

**2. Risk Explorer**
Every settlement gets a public URL showing its full execution trace, oracle data consumed, each risk check result, CRE workflow output, and a Tenderly Virtual TestNet explorer link for the underlying transaction. Every claim is backed by a clickable transaction link.

**3. Telegram Bot**
Real-time alerts when a settlement is flagged. Operators can query status, run dry-runs, and manually override warnings — all from Telegram.

**4. 24h Pool Monitoring**
A scheduled CRE Workflow scans active Uniswap v4 positions every 24 hours. If the current pool liquidity falls below threshold, the system automatically rebalances to the deepest available pool and alerts the operator via Telegram.

---

### Architecture

```
Agent / User
     │
     ▼
Execution Planner (SettleKit SDK)
     │
     ▼
CRE Risk Workflow (Chainlink)
  ├── Chainlink Data Feeds (USDC/USD, ETH/USD)
  ├── Uniswap v4 PoolManager (via Tenderly VNet RPC)
  └── Circle CCTP API (bridge status)
     │
     ▼
Risk Report { APPROVED | WARNING | BLOCKED }
     │
     ├──► Risk Explorer (public settlement URL + Tenderly tx link)
     └──► Telegram Bot (push alert if WARNING or BLOCKED)
     │
     ▼ (APPROVED only)
Deterministic Executor
  ├── Bridge: Base Sepolia → Unichain Sepolia via CCTP
  └── Deposit: Uniswap v4 PoolManager on Unichain Sepolia
     │
     ▼
Tenderly Virtual TestNet (transaction recorded + explorer link generated)
```

---

### Chainlink Integration

| Component | Chainlink Service | File |
|---|---|---|
| Oracle price feeds | Chainlink Data Feeds (USDC/USD, ETH/USD) | [`workflow/steps/fetchOracleData.ts`](./workflow/steps/fetchOracleData.ts) |
| Risk orchestration | Chainlink Runtime Environment (CRE) | [`workflow/workflow.yaml`](./workflow/workflow.yaml) |
| 24h pool monitoring | CRE scheduled workflow | [`workflow/monitoring.yaml`](./workflow/monitoring.yaml) |
| HTTP data fetches | CRE HTTP capability | [`workflow/steps/fetchPoolHealth.ts`](./workflow/steps/fetchPoolHealth.ts) |

> **Note:** Unichain Sepolia is not yet supported by CRE's native EVM capability (`evm:ChainSelector`). Pool health reads use CRE's HTTP capability with direct JSON-RPC calls to the Tenderly Virtual TestNet RPC endpoint as a workaround. This is documented inline in `fetchPoolHealth.ts`.

---

### Risk Checks

Every settlement is evaluated against five checks before execution:

| Check | Description | Severity |
|---|---|---|
| `slippage` | Simulated slippage vs configured max | Critical |
| `liquidity` | Pool liquidity depth vs minimum required | Critical |
| `bridgeDelay` | CCTP estimated confirmation time vs max | Info |
| `priceDeviation` | Oracle price vs DEX execution price | Critical |
| `priceStaleness` | Oracle price age vs max staleness threshold | Info |

> `priceDeviation` is skipped on testnet chains (Base Sepolia, Unichain Sepolia) as testnet pools have no reliable market price. This is noted explicitly in the risk report output.

---

### Telegram Bot Commands

| Command | Description |
|---|---|
| `/simulate <amount> <from_chain> <to_pool>` | Dry-run CRE risk workflow, returns report + Tenderly sim link |
| `/status <settlementId>` | Current state of an in-flight settlement |
| `/alerts on\|off` | Toggle real-time push alerts |
| `/approve <settlementId>` | Manually clear a WARNING-status settlement |
| `/history` | Last 5 settlements with status and explorer links |
| `/positions` | All active pool positions with latest monitoring status |
| `/rebalance <positionId>` | Manually trigger rebalance (fallback if auto-rebalance fails) |
| `/fork status` | Confirm both Tenderly Virtual TestNets are live and synced |

---

### Tenderly Integration

Tenderly Virtual TestNets fork Base Sepolia and Unichain Sepolia to provide a controlled execution environment with real testnet state. Every settlement execution produces a Tenderly explorer transaction link that is stored in the Risk Explorer and surfaced in Telegram alerts.

**Virtual TestNet Explorer:**
- Base Sepolia fork: `https://dashboard.tenderly.co/winverse/project/testnet/eec39e2c-ca1c-491a-aa58-c05a1ccf80d3`
- Unichain Sepolia fork: `https://dashboard.tenderly.co/winverse/project/testnet/22cbc0df-919d-4cdc-927b-436480a7129f`

---

### Tech Stack

- TypeScript SDK
- Chainlink CRE (Runtime Environment)
- Chainlink Data Feeds
- Tenderly Virtual TestNets
- viem
- Circle CCTP (Base Sepolia → Unichain Sepolia)
- Uniswap v4 PoolManager
- Node.js / Express backend
- SQLite
- Telegram Bot API
- ngrok (local development)

---

### Getting Started

#### Prerequisites

```bash
node >= 18
npm >= 9
cre-cli installed: npm install -g @chainlink/cre-cli
```

#### Installation

```bash
git clone https://github.com/your-repo/settlekit-risk-guard
cd settlekit-risk-guard
npm install
```

#### Environment Setup

```bash
cp .env.example .env
```

Fill in the following variables:

```env
PRIVATE_KEY=0x...
TENDERLY_BASE_SEPOLIA_RPC=https://virtual.base-sepolia.eu.rpc.tenderly.co/<your-id>
TENDERLY_UNICHAIN_SEPOLIA_RPC=https://virtual.astrochain-sepolia.eu.rpc.tenderly.co/<your-id>
TELEGRAM_BOT_TOKEN=...
WEBHOOK_URL=https://<your-ngrok-or-deployed-url>/webhook
```

#### Run the Backend

```bash
npm run dev
```

#### Run the CRE Workflow Simulation

```bash
cd workflow
cre workflow simulate --config config.yaml --workflow workflow.yaml --input test-input.json
```

#### Run the Telegram Bot

```bash
npm run bot
```

---

### Testnet Proof

**Tenderly Virtual TestNet explorer (Risk Guard execution):**
[View on Tenderly](https://dashboard.tenderly.co/winverse/project/testnet/22cbc0df-919d-4cdc-927b-436480a7129f/tx/0x8fb8a4bc10191fc450338f72f67daf7072e1214ad54caa7ec35f4c3b100e4e62)

---

### Project Structure

```
settlekit-risk-guard/
├── workflow/
│   ├── workflow.yaml          # CRE risk check workflow
│   ├── monitoring.yaml        # CRE 24h monitoring workflow
│   ├── config.yaml            # Workflow configuration
│   ├── test-input.json        # Hardcoded test recipe for simulation
│   └── steps/
│       ├── fetchOracleData.ts       # Chainlink Data Feeds
│       ├── fetchPoolHealth.ts       # Uniswap v4 pool via Tenderly RPC
│       ├── fetchBridgeStatus.ts     # Circle CCTP API
│       ├── evaluateRisk.ts          # Risk threshold evaluation
│       └── emitReport.ts            # Report construction + webhook emit
├── backend/
│   ├── server.ts              # Express server + endpoints
│   ├── executor.ts            # SettleKit deterministic executor
│   ├── db.ts                  # SQLite store
│   └── telegram.ts            # Telegram bot + alert handler
├── frontend/
│   └── ...                    # Risk Explorer UI
├── .env.example
└── README.md
```

---

### Vision

Future financial apps will not ask users to bridge and deposit manually. Agents will do it for them. SettleKit Risk Guard is the compliance layer that makes autonomous cross-chain execution safe, auditable, and verifiable by default — with Chainlink CRE as the orchestration spine that ties it all together.

---

### License

MIT