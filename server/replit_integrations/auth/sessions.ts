import type { Express, Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";
import { query } from "../../db";
import { isAuthenticated } from "./replitAuth";

/**
 * Express middleware: stamps the current Replit Auth session with userAgent / ip
 * / lastSeenAt metadata so the Settings → Recent sign-ins panel has something
 * to display. Cheap because we only write back to the session store when a
 * field actually changes or once a minute, not on every request.
 */
export function trackSessionActivity(req: Request, _res: Response, next: NextFunction) {
  if (!req.session || !req.isAuthenticated || !req.isAuthenticated()) {
    return next();
  }
  const sess = req.session as any;
  const ua = req.get("user-agent") || null;
  const ip = req.ip || null;
  const now = Date.now();
  const last = sess.lastSeenAt ? Date.parse(sess.lastSeenAt) : 0;

  if (sess.userAgent !== ua || sess.ip !== ip || now - last > 60_000) {
    sess.userAgent = ua;
    sess.ip = ip;
    sess.lastSeenAt = new Date(now).toISOString();
    sess.createdAt = sess.createdAt ?? new Date(now).toISOString();
  }
  next();
}

interface SessionRow {
  sid: string;
  sess: any;
  expire: Date;
}

interface PublicSessionInfo {
  id: string;
  current: boolean;
  device: string;
  browser: string | null;
  os: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  expiresAt: string;
}

function describeUA(ua: string | null | undefined): {
  device: string;
  browser: string | null;
  os: string | null;
} {
  if (!ua) return { device: "Unknown device", browser: null, os: null };
  const parsed = new UAParser(ua).getResult();
  const browser = parsed.browser.name || null;
  const os = parsed.os.name ? `${parsed.os.name}${parsed.os.version ? ` ${parsed.os.version}` : ""}` : null;
  if (browser && os) return { device: `${browser} on ${os}`, browser, os };
  if (browser) return { device: browser, browser, os: null };
  if (os) return { device: os, browser: null, os };
  return { device: "Unknown device", browser: null, os: null };
}

/**
 * Display-only session id: first 8 chars of the sid hash. We never expose the
 * full sid (it's effectively the session cookie); this is enough for the user
 * to disambiguate "this device" from a stale one in the list.
 */
function publicSessionId(sid: string): string {
  return `${sid.slice(0, 8)}…`;
}

export function registerSessionRoutes(app: Express): void {
  // GET /api/auth/sessions — list of active sessions for the current user
  app.get("/api/auth/sessions", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await query<SessionRow>(
        `SELECT sid, sess, expire
           FROM sessions
          WHERE expire > NOW()
            AND sess->'passport'->'user'->'claims'->>'sub' = $1
          ORDER BY (sess->>'lastSeenAt')::timestamptz DESC NULLS LAST`,
        [userId],
      );

      const data: PublicSessionInfo[] = result.rows.map((r) => {
        const desc = describeUA(r.sess?.userAgent);
        return {
          id: publicSessionId(r.sid),
          current: r.sid === req.sessionID,
          device: desc.device,
          browser: desc.browser,
          os: desc.os,
          ip: r.sess?.ip ?? null,
          lastSeenAt: r.sess?.lastSeenAt ?? null,
          createdAt: r.sess?.createdAt ?? null,
          expiresAt: new Date(r.expire).toISOString(),
        };
      });

      res.json({ data });
    } catch (err) {
      console.error("list sessions failed:", err);
      res.status(500).json({ message: "Failed to load sessions" });
    }
  });

  // POST /api/auth/sessions/revoke-others — sign out of every other session
  app.post("/api/auth/sessions/revoke-others", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const result = await query(
        `DELETE FROM sessions
          WHERE sid <> $1
            AND sess->'passport'->'user'->'claims'->>'sub' = $2`,
        [req.sessionID, userId],
      );
      res.json({ ok: true, revoked: result.rowCount ?? 0 });
    } catch (err) {
      console.error("revoke other sessions failed:", err);
      res.status(500).json({ message: "Failed to revoke sessions" });
    }
  });
}
