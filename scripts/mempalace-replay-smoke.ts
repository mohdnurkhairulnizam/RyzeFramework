import { McpMemPalaceBridge } from "../server/mempalaceMcpBridge";
import type { MemPalaceDrawer } from "../server/memPalaceMemoryProvider";

function argument(name: string, fallback?: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const palace = argument("--palace");
const command = argument("--command", "mempalace-mcp")!;
if (!palace) throw new Error("Usage: tsx scripts/mempalace-replay-smoke.ts --palace <palace-directory> [--command <mcp-command>]");

const token = `ryze-replay-${Date.now()}`;
const drawer: MemPalaceDrawer = {
  drawerId: `${token}:v1`,
  content: `RYZE_SYNTHETIC_REPLAY_MARKER ${token}`,
  metadata: {
    ryzeMemoryId: token,
    ownerId: 991122,
    category: "personal",
    memoryType: "preference",
    version: 1,
    branchId: "main",
    sensitivity: "normal",
    sourceSystemId: "ryze-replay-smoke",
    sourceRef: `synthetic://${token}`,
  },
};

let pending: MemPalaceDrawer | undefined = drawer;
const unavailable = new McpMemPalaceBridge({ command: "mempalace-command-that-does-not-exist", args: ["--palace", palace], requestTimeoutMs: 5_000 });
try {
  await unavailable.addDrawer(drawer);
  throw new Error("Provider-unavailable check unexpectedly succeeded.");
} catch {
  console.log("provider_unavailable=PASS");
} finally {
  await unavailable.close();
}

const first = new McpMemPalaceBridge({ command, args: ["--palace", palace] });
await first.addDrawer(pending);
pending = undefined;
await first.close();
console.log("projection_replay_after_restart=PASS");

const restarted = new McpMemPalaceBridge({ command, args: ["--palace", palace] });
const found = await restarted.search({ query: drawer.content, wing: `owner-${drawer.metadata.ownerId}`, room: "personal-preference", limit: 10 });
if (!found.some(item => item.drawerId === drawer.drawerId && item.metadata.ownerId === drawer.metadata.ownerId && item.metadata.version === drawer.metadata.version)) {
  throw new Error("Restarted provider did not return the projected drawer with Ryze metadata.");
}
console.log("projection_search_rehydration=PASS");
await restarted.deleteDrawer(drawer.drawerId);
const afterDelete = await restarted.search({ query: drawer.content, wing: `owner-${drawer.metadata.ownerId}`, room: "personal-preference", limit: 10 });
if (afterDelete.some(item => item.drawerId === drawer.drawerId)) throw new Error("Projection deletion reconciliation failed.");
console.log("projection_deletion=PASS");
await restarted.close();
console.log(`marker=${drawer.content}`);
console.log("overall=PASS");
