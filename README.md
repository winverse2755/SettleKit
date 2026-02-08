# SettleKit

**Agentic Cross-Chain Settlement SDK for DeFi**

SettleKit is a TypeScript SDK that enables agents to execute complex cross-chain DeFi actions as a single deterministic settlement flow.

Instead of asking users to manually bridge, swap, and supply assets across multiple chains and interfaces, SettleKit turns these steps into a programmable **settlement recipe** that can be executed automatically by software.

---

## 🧠 The Idea

Modern DeFi requires users to:

1. Bridge assets across chains
2. Swap tokens on DEXs
3. Interact with lending markets

SettleKit abstracts this into a **machine-to-machine financial pipeline**.

An agent expresses *settlement intent*.  
SettleKit plans, simulates risk, and deterministically executes the entire cross-chain flow.

---

## 🏗 Architecture

![SettleKit Architecture](./architecture-diagram.png)

---

## ⚙️ Current MVP Flow (Implemented)

**USDC on Base → Arc (via CCTP) → Unichain → Uniswap v4 swap**

This happens through the following internal components:

### 1. Execution Planner
Transforms user/agent intent into a **settlement recipe**.

### 2. Risk Simulator
Simulates the route before execution and produces a risk report.

### 3. Deterministic Executor
Executes every step across chains and protocols without user intervention.

---

## 🌉 Why Arc

Arc is treated as a **USDC Liquidity Hub**, not a bridge.

By leveraging Circle CCTP through Arc:

- USDC moves cleanly across chains
- Capital routing becomes part of the execution logic
- No fragmented bridging UX
- Predictable fees and fast finality

Arc becomes the **settlement layer** of the system.

---

## 🦄 Why Uniswap v4

Uniswap v4 is used as a **programmable execution primitive**.

SettleKit interacts directly with pools as part of the settlement pipeline, turning swaps into machine-driven financial actions instead of UI operations.

Uniswap becomes the **execution layer**.

---

## 🔮 Planned Next Step (Not Yet Implemented)

### Morpho Integration

Morpho is planned as the final capital deployment step where assets will be supplied automatically after routing and swapping are complete.

This integration is part of the future roadmap and is not included in the current MVP.

---

## 🖥 Frontend (Planned)

A user-facing frontend is planned to visualize settlement intent, risk reports, and execution steps.

The current MVP focuses entirely on the SDK and agent-driven backend execution.

---

## 🧩 Key Concept: Settlement Recipe

Bridge + Swap (and future Supply) are modeled as a single composable pipeline.

This allows agents to reason about cross-chain capital movement as if it were a single system.

---

## 🛠 Tech Stack

- TypeScript SDK
- viem (wallet & public clients)
- Circle CCTP
- Arc Testnet
- Base Sepolia
- Unichain Testnet
- Uniswap v4

---

## 🚀 What This Demonstrates

SettleKit shows how:

- Arc can be used as a cross-chain liquidity hub
- Uniswap v4 can act as machine-to-machine execution infrastructure
- Agents can orchestrate full DeFi flows without user micromanagement

This is **agentic finance built on real protocols**.

---

## 🔮 Vision

Future financial apps will not ask users to bridge and swap manually.

Agents will do it for them.

SettleKit is the SDK that makes this possible.
