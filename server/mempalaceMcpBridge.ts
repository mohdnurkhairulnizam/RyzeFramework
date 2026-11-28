import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import type {
  MemPalaceBridge,
  MemPalaceDrawer,
  MemPalaceSearchRequest,
} from "./memPalaceMemoryProvider";

type JsonRpcResponse = {
  id?: number;
  result?: { content?: Array<{ type?: string; text?: string }>; isError?: boolean };
  error?: { code?: number; message?: string };
};

type Pending = {
  resolve: (response: JsonRpcResponse) => void;
  reject: (error: Error) => void;
};

type ProjectionEnvelope = {
  drawerId: string;
  metadata: MemPalaceDrawer["metadata"];
};

function encodeEnvelope(envelope: ProjectionEnvelope) {
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

function decodeEnvelope(sourcePath: string): ProjectionEnvelope | undefined {
  const prefix = "ryze://projection/";
  if (!sourcePath.startsWith(prefix)) return undefined;
  try {
    return JSON.parse(Buffer.from(sourcePath.slice(prefix.length), "base64url").toString("utf8")) as ProjectionEnvelope;
  } catch {
    return undefined;
  }
}

function projectionSource(drawer: MemPalaceDrawer) {
  return `ryze://projection/${encodeEnvelope({ drawerId: drawer.drawerId, metadata: drawer.metadata })}`;
}

function decodeEnvelopeToken(token: string): ProjectionEnvelope | undefined {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as ProjectionEnvelope;
  } catch {
    return undefined;
  }
}

function parseToolText(response: JsonRpcResponse) {
  if (response.error) throw new Error(response.error.message ?? "MemPalace MCP request failed.");
  if (response.result?.isError) throw new Error(response.result.content?.map(item => item.text ?? "").join("\n") || "MemPalace MCP tool failed.");
  const text = response.result?.content?.find(item => item.type === "text")?.text;
  if (!text) throw new Error("MemPalace MCP response did not contain text content.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("MemPalace MCP response was not valid JSON.");
  }
}

/**
 * Opt-in bridge for a pinned mempalace-mcp stdio process.
 *
 * This transport is deliberately not wired into live routers. It is intended
 * for a disposable projection/replay process. The bridge uses only the drawer
 * projection tools and keeps Ryze metadata in a signed-by-convention source
 * URI so a restart can reconstruct deletion/search identity without a local
 * in-memory provider-ID map.
 */
export class McpMemPalaceBridge implements MemPalaceBridge {
  private process?: ChildProcessWithoutNullStreams;
  private lines?: Interface;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly providerIds = new Map<string, string>();
  private startPromise?: Promise<void>;

  constructor(private readonly options: {
    command?: string;
    args: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    requestTimeoutMs?: number;
  }) {}

  private async ensureStarted() {
    if (this.process) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = new Promise<void>((resolve, reject) => {
      const child = spawn(this.options.command ?? "mempalace-mcp", this.options.args, {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
        stdio: "pipe",
        windowsHide: true,
      });
      this.process = child;
      this.lines = createInterface({ input: child.stdout });
      this.lines.on("line", line => {
        try {
          const message = JSON.parse(line) as JsonRpcResponse;
          if (typeof message.id !== "number") return;
          const waiter = this.pending.get(message.id);
          if (!waiter) return;
          this.pending.delete(message.id);
          waiter.resolve(message);
        } catch {
          // MemPalace may emit human-readable startup diagnostics on stdout.
          // JSON-RPC responses remain line-delimited and are handled above.
        }
      });
      const fail = (error: Error) => {
        this.pending.forEach(waiter => waiter.reject(error));
        this.pending.clear();
        this.process = undefined;
        this.lines?.close();
        this.lines = undefined;
        this.startPromise = undefined;
        if (!this.process) reject(error);
      };
      child.once("error", error => fail(error));
      child.once("exit", code => {
        if (code !== 0) fail(new Error(`MemPalace MCP exited with code ${code ?? "unknown"}.`));
      });
      void this.request("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "ryze-mempalace-bridge", version: "1.0.0" },
      }).then(() => {
        this.notify("notifications/initialized", {});
        resolve();
      }).catch(reject);
    });
    return this.startPromise;
  }

  private notify(method: string, params: unknown) {
    this.process?.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  private request(method: string, params: unknown): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MemPalace MCP request timed out: ${method}`));
      }, this.options.requestTimeoutMs ?? 60_000);
      this.pending.set(id, {
        resolve: response => { clearTimeout(timeout); resolve(response); },
        reject: error => { clearTimeout(timeout); reject(error); },
      });
      this.process?.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  private async callTool(name: string, arguments_: Record<string, unknown>) {
    await this.ensureStarted();
    return parseToolText(await this.request("tools/call", { name, arguments: arguments_ }));
  }

  async addDrawer(drawer: MemPalaceDrawer) {
    const result = await this.callTool("mempalace_add_drawer", {
      wing: `owner-${drawer.metadata.ownerId}`,
      room: `${drawer.metadata.category}-${drawer.metadata.memoryType}`,
      content: drawer.content,
      source_file: projectionSource(drawer),
      added_by: "ryze-projection",
    }) as { drawer_id?: string };
    if (result.drawer_id) this.providerIds.set(drawer.drawerId, result.drawer_id);
    return { drawerId: drawer.drawerId };
  }

  async deleteDrawer(drawerId: string) {
    let providerId = this.providerIds.get(drawerId);
    if (!providerId) {
      const listed = await this.callTool("mempalace_list_drawers", { limit: 100 }) as {
        drawers?: Array<{ drawer_id?: string; metadata?: { source_file?: string } }>;
      };
      const match = (listed.drawers ?? []).find(item => {
        const sourceFile = item.metadata?.source_file;
        return sourceFile ? decodeEnvelopeToken(sourceFile)?.drawerId === drawerId : false;
      });
      providerId = match?.drawer_id;
    }
    if (!providerId) throw new Error(`MemPalace projection drawer was not found after restart: ${drawerId}`);
    await this.callTool("mempalace_delete_drawer", { drawer_id: providerId });
    this.providerIds.delete(drawerId);
  }

  async search(request: MemPalaceSearchRequest) {
    const result = await this.callTool("mempalace_search", {
      query: request.query ?? "Ryze projection",
      wing: request.wing,
      room: request.room,
      limit: request.limit,
    }) as { results?: Array<Record<string, unknown>> };
    return (result.results ?? []).flatMap(item => {
      const sourcePath = typeof item.source_path === "string" ? item.source_path : "";
      const envelope = decodeEnvelope(sourcePath);
      if (!envelope || typeof item.text !== "string") return [];
      return [{
        drawerId: envelope.drawerId,
        content: item.text,
        metadata: envelope.metadata,
      } satisfies MemPalaceDrawer];
    });
  }

  async repair() {
    await this.callTool("mempalace_reconnect", {});
  }

  async close() {
    this.lines?.close();
    this.process?.stdin.end();
    this.process?.kill();
    this.process = undefined;
    this.lines = undefined;
    this.startPromise = undefined;
  }
}
