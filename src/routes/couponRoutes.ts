import express from "express";
import {
  previewCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController";
import { protect, adminOnly } from "../middleware/authMiddleware";

const router = express.Router();

// Customer
router.post("/preview", protect, previewCoupon);

// Admin
router.get("/", protect, adminOnly, listCoupons);
router.post("/", protect, adminOnly, createCoupon);
router.patch("/:id", protect, adminOnly, updateCoupon);
router.delete("/:id", protect, adminOnly, deleteCoupon);

export default router;
