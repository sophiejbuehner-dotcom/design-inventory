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
