import express from "express";
import { getOverview } from "../controllers/analyticsController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

function staffOnly(req: any, res: any, next: any) {
  if (req.user?.role === "admin" || req.user?.role === "vendor") return next();
  return res.status(403).json({ message: "Staff access required" });
}

router.get("/overview", protect, staffOnly, getOverview);

export default router;
