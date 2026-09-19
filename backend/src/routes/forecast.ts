import { Router } from "express";
import { asyncHandler } from "../lib/validation.js";
import { buildForecast } from "../lib/forecast.js";

const router = Router();

// GET /api/forecast?months=3 — this month plus the next N months (max 12).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const months = Math.min(Math.max(Number(req.query.months) || 3, 0), 12);
    res.json(await buildForecast(req.userId!, months));
  })
);

export default router;
