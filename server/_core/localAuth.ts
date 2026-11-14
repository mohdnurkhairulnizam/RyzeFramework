import { scryptSync, timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";
import { sdk } from "./sdk";

const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

function isLoopbackHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function isSameLocalOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || !isLoopbackHost(host)) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && isLoopbackHost(parsed.host) && parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function validPasswordConfig(): { salt: Buffer; hash: Buffer } | null {
  if (ENV.localOwnerPasswordSalt.length < 32 || !/^[a-f0-9]+$/i.test(ENV.localOwnerPasswordSalt)) return null;
  if (ENV.localOwnerPasswordHash.length !== 128 || !/^[a-f0-9]+$/i.test(ENV.localOwnerPasswordHash)) return null;
  const salt = Buffer.from(ENV.localOwnerPasswordSalt, "hex");
  const hash = Buffer.from(ENV.localOwnerPasswordHash, "hex");
  if (salt.length < 16 || hash.length !== 64) return null;
  return { salt, hash };
}

function setLocalSession(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: SESSION_MS,
  });
}

export function registerLocalAuthRoutes(app: Express) {
  app.get("/api/local-auth/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ localMode: true });
  });

  app.post("/api/local-auth/login", async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    if (!ENV.localMode || !isLoopbackAddress(req.socket.remoteAddress) || !isSameLocalOrigin(req)) {
      res.status(403).json({ error: "Local sign-in is available only from this computer." });
      return;
    }

    const remote = req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const state = failures.get(remote);
    if (state && state.lockedUntil > now) {
      res.status(429).json({ error: "Too many attempts. Wait 15 minutes before trying again." });
      return;
    }

    const config = validPasswordConfig();
    const password = req.body?.password;
    let valid = false;
    if (config && typeof password === "string" && password.length >= 12 && password.length <= 1024) {
      const supplied = scryptSync(password, config.salt, config.hash.length);
      valid = timingSafeEqual(supplied, config.hash);
    }

    if (!valid) {
      const count = (state?.count ?? 0) + 1;
      failures.set(remote, { count, lockedUntil: count >= MAX_FAILURES ? now + LOCKOUT_MS : 0 });
      res.status(401).json({ error: "Sign-in failed. Check the password and try again." });
      return;
    }

    failures.delete(remote);
    try {
      const token = await sdk.createSessionToken(ENV.localOwnerOpenId, {
        name: ENV.localOwnerName,
        expiresInMs: SESSION_MS,
      });
      setLocalSession(res, token);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Could not start a local session." });
    }
  });

  app.post("/api/local-auth/logout", (req: Request, res: Response) => {
    if (!ENV.localMode || !isLoopbackAddress(req.socket.remoteAddress) || !isSameLocalOrigin(req)) {
      res.status(403).json({ error: "Local sign-out is available only from this computer." });
      return;
    }
    res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/", sameSite: "lax", secure: false });
    res.json({ success: true });
  });
}

export function assertLocalAuthConfiguration(): void {
  if (!ENV.localMode) return;
  if (ENV.cookieSecret.length < 64 || !/^[a-f0-9]+$/i.test(ENV.cookieSecret)) {
    throw new Error("Local mode requires a generated 32-byte-or-stronger JWT_SECRET in the protected .env file.");
  }
  if (!validPasswordConfig()) {
    throw new Error("Local mode requires the local owner password hash and salt. Run the Windows installer/bootstrap script first.");
  }
}
