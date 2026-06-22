import express from "express";
import {
  createOrder,
  getMyOrders,
  getBranchOrders,
  getOrderById,
  updateOrderStatus,
  getDeliveryQuote,
  getAvailablePartners,
  assignPartner,
  getPartnerOrders,
  verifyDeliveryOtp,
  markPrinted,
} from "../controllers/orderController";
import { createPosOrder } from "../controllers/posController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", protect, createOrder);
// POS (counter) order entry — staff only
router.post("/pos", protect, createPosOrder);
router.get("/me", protect, getMyOrders);

// Delivery distance + charge quote for checkout
router.post("/delivery-quote", protect, getDeliveryQuote);

// Delivery partner flows (specific routes BEFORE the /:id catch-all)
router.get("/partners", protect, getAvailablePartners);
router.get("/partner/me", protect, getPartnerOrders);

router.get("/branch/:branchId", protect, getBranchOrders);

router.get("/:id", protect, getOrderById);
router.patch("/:id/status", protect, updateOrderStatus);
router.patch("/:id/assign", protect, assignPartner);
router.patch("/:id/verify-otp", protect, verifyDeliveryOtp);
router.patch("/:id/printed", protect, markPrinted);

export default router;
