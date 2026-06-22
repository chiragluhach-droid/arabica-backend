import express from "express";
import { getBranches, getBranchBySlug, getPrinterConfig, updatePrinterConfig } from "../controllers/branchController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", getBranches);

// Printer config (POS settings) — registered before the /:slug catch-all.
router.get("/printer/:branchId", protect, getPrinterConfig);
router.patch("/printer/:branchId", protect, updatePrinterConfig);

router.get("/:slug", getBranchBySlug);

export default router;
