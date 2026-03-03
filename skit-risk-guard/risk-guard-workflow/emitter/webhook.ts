// skit-risk-guard/risk-guard-workflow/emitter/webhook.ts
// Webhook emission for risk reports using CRE HTTPClient

import {
  HTTPClient,
  consensusIdenticalAggregation,
  ok,
  type Runtime,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import type {
  RiskReport,
  RiskStatus,
  WebhookPayload,
  ExecutorSignal,
  WorkflowConfig,
} from "../types";

/**
 * Result of webhook emission.
 */
export interface EmitResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Emits a risk report to the backend webhook.
 * Used for BLOCKED and WARNING status reports.
 */
export function emitWebhook(
  runtime: Runtime<WorkflowConfig>,
  report: RiskReport
): EmitResult {
  const webhookUrl = runtime.config.webhookUrl;

  if (!webhookUrl) {
    runtime.log("No webhook URL configured, skipping webhook emission");
    return { success: false, error: "No webhook URL configured" };
  }

  runtime.log(`Emitting risk report to webhook: ${webhookUrl}`);
  runtime.log(`Report status: ${report.status}`);

  const httpClient = new HTTPClient();

  // Build webhook payload
  const payload: WebhookPayload = {
    event: "RISK_REPORT",
    report,
    sentAt: Date.now(),
  };

  try {
    const result = httpClient
      .sendRequest(
        runtime,
        (sendRequester: HTTPSendRequester, url: string, body: string) =>
          sendWebhookRequest(sendRequester, url, body),
        consensusIdenticalAggregation<EmitResult>()
      )(webhookUrl, JSON.stringify(payload))
      .result();

    if (result.success) {
      runtime.log(`Webhook emission successful`);
    } else {
      runtime.log(`Webhook emission failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMsg = `Webhook emission error: ${error}`;
    runtime.log(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Signals the deterministic executor to proceed with settlement.
 * Used for APPROVED status reports.
 */
export function signalExecutor(
  runtime: Runtime<WorkflowConfig>,
  report: RiskReport
): EmitResult {
  const executorUrl = runtime.config.executorUrl;

  if (!executorUrl) {
    runtime.log("No executor URL configured, skipping executor signal");
    return { success: false, error: "No executor URL configured" };
  }

  runtime.log(`Signaling executor to proceed: ${executorUrl}`);
  runtime.log(`Recipe ID: ${report.recipeId}`);

  const httpClient = new HTTPClient();

  // Build executor signal payload
  const signal: ExecutorSignal = {
    action: "EXECUTE",
    report,
    signalAt: Date.now(),
  };

  try {
    const result = httpClient
      .sendRequest(
        runtime,
        (sendRequester: HTTPSendRequester, url: string, body: string) =>
          sendWebhookRequest(sendRequester, url, body),
        consensusIdenticalAggregation<EmitResult>()
      )(executorUrl, JSON.stringify(signal))
      .result();

    if (result.success) {
      runtime.log(`Executor signal successful`);
    } else {
      runtime.log(`Executor signal failed: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMsg = `Executor signal error: ${error}`;
    runtime.log(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Pure-JS base64 encoder — CRE's QuickJS runtime has no `Buffer` or `btoa`.
 */
function toBase64(str: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < str.length; i += 3) {
    const a = str.charCodeAt(i);
    const b = str.charCodeAt(i + 1);
    const c = str.charCodeAt(i + 2);
    result += chars[a >> 2];
    result += chars[((a & 3) << 4) | (b >> 4)];
    result += isNaN(b) ? "=" : chars[((b & 15) << 2) | (c >> 6)];
    result += isNaN(c) ? "=" : chars[c & 63];
  }
  return result;
}

/**
 * Core HTTP request logic for webhook/executor calls.
 */
function sendWebhookRequest(
  sendRequester: HTTPSendRequester,
  url: string,
  body: string
): EmitResult {
  const bodyBase64 = toBase64(body);

  const response = sendRequester
    .sendRequest({
      url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyBase64,
      timeout: "10s",
    })
    .result();

  if (ok(response)) {
    return {
      success: true,
      statusCode: response.statusCode,
    };
  }

  return {
    success: false,
    statusCode: response.statusCode,
    error: `HTTP ${response.statusCode}`,
  };
}

/**
 * Emits the appropriate response based on risk status.
 * - APPROVED: Signal executor to proceed
 * - WARNING/BLOCKED: Send webhook notification
 */
export function emitReport(
  runtime: Runtime<WorkflowConfig>,
  report: RiskReport
): EmitResult {
  runtime.log(`Emitting report with status: ${report.status}`);

  if (report.status === "APPROVED") {
    return signalExecutor(runtime, report);
  } else {
    return emitWebhook(runtime, report);
  }
}

/**
 * Check if webhook emission is configured.
 */
export function isWebhookConfigured(config: WorkflowConfig): boolean {
  return !!config.webhookUrl;
}

/**
 * Check if executor signaling is configured.
 */
export function isExecutorConfigured(config: WorkflowConfig): boolean {
  return !!config.executorUrl;
}

/**
 * Get emission targets summary for logging.
 */
export function getEmissionTargets(config: WorkflowConfig): string {
  const targets: string[] = [];

  if (config.webhookUrl) {
    targets.push(`webhook: ${config.webhookUrl}`);
  }

  if (config.executorUrl) {
    targets.push(`executor: ${config.executorUrl}`);
  }

  return targets.length > 0
    ? targets.join(", ")
    : "No emission targets configured";
}
