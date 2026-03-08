import {
  HTTPClient,
  consensusIdenticalAggregation,
  ok,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import type {
  MonitoringReport,
  MonitoringWebhookPayload,
  MonitoringWorkflowConfig,
} from "../types";

export interface EmitResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

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

function sendWebhookRequest(
  sendRequester: HTTPSendRequester,
  url: string,
  body: string
): EmitResult {
  const response = sendRequester
    .sendRequest({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: toBase64(body),
      timeout: "30s",
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

export function emitMonitoringReport(
  runtime: Runtime<MonitoringWorkflowConfig>,
  report: MonitoringReport
): EmitResult {
  const payload: MonitoringWebhookPayload = {
    event: "MONITORING_REPORT",
    report,
    sentAt: Date.now(),
  };

  const httpClient = new HTTPClient();
  return httpClient
    .sendRequest(
      runtime,
      sendWebhookRequest,
      consensusIdenticalAggregation<EmitResult>()
    )(runtime.config.webhookUrl, JSON.stringify(payload))
    .result();
}

export interface MonitoringReportBatchPayload {
  event: "MONITORING_REPORT_BATCH";
  reports: MonitoringReport[];
  sentAt: number;
}

export function emitMonitoringReports(
  runtime: Runtime<MonitoringWorkflowConfig>,
  reports: MonitoringReport[]
): EmitResult {
  if (reports.length === 0) {
    return { success: true };
  }

  const payload: MonitoringReportBatchPayload = {
    event: "MONITORING_REPORT_BATCH",
    reports,
    sentAt: Date.now(),
  };

  const httpClient = new HTTPClient();
  return httpClient
    .sendRequest(
      runtime,
      sendWebhookRequest,
      consensusIdenticalAggregation<EmitResult>()
    )(runtime.config.webhookUrl, JSON.stringify(payload))
    .result();
}
