/**
 * SettleKit Backend Server
 * 
 * Provides three endpoints:
 * - POST /trigger - Triggers a new settlement via CRE workflow
 * - POST /webhook - Receives risk reports from CRE workflow
 * - GET /settlement/:id - Retrieves settlement status and details
 */

import "dotenv/config";
import express, { type Request, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  initDatabase,
  createSettlement,
  getSettlement,
  getSettlementByRecipeId,
  updateSettlementStatus,
  getAllSettlements,
  closeDatabase,
} from "./db.js";
import { getExecutor } from "./executor.js";
import type {
  SettlementIntent,
  WebhookPayload,
  ExecutorSignal,
  TriggerResponse,
  WebhookResponse,
  SettlementResponse,
  RiskReport,
} from "./types.js";

const PORT = process.env.PORT || 3001;
const CRE_WORKFLOW_URL = process.env.CRE_WORKFLOW_URL;

const app = express();
app.use(express.json());

// Initialize database
initDatabase();

/**
 * POST /trigger
 * 
 * Triggers a new settlement workflow.
 * Creates a pending settlement record and optionally forwards to CRE workflow.
 */
app.post("/trigger", async (req: Request, res: Response) => {
  console.log("\n[/trigger] Received settlement request");
  
  try {
    const intent = req.body as SettlementIntent;
    
    // Validate required fields
    if (!intent.sourceChain || !intent.targetChain || !intent.amount) {
      res.status(400).json({
        error: "Missing required fields: sourceChain, targetChain, amount",
      });
      return;
    }
    
    // Generate unique settlement ID
    const settlementId = uuidv4();
    console.log(`[/trigger] Created settlement: ${settlementId}`);
    
    // Store in database
    const settlement = createSettlement(settlementId, intent);
    console.log(`[/trigger] Settlement stored with status: ${settlement.status}`);
    
    // Optionally forward to CRE workflow if URL is configured
    if (CRE_WORKFLOW_URL) {
      console.log(`[/trigger] Forwarding to CRE workflow: ${CRE_WORKFLOW_URL}`);
      try {
        const creResponse = await fetch(CRE_WORKFLOW_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(intent),
        });
        console.log(`[/trigger] CRE response status: ${creResponse.status}`);
      } catch (error) {
        console.error(`[/trigger] Failed to forward to CRE:`, error);
      }
    }
    
    const response: TriggerResponse = {
      settlementId,
      status: settlement.status,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error("[/trigger] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /webhook
 * 
 * Receives risk reports from the CRE workflow.
 * Updates settlement status and triggers execution for approved settlements.
 */
app.post("/webhook", async (req: Request, res: Response) => {
  console.log("\n[/webhook] Received webhook");
  
  try {
    // Handle both WebhookPayload and ExecutorSignal formats
    const body = req.body as WebhookPayload | ExecutorSignal;
    
    let report: RiskReport;
    
    if ("event" in body && body.event === "RISK_REPORT") {
      report = body.report;
      console.log(`[/webhook] Received RISK_REPORT event`);
    } else if ("action" in body && body.action === "EXECUTE") {
      report = body.report;
      console.log(`[/webhook] Received EXECUTE signal`);
    } else {
      // Try to parse as direct RiskReport
      report = body as unknown as RiskReport;
    }
    
    console.log(`[/webhook] Report status: ${report.status}`);
    console.log(`[/webhook] Recipe ID: ${report.recipeId}`);
    
    // Find the matching settlement
    let settlement = getSettlementByRecipeId(report.recipeId);
    
    if (!settlement) {
      console.log(`[/webhook] No matching settlement found, creating new one`);
      const settlementId = uuidv4();
      settlement = createSettlement(settlementId, report.intent);
    }
    
    console.log(`[/webhook] Updating settlement: ${settlement.id}`);
    
    // Update settlement with risk report
    let updatedSettlement = updateSettlementStatus(
      settlement.id,
      report.status,
      report
    );
    
    // If approved, execute the settlement
    if (report.status === "APPROVED") {
      console.log(`[/webhook] Settlement APPROVED - triggering execution`);
      
      const executor = getExecutor();
      const result = await executor.executeSettlement(report);
      
      if (result.success) {
        console.log(`[/webhook] Execution successful: ${result.txHash}`);
        updatedSettlement = updateSettlementStatus(
          settlement.id,
          "EXECUTED",
          undefined,
          result.txHash,
          result.explorerUrl
        );
      } else {
        console.log(`[/webhook] Execution failed: ${result.error}`);
        updatedSettlement = updateSettlementStatus(
          settlement.id,
          "FAILED",
          undefined,
          undefined,
          undefined
        );
      }
    }
    
    const response: WebhookResponse = {
      success: true,
      message: `Settlement ${settlement.id} updated to ${updatedSettlement?.status}`,
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error("[/webhook] Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    } as WebhookResponse);
  }
});

/**
 * GET /settlement/:id
 * 
 * Retrieves settlement details by ID.
 */
app.get("/settlement/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  console.log(`\n[/settlement/${id}] Fetching settlement`);
  
  try {
    const settlement = getSettlement(id);
    
    if (!settlement) {
      res.status(404).json({ error: "Settlement not found" });
      return;
    }
    
    const response: SettlementResponse = {
      id: settlement.id,
      status: settlement.status,
      intent: settlement.intent,
      riskReport: settlement.riskReport,
      execution: settlement.txHash
        ? {
            txHash: settlement.txHash,
            explorerUrl: settlement.explorerUrl || "",
          }
        : undefined,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt,
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error(`[/settlement/${id}] Error:`, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /settlements
 * 
 * Lists all settlements (for debugging/monitoring).
 */
app.get("/settlements", (_req: Request, res: Response) => {
  console.log("\n[/settlements] Fetching all settlements");
  
  try {
    const settlements = getAllSettlements();
    res.status(200).json(settlements);
  } catch (error) {
    console.error("[/settlements] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /health
 * 
 * Health check endpoint.
 */
app.get("/health", (_req: Request, res: Response) => {
  const executor = getExecutor();
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    executorAddress: executor.getAccountAddress(),
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  closeDatabase();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("  SettleKit Backend Server");
  console.log("=".repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /trigger          - Trigger new settlement`);
  console.log(`  POST /webhook          - Receive CRE risk reports`);
  console.log(`  GET  /settlement/:id   - Get settlement details`);
  console.log(`  GET  /settlements      - List all settlements`);
  console.log(`  GET  /health           - Health check`);
  console.log("=".repeat(60));
  
  const executor = getExecutor();
  const address = executor.getAccountAddress();
  if (address) {
    console.log(`Executor wallet: ${address}`);
  } else {
    console.log("WARNING: No PRIVATE_KEY configured - execution disabled");
  }
  console.log("=".repeat(60));
});
