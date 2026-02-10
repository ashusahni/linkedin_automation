import express from "express";
import cors from "cors";
import phantomRoutes from "./routes/phantom.routes.js";
import jobRoutes from "./routes/job.routes.js";
import networkRoutes from "./routes/network.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import sowRoutes from "./routes/sow.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import emailRoutes from "./routes/email.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import outreachRoutes from "./routes/outreach.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import scraperRoutes from "./routes/scraper.routes.js";

import config from "./config/index.js";

const app = express();

app.use(cors({
  origin: config.server.cors.origin
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Log every API request so you see traffic in the terminal (and spot 500s)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const code = res.statusCode;
    const msg = code >= 500 ? `\x1b[31m${code}\x1b[0m` : code;
    console.log(`${req.method} ${req.originalUrl} → ${msg} (${Date.now() - start}ms)`);
  });
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "linkedin-reach-backend" });
});

app.use("/api/leads", leadRoutes);
app.use("/api/phantom", phantomRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/sow", sowRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/scraper", scraperRoutes); // 🆕 Contact scraper progress
app.use("/api", outreachRoutes); // Multi-channel outreach

// 404 for unknown API routes – return JSON so frontend doesn't get HTML
app.use("/api", (req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler: ensure 500 responses are always JSON and LOGGED so you see them in the terminal
app.use((err, req, res, next) => {
  console.error("\n❌ [500] Unhandled error:", err?.message || err);
  console.error(err?.stack || "");
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    code: "SERVER_ERROR",
    message: err?.message || "An unexpected error occurred.",
    ...(process.env.NODE_ENV === "development" && err?.stack && { stack: err.stack })
  });
});

export default app;
