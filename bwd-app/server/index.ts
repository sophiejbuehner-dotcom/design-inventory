import express from "express";
import { setupAuth } from "./auth";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();

// Trust Railway's reverse proxy so secure cookies and req.ip work correctly
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Auth (session + passport)
setupAuth(app);

// API routes
registerRoutes(app);

// JSON error handler — must be before static serving
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
});

// Serve frontend
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
} else {
  // In dev, Vite runs separately on its own port
  app.get("*", (_req, res) => {
    res.json({ message: "API server running. Start Vite separately for the frontend." });
  });
}

const port = parseInt(process.env.PORT || "5000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`BWD Inventory server running on port ${port}`);
});
