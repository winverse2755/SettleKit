import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk";
import type {
  ActivePosition,
  MonitoringDecision,
  MonitoringReport,
  MonitoringWorkflowConfig,
  PoolHealth,
} from "./types";
import { fetchAllPoolHealth } from "./fetchers/pool";
import { selectNextBestPool } from "./evaluator";
import { emitMonitoringReports } from "./emitter/webhook";
import { fetchActivePositions } from "./fetchers/positions";
import { getEthUsdcPoolIds } from "./utils/pool-discovery";

const onCronTrigger = (
  runtime: Runtime<MonitoringWorkflowConfig>
): { reportsEmitted: number; healthy: number; moveRecommended: number } => {
  runtime.log("=".repeat(60));
  runtime.log("Monitoring workflow triggered");
  runtime.log(`Schedule: ${runtime.config.schedule}`);
  runtime.log("=".repeat(60));

  const positions = fetchActivePositions(runtime);
  runtime.log(`Loaded active positions: ${positions.length}`);

  const rpcUrl = runtime.config.targetRpc;
  // Use same ETH/USDC pool set as risk-guard (discovery) so position's pool is always in snapshot
  const poolIds = getEthUsdcPoolIds();
  runtime.log(`Using discovered ETH/USDC pool set (${poolIds.length} fee tiers)`);
  const poolSnapshots = fetchAllPoolHealth(runtime, poolIds, rpcUrl);
  runtime.log(`Fetched health for ${poolSnapshots.length} pools`);

  const reports: MonitoringReport[] = [];
  let healthy = 0;
  let moveRecommended = 0;
  const baseTimestamp = Date.now();

  for (let i = 0; i < positions.length; i++) {
    const position = positions[i];
    runtime.log("");
    runtime.log(`[Position] ${position.positionId}`);
    const currentPool =
      poolSnapshots.find((pool) => pool.poolId === position.poolAddress) ?? {
        poolId: position.poolAddress,
        initialized: false,
        sqrtPriceX96: 0n,
        tick: 0,
        liquidity: 0n,
      };
    runtime.log(
      `Current pool liquidity: ${currentPool.liquidity.toString()} (threshold: ${runtime.config.liquidityThreshold})`
    );

    let decision: MonitoringDecision;
    if (currentPool.liquidity >= BigInt(runtime.config.liquidityThreshold)) {
      decision = {
        status: "HEALTHY",
        reason: "Current pool liquidity is above threshold",
      };
      healthy += 1;
    } else {
      const nextBestPool = selectNextBestPool(
        position.poolAddress,
        poolSnapshots
      );
      if (nextBestPool) {
        decision = {
          status: "MOVE_RECOMMENDED",
          reason: "Current pool liquidity below threshold; better pool found",
          nextBestPool: nextBestPool.poolId,
          nextBestLiquidity: nextBestPool.liquidity.toString(),
        };
        moveRecommended += 1;
      } else {
        decision = {
          status: "HEALTHY",
          reason:
            "Current pool liquidity below threshold, but no alternative pool available",
        };
        healthy += 1;
      }
    }

    const report = buildMonitoringReport(
      runtime,
      position,
      currentPool,
      decision,
      `${baseTimestamp}-${i}`
    );
    reports.push(report);
    runtime.log(`[Report prepared] position=${position.positionId} status=${report.status}`);
  }

  const emitResult = emitMonitoringReports(runtime, reports);
  const reportsEmitted = emitResult.success ? reports.length : 0;
  if (!emitResult.success) {
    runtime.log(`[Batch emission failed] error=${emitResult.error}`);
  }

  runtime.log("=".repeat(60));
  runtime.log(
    `Monitoring complete: emitted=${reportsEmitted}, healthy=${healthy}, moveRecommended=${moveRecommended}`
  );
  runtime.log("=".repeat(60));

  return {
    reportsEmitted,
    healthy,
    moveRecommended,
  };
};

function buildMonitoringReport(
  runtime: Runtime<MonitoringWorkflowConfig>,
  position: ActivePosition,
  currentPool: PoolHealth,
  decision: MonitoringDecision,
  uniqueSuffix?: string
): MonitoringReport {
  return {
    reportId: `monitor-${position.positionId}-${uniqueSuffix ?? Date.now()}`,
    positionId: position.positionId,
    poolAddress: position.poolAddress,
    depositAmount: position.depositAmount,
    currentLiquidity: currentPool.liquidity.toString(),
    status: decision.status,
    nextBestPool: decision.nextBestPool,
    nextBestLiquidity: decision.nextBestLiquidity,
    reason: decision.reason,
    chain: position.chain,
    timestamp: Date.now(),
    metadata: {
      workflow: "monitoring-workflow",
      webhookUrl: runtime.config.webhookUrl,
    },
  };
}

const initWorkflow = (config: MonitoringWorkflowConfig) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger(
        { schedule: config.schedule }
      ), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<MonitoringWorkflowConfig>();
  await runner.run(initWorkflow);
}
