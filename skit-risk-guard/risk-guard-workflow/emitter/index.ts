// skit-risk-guard/risk-guard-workflow/emitter/index.ts
// Re-export emitter functions

export {
  emitWebhook,
  signalExecutor,
  emitReport,
  isWebhookConfigured,
  isExecutorConfigured,
  getEmissionTargets,
  type EmitResult,
} from "./webhook";
