import express from "express";
import { createServer as createViteServer } from "vite";
import { registerChatRoutes } from "./chat";
import { registerApiRoutes } from "./api";
import { registerKeyRoutes } from "./auth";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { ensureSchema, purgeExpiredSessions } from "./db";

const app = express();
app.use(express.json({ limit: "10mb" }));

const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 5000;

async function start() {
  // Run schema bootstrap before serving any traffic so a fresh environment
  // can sign in immediately without manual migration steps.
  await ensureSchema();
  await purgeExpiredSessions();
  // Sweep expired sessions every 6 hours.
  setInterval(() => {
    void purgeExpiredSessions();
  }, 6 * 60 * 60 * 1000).unref?.();

  // Replit Auth (sets up session, passport, /api/login, /api/logout, /api/callback).
  // Must happen BEFORE any route that depends on session/passport state.
  await setupAuth(app);
  registerAuthRoutes(app);

  registerKeyRoutes(app);
  registerChatRoutes(app);
  registerApiRoutes(app);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const distRoot = path.resolve(__dirname, "../dist");
    app.use(express.static(distRoot));
    // SPA fallback — Express 5 / path-to-regexp v8 no longer accepts bare "*",
    // so use a catch-all middleware after the static handler instead.
    app.use((_req, res) => {
      res.sendFile(path.join(distRoot, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Switchboard listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
