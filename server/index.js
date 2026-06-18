import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dashboardRouter from "./routes/dashboard.js";
import uploadRouter from "./routes/upload.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/uploads", express.static(join(__dirname, "../data/uploads")));
app.use("/api/dashboard", dashboardRouter);
app.use("/api/upload", uploadRouter);

if (isProd) {
  app.use(express.static(join(__dirname, "../dist")));
  app.get("*", (_req, res) => {
    res.sendFile(join(__dirname, "../dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
