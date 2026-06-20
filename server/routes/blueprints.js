import { Router } from "express";
import { listBlueprints, getBlueprint, createBlueprint, deleteBlueprint } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(listBlueprints());
});

router.post("/", (req, res) => {
  const { name, description, data } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Укажите название blueprint" });
    return;
  }

  if (!data || typeof data !== "object") {
    res.status(400).json({ error: "Нет данных для сохранения" });
    return;
  }

  const created = createBlueprint(
    name.trim(),
    typeof description === "string" ? description.trim() || null : null,
    data
  );

  res.status(201).json(created);
});

router.get("/:id", (req, res) => {
  const blueprint = getBlueprint(Number(req.params.id));
  if (!blueprint) {
    res.status(404).json({ error: "Blueprint не найден" });
    return;
  }
  res.json(blueprint);
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const blueprint = getBlueprint(id);
  if (!blueprint) {
    res.status(404).json({ error: "Blueprint не найден" });
    return;
  }
  deleteBlueprint(id);
  res.json({ ok: true });
});

export default router;
