import type { PositionWithMonitoring, MonitoringReport, Settlement } from "./types.js";
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
export declare class TelegramBotService {
    private readonly token;
    private readonly apiBase;
    private readonly handlers;
    private polling;
    private offset;
    constructor(token: string, handlers: TelegramCommandHandlers);
    startPolling(): void;
    stopPolling(): void;
    sendMessage(chatId: string, text: string): Promise<void>;
    sendBroadcast(chatIds: string[], text: string): Promise<void>;
    private pollLoop;
    private getUpdates;
    private handleUpdate;
}
export declare function formatHistory(settlements: Settlement[]): string;
export declare function formatPositions(positions: PositionWithMonitoring[]): string;
export declare function formatMonitoringAlert(report: MonitoringReport, status: "SUCCESS" | "FAILED", explorerUrl?: string, error?: string): string;
