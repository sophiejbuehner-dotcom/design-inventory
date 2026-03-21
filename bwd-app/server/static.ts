import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
