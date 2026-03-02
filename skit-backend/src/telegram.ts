import type {
  PositionWithMonitoring,
  MonitoringReport,
  Settlement,
} from "./types.js";

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
}

export interface TelegramCommandHandlers {
  onSimulate: (args: string[]) => Promise<string>;
  onStatus: (args: string[]) => Promise<string>;
  onAlerts: (chatId: string, args: string[]) => Promise<string>;
  onApprove: (args: string[]) => Promise<string>;
  onHistory: () => Promise<string>;
  onForkStatus: () => Promise<string>;
  onPositions: () => Promise<string>;
  onRebalance: (args: string[]) => Promise<string>;
}

export class TelegramBotService {
  private readonly token: string;
  private readonly apiBase: string;
  private readonly handlers: TelegramCommandHandlers;
  private polling = false;
  private offset = 0;

  constructor(token: string, handlers: TelegramCommandHandlers) {
    this.token = token;
    this.apiBase = `https://api.telegram.org/bot${token}`;
    this.handlers = handlers;
  }

  startPolling(): void {
    if (this.polling) return;
    this.polling = true;
    void this.pollLoop();
  }

  stopPolling(): void {
    this.polling = false;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    await fetch(`${this.apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
  }

  async sendBroadcast(chatIds: string[], text: string): Promise<void> {
    await Promise.all(chatIds.map((chatId) => this.sendMessage(chatId, text)));
  }

  private async pollLoop(): Promise<void> {
    while (this.polling) {
      try {
        const updates = await this.getUpdates();
        for (const update of updates) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          await this.handleUpdate(update);
        }
      } catch (error) {
        console.error("[Telegram] Poll error:", error);
      }
    }
  }

  private async getUpdates(): Promise<TelegramUpdate[]> {
    const url = `${this.apiBase}/getUpdates?timeout=25&offset=${this.offset}`;
    const response = await fetch(url);
    const data = (await response.json()) as TelegramApiResponse<TelegramUpdate[]>;
    if (!data.ok) return [];
    return data.result;
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const text = update.message?.text?.trim();
    const chatId = update.message?.chat.id;
    if (!text || !chatId) return;

    const parts = text.split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    const chatIdStr = String(chatId);

    try {
      switch (command) {
        case "/simulate":
          await this.sendMessage(chatIdStr, await this.handlers.onSimulate(args));
          break;
        case "/status":
          await this.sendMessage(chatIdStr, await this.handlers.onStatus(args));
          break;
        case "/alerts":
          await this.sendMessage(chatIdStr, await this.handlers.onAlerts(chatIdStr, args));
          break;
        case "/approve":
          await this.sendMessage(chatIdStr, await this.handlers.onApprove(args));
          break;
        case "/history":
          await this.sendMessage(chatIdStr, await this.handlers.onHistory());
          break;
        case "/fork":
          if (args[0]?.toLowerCase() === "status") {
            await this.sendMessage(chatIdStr, await this.handlers.onForkStatus());
          } else {
            await this.sendMessage(chatIdStr, "Usage: /fork status");
          }
          break;
        case "/positions":
          await this.sendMessage(chatIdStr, await this.handlers.onPositions());
          break;
        case "/rebalance":
          await this.sendMessage(chatIdStr, await this.handlers.onRebalance(args));
          break;
        default:
          await this.sendMessage(
            chatIdStr,
            "Unknown command. Supported: /simulate /status /alerts /approve /history /fork status /positions /rebalance"
          );
      }
    } catch (error) {
      await this.sendMessage(chatIdStr, `Command failed: ${String(error)}`);
    }
  }
}

export function formatHistory(settlements: Settlement[]): string {
  if (settlements.length === 0) return "No settlements found.";
  const lines = settlements.slice(0, 5).map((s, i) => {
    const statusIcon =
      s.status === "EXECUTED" ? "✅" : s.status === "FAILED" ? "❌" : "⏳";
    const riskLink = s.riskReport?.explorerUrl ?? "n/a";
    const txLink = s.explorerUrl ?? "n/a";
    return `${i + 1}. ${statusIcon} ${s.id}\nstatus=${s.status}\nrisk=${riskLink}\nsettlementTx=${txLink}`;
  });
  return `Last settlements:\n\n${lines.join("\n\n")}`;
}

export function formatPositions(positions: PositionWithMonitoring[]): string {
  if (positions.length === 0) return "No active positions.";
  const lines = positions.map((p) => {
    return [
      `• ${p.positionId}`,
      `pool=${p.poolAddress}`,
      `liquidity=${p.latestLiquidity ?? "n/a"}`,
      `monitoring=${p.latestMonitoringStatus ?? "n/a"}`,
      `lastScan=${p.lastScanAt ? new Date(p.lastScanAt).toISOString() : "n/a"}`,
    ].join("\n");
  });
  return `Active positions:\n\n${lines.join("\n\n")}`;
}

export function formatMonitoringAlert(
  report: MonitoringReport,
  status: "SUCCESS" | "FAILED",
  explorerUrl?: string,
  error?: string
): string {
  if (status === "SUCCESS") {
    return `Auto-rebalance completed ✅\nposition=${report.positionId}\nfrom=${report.poolAddress}\nto=${report.nextBestPool ?? "n/a"}\ntx=${explorerUrl ?? "n/a"}`;
  }
  return `Auto-rebalance failed ❌\nposition=${report.positionId}\nfrom=${report.poolAddress}\nto=${report.nextBestPool ?? "n/a"}\nreason=${error ?? "unknown"}\nlastTx=${explorerUrl ?? "n/a"}`;
}
