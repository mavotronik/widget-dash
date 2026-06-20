import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dashboardsRouter from "./routes/dashboards.js";
import blueprintsRouter from "./routes/blueprints.js";
import uploadRouter from "./routes/upload.js";
import pingRouter from "./routes/ping.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/uploads", express.static(join(__dirname, "../data/uploads")));
app.use("/api/dashboards", dashboardsRouter);
app.use("/api/blueprints", blueprintsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/ping", pingRouter);

if (isProd) {
  app.use(express.static(join(__dirname, "../dist")));
  app.get("*", (_req, res) => {
    res.sendFile(join(__dirname, "../dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
