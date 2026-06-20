import { Router } from "express";
import { spawn } from "node:child_process";

const router = Router();

/**
 * @param {string} host
 * @param {number} attempts
 * @param {number} intervalMs
 * @returns {Promise<boolean>}
 */
function runPing(host, attempts, intervalMs) {
  return new Promise((resolve) => {
    const intervalSec = Math.max(0.2, intervalMs / 1000);
    const args = ["-c", String(attempts), "-i", String(intervalSec), "-W", "1", host];
    const child = spawn("ping", args, { stdio: "ignore" });

    const timeoutMs = Math.max(3000, attempts * intervalMs + 3000);
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(false);
    }, timeoutMs);

    child.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });

    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

router.post("/", async (req, res) => {
  const host = typeof req.body?.host === "string" ? req.body.host.trim() : "";
  const attemptsRaw = Number(req.body?.attempts);
  const intervalRaw = Number(req.body?.intervalMs);

  if (!host || host.length > 255) {
    res.status(400).send("Invalid host");
    return;
  }

  const attempts = Number.isFinite(attemptsRaw) ? Math.min(10, Math.max(1, Math.floor(attemptsRaw))) : 2;
  const intervalMs = Number.isFinite(intervalRaw)
    ? Math.min(60000, Math.max(500, Math.floor(intervalRaw)))
    : 5000;

  try {
    const success = await runPing(host, attempts, intervalMs);
    res.json({ ok: true, success });
  } catch (error) {
    res.status(500).json({ ok: false, success: false, error: "Ping failed" });
  }
});

export default router;
