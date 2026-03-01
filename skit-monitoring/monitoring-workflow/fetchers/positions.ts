import {
  HTTPClient,
  consensusIdenticalAggregation,
  json,
  ok,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import type { ActivePosition, MonitoringWorkflowConfig } from "../types";

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

interface FetchPositionsResult {
  success: boolean;
  positions: ActivePosition[];
  error?: string;
}

function sendGetPositionsRequest(
  sendRequester: HTTPSendRequester,
  url: string
): FetchPositionsResult {
  const response = sendRequester
    .sendRequest({
      url,
      method: "GET",
      headers: { Accept: "application/json" },
      body: toBase64(""),
      timeout: "10s",
    })
    .result();

  if (!ok(response)) {
    return {
      success: false,
      positions: [],
      error: `HTTP ${response.statusCode}`,
    };
  }

  try {
    const parsed = json(response) as ActivePosition[];
    if (!Array.isArray(parsed)) {
      return {
        success: false,
        positions: [],
        error: "Positions response must be an array",
      };
    }
    return { success: true, positions: parsed };
  } catch (error) {
    return {
      success: false,
      positions: [],
      error: `Failed to parse positions response: ${error}`,
    };
  }
}

export function fetchActivePositions(
  runtime: Runtime<MonitoringWorkflowConfig>
): ActivePosition[] {
  const url = `${runtime.config.backendUrl}/positions`;
  const httpClient = new HTTPClient();

  const result = httpClient
    .sendRequest(
      runtime,
      sendGetPositionsRequest,
      consensusIdenticalAggregation<FetchPositionsResult>()
    )(url)
    .result();

  if (!result.success) {
    runtime.log(`[Positions] Failed to fetch active positions: ${result.error}`);
    return [];
  }

  return result.positions;
}
