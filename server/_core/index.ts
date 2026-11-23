import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { closeDb, ensureLocalOwner, getDb } from "../db";
import { registerLocalAuthRoutes, assertLocalAuthConfiguration } from "./localAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerWorkerRoutes } from "../workerApi";
import { ENV } from "./env";
import { assertRuntimeConfiguration } from "../runtimeConfig";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function isAllowedLocalHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isSameLocalOrigin(req: express.Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || !isAllowedLocalHost(host)) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && isAllowedLocalHost(parsed.host) && parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

async function startServer() {
  assertRuntimeConfiguration({
    schemaVersion: ENV.runtimeConfigSchema,
    localMode: ENV.localMode,
    providerBaseUrl: ENV.freeLlmApiBaseUrl,
    providerApiKey: ENV.freeLlmApiKey,
    providerModel: ENV.freeLlmApiModel,
    openCodeBaseUrl: ENV.openCodeBaseUrl,
    workerToken: ENV.workerToken,
    workerOwnerOpenId: ENV.workerOwnerOpenId,
    hostedDatabaseUrl: ENV.databaseUrl,
    hostedOAuthUrl: ENV.oAuthServerUrl,
  });
  if (ENV.localMode) {
    assertLocalAuthConfiguration();
    await getDb();
    await ensureLocalOwner();
  }

  const app = express();
  const server = createServer(app);
  app.use((req, res, next) => {
    if (ENV.localMode && !isAllowedLocalHost(req.headers.host)) {
      res.status(403).send("Ryze local mode accepts localhost requests only.");
      return;
    }
    next();
  });
  app.get("/health", (_req, res) => res.json({ ok: true, localMode: ENV.localMode }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  if (ENV.localMode) {
    registerLocalAuthRoutes(app);
    app.use("/api/trpc", (req, res, next) => {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !isSameLocalOrigin(req)) {
        res.status(403).json({ error: "Cross-origin requests are not allowed in local mode." });
        return;
      }
      next();
    });
  } else {
    registerOAuthRoutes(app);
  }
  registerStorageProxy(app);
  registerWorkerRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext }),
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = Number.parseInt(process.env.PORT || (ENV.localMode ? "3777" : "3000"), 10);
  if (!Number.isInteger(preferredPort) || preferredPort < 1024 || preferredPort > 65535) {
    throw new Error("PORT must be an integer between 1024 and 65535.");
  }

  const port = ENV.localMode ? preferredPort : await findAvailablePort(preferredPort);
  if (ENV.localMode && !(await isPortAvailable(port))) {
    throw new Error(`Ryze cannot start: localhost port ${port} is already in use. Close the other program or change PORT in the protected .env file.`);
  }

  server.on("close", () => { void closeDb(); });
  server.listen(port, ENV.localMode ? "127.0.0.1" : undefined, () => {
    console.log(`Server running on http://${ENV.localMode ? "127.0.0.1" : "localhost"}:${port}/`);
  });
}

startServer().catch((error) => {
  console.error("Ryze startup failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
