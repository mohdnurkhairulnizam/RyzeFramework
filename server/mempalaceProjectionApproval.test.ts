import { describe, expect, it } from "vitest";
import { manifestSha256, validateProjectionApproval, type ProjectionManifest } from "./mempalaceProjectionApproval";

function manifestJson(overrides: Partial<ProjectionManifest> = {}) {
  const manifest: ProjectionManifest = {
    format: "ryze-mempalace-projection-dry-run-v1",
    mode: "dry-run",
    writesPerformed: false,
    provider: { name: "mempalace", commit: "provider-synthetic-commit" },
    namespace: "ryze-dry-run-synthetic",
    branch: "synthetic-test",
    recordCount: 1,
    operations: [{
      operation: "upsert_projection",
      ryzeMemoryId: "fixture-approval-1",
      ownerId: 991122,
      category: "experience",
      memoryType: "project",
      version: 1,
      sensitivity: "normal",
      tagsHash: "a".repeat(64),
      sanitizedContentHash: "b".repeat(64),
      sourceRefClass: "sanitized",
    }],
    ...overrides,
  };
  return JSON.stringify(manifest, null, 2) + "\n";
}

describe("MemPalace projection approval boundary", () => {
  it("approves the exact unexpired synthetic manifest", () => {
    const json = manifestJson();
    const result = validateProjectionApproval(json, {
      manifestSha256: manifestSha256(json),
      providerCommit: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
      branch: "synthetic-test",
      operationCount: 1,
      expiresAt: "2026-11-28T18:00:00.000Z",
    }, new Date("2026-11-28T17:30:00.000Z"));

    expect(result).toMatchObject({ approved: true });
  });

  it("fails closed when approval is absent, stale, or the manifest changes", () => {
    const json = manifestJson();
    expect(validateProjectionApproval(json, undefined)).toMatchObject({ approved: false });
    expect(validateProjectionApproval(json, {
      manifestSha256: "wrong",
      providerCommit: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
      branch: "synthetic-test",
      operationCount: 1,
      expiresAt: "2026-11-28T18:00:00.000Z",
    }, new Date("2026-11-28T17:30:00.000Z"))).toMatchObject({ approved: false });
    expect(validateProjectionApproval(manifestJson({ namespace: "changed-namespace" }), {
      manifestSha256: manifestSha256(json),
      providerCommit: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
      branch: "synthetic-test",
      operationCount: 1,
      expiresAt: "2026-11-28T18:00:00.000Z",
    }, new Date("2026-11-28T17:30:00.000Z"))).toMatchObject({ approved: false });
  });

  it("rejects expired approvals and restricted/system operations by default", () => {
    const json = manifestJson({ operations: [{
      operation: "upsert_projection",
      ryzeMemoryId: "fixture-approval-1",
      ownerId: 991122,
      category: "personal",
      memoryType: "preference",
      version: 1,
      sensitivity: "restricted",
      tagsHash: "a".repeat(64),
      sanitizedContentHash: "b".repeat(64),
      sourceRefClass: "sanitized",
    }] });
    const result = validateProjectionApproval(json, {
      manifestSha256: manifestSha256(json),
      providerCommit: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
      branch: "synthetic-test",
      operationCount: 1,
      expiresAt: "2026-11-28T17:00:00.000Z",
    }, new Date("2026-11-28T17:30:00.000Z"));

    expect(result).toMatchObject({ approved: false });
    expect((result as { reasons: string[] }).reasons).toEqual(expect.arrayContaining([
      "manifest contains an operation outside the default approved scope",
      "approval is expired or invalid",
    ]));
  });

  it("rejects missing provenance hashes and duplicate record versions", () => {
    const json = manifestJson({ operations: [
      {
        operation: "upsert_projection",
        ryzeMemoryId: "fixture-approval-1",
        ownerId: 991122,
        category: "experience",
        memoryType: "project",
        version: 1,
        sensitivity: "normal",
        tagsHash: "invalid",
        sanitizedContentHash: "invalid",
        sourceRefClass: "redacted-reference",
      },
      {
        operation: "upsert_projection",
        ryzeMemoryId: "fixture-approval-1",
        ownerId: 991122,
        category: "experience",
        memoryType: "project",
        version: 1,
        sensitivity: "normal",
        tagsHash: "a".repeat(64),
        sanitizedContentHash: "b".repeat(64),
        sourceRefClass: "sanitized",
      },
    ], recordCount: 2 });
    const result = validateProjectionApproval(json, {
      manifestSha256: manifestSha256(json),
      providerCommit: "provider-synthetic-commit",
      namespace: "ryze-dry-run-synthetic",
      branch: "synthetic-test",
      operationCount: 2,
      expiresAt: "2026-11-28T18:00:00.000Z",
    }, new Date("2026-11-28T17:30:00.000Z"));

    expect(result).toMatchObject({ approved: false });
    expect((result as { reasons: string[] }).reasons).toEqual(expect.arrayContaining([
      "manifest contains duplicate record versions",
      "manifest contains an operation outside the default approved scope",
    ]));
  });
});
