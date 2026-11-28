import { getMemoryProviderRuntimeHealth } from "./memoryProviderRuntime";

async function main() {
  const health = await getMemoryProviderRuntimeHealth();
  const outbox = "outbox" in health && health.outbox ? health.outbox : undefined;

  console.log(JSON.stringify({
    mode: health.mode,
    enabled: health.enabled,
    searchable: health.searchable,
    failClosed: health.failClosed,
    providerRevision: "providerRevision" in health ? health.providerRevision : undefined,
    namespace: "namespace" in health ? health.namespace : undefined,
    manifestSha256: "manifestSha256" in health ? health.manifestSha256 : undefined,
    approvedOperationCount: "approvedOperationCount" in health ? health.approvedOperationCount : undefined,
    leaseActive: "leaseActive" in health ? health.leaseActive : false,
    leaseExpiresAt: "leaseExpiresAt" in health ? health.leaseExpiresAt : undefined,
    maxReplayItems: "maxReplayItems" in health ? health.maxReplayItems : undefined,
    reconciliationStatus: "reconciliationStatus" in health ? health.reconciliationStatus : undefined,
    canonicalSqliteAvailable: health.canonicalSqliteAvailable,
    outbox: outbox ? {
      pending: outbox.pending,
      inFlight: outbox.inFlight,
      applied: outbox.applied,
      failed: outbox.failed,
      lastSuccessfulReplayAt: outbox.lastSuccessfulReplayAt,
    } : undefined,
    configurationError: health.configurationError,
  }, null, 2));
}

void main();
