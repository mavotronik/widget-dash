import { Router } from "express";
import { loadDashboard, saveDashboard } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(loadDashboard());
});

router.put("/", (req, res) => {
  saveDashboard(req.body);
  res.json({ ok: true });
});

export default router;
