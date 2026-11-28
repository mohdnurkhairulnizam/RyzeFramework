import {
  claimNextMemoryProjection,
  enqueueMemoryProjection,
  markMemoryProjectionApplied,
  markMemoryProjectionFailed,
  resetInFlightMemoryProjections,
  getMemoryProjectionHealth,
} from "./db";
import type { MemPalaceBridge, MemPalaceDrawer } from "./memPalaceMemoryProvider";

export type ProjectionOutboxOperation = "upsert" | "delete";

export type ProjectionOutboxItem = {
  userId: number;
  memoryId: string;
  operation: ProjectionOutboxOperation;
  projectionKey: string;
  drawer?: MemPalaceDrawer;
};

export type ProjectionReplayReport = {
  attempted: number;
  applied: number;
  failed: number;
};

export type ProjectionOutboxHealth = {
  pending: number;
  inFlight: number;
  applied: number;
  failed: number;
  lastSuccessfulReplayAt?: string;
};

export interface MemPalaceProjectionOutbox {
  enqueue(item: ProjectionOutboxItem): Promise<void>;
  replay(bridge: MemPalaceBridge, maxItems?: number): Promise<ProjectionReplayReport>;
  recoverAfterRestart(): Promise<void>;
  getHealth?(): Promise<ProjectionOutboxHealth>;
}

function serialize(item: ProjectionOutboxItem) {
  return item.drawer ? JSON.stringify(item.drawer) : null;
}

export class SqliteMemPalaceProjectionOutbox implements MemPalaceProjectionOutbox {
  async enqueue(item: ProjectionOutboxItem) {
    await enqueueMemoryProjection({
      userId: item.userId,
      memoryId: item.memoryId,
      operation: item.operation,
      projectionKey: item.projectionKey,
      payload: serialize(item) ?? undefined,
    });
  }

  async recoverAfterRestart() {
    await resetInFlightMemoryProjections();
  }

  async getHealth() {
    return getMemoryProjectionHealth();
  }

  async replay(bridge: MemPalaceBridge, maxItems = 100): Promise<ProjectionReplayReport> {
    const report: ProjectionReplayReport = { attempted: 0, applied: 0, failed: 0 };
    for (let index = 0; index < maxItems; index += 1) {
      const item = await claimNextMemoryProjection();
      if (!item) break;
      report.attempted += 1;
      try {
        if (item.operation === "upsert") {
          if (!item.payload) throw new Error("Projection upsert is missing its drawer payload.");
          await bridge.addDrawer(JSON.parse(item.payload) as MemPalaceDrawer);
        } else {
          const payload = item.payload ? JSON.parse(item.payload) as { drawerId?: string } : {};
          const drawerId = payload.drawerId ?? item.projectionKey.replace(/^delete:/, "");
          await bridge.deleteDrawer(drawerId);
        }
        await markMemoryProjectionApplied(item.id);
        report.applied += 1;
      } catch (error) {
        report.failed += 1;
        await markMemoryProjectionFailed(item.id, error instanceof Error ? error.message : String(error));
        break;
      }
    }
    return report;
  }
}

export const sqliteMemPalaceProjectionOutbox = new SqliteMemPalaceProjectionOutbox();
