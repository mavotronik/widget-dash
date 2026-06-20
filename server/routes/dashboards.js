import { Router } from "express";
import {
  listDashboards,
  getDashboardMeta,
  loadDashboardById,
  loadDashboardBySlug,
  getDashboardMetaBySlug,
  createDashboard,
  saveDashboard,
  updateDashboardMeta,
  deleteDashboard,
  getBlueprint,
  isValidSlug,
  isSlugTaken,
  generateSlug,
} from "../db.js";
import { createEmptyDashboard } from "../../src/data/defaults.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(listDashboards());
});

router.post("/", (req, res) => {
  try {
    const { name, slug, blueprintId, designWidth, designHeight } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Укажите название дашборда" });
      return;
    }

    const resolvedSlug = slug?.trim() || generateSlug(name.trim());

    if (!isValidSlug(resolvedSlug)) {
      res.status(400).json({ error: "Slug может содержать только a-z, 0-9 и дефис" });
      return;
    }

    if (isSlugTaken(resolvedSlug)) {
      res.status(409).json({ error: "Такой slug уже используется" });
      return;
    }

    let data = null;
    let width = designWidth ?? 1920;
    let height = designHeight ?? 1080;

    if (blueprintId) {
      const blueprint = getBlueprint(Number(blueprintId));
      if (!blueprint) {
        res.status(404).json({ error: "Blueprint не найден" });
        return;
      }
      data = structuredClone(blueprint.data);
      if (designWidth) width = designWidth;
      if (designHeight) height = designHeight;
      data.designWidth = width;
      data.designHeight = height;
    }

    const created = createDashboard({
      name: name.trim(),
      slug: resolvedSlug,
      designWidth: width,
      designHeight: height,
      data: data ?? undefined,
    });

    res.status(201).json({
      id: created.id,
      name: created.name,
      slug: created.slug,
      data: created.data,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Ошибка создания" });
  }
});

router.get("/by-slug/:slug", (req, res) => {
  const meta = getDashboardMetaBySlug(req.params.slug);
  if (!meta) {
    res.status(404).json({ error: "Дашборд не найден" });
    return;
  }

  const data = loadDashboardBySlug(req.params.slug);
  res.json({ ...meta, data });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const meta = getDashboardMeta(id);
  if (!meta) {
    res.status(404).json({ error: "Дашборд не найден" });
    return;
  }

  const data = loadDashboardById(id);
  res.json({ ...meta, data });
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const meta = getDashboardMeta(id);
  if (!meta) {
    res.status(404).json({ error: "Дашборд не найден" });
    return;
  }

  saveDashboard(id, req.body);
  res.json({ ok: true });
});

router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const meta = getDashboardMeta(id);
  if (!meta) {
    res.status(404).json({ error: "Дашборд не найден" });
    return;
  }

  const { name, slug } = req.body ?? {};
  const nextName = typeof name === "string" && name.trim() ? name.trim() : meta.name;
  const nextSlug = slug !== undefined ? (slug?.trim() || generateSlug(nextName)) : meta.slug;

  if (!isValidSlug(nextSlug)) {
    res.status(400).json({ error: "Slug может содержать только a-z, 0-9 и дефис" });
    return;
  }

  if (isSlugTaken(nextSlug, id)) {
    res.status(409).json({ error: "Такой slug уже используется" });
    return;
  }

  updateDashboardMeta(id, nextName, nextSlug);
  res.json({ ok: true, name: nextName, slug: nextSlug });
});

router.delete("/:id", (req, res) => {
  try {
    deleteDashboard(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Ошибка удаления" });
  }
});

export default router;
