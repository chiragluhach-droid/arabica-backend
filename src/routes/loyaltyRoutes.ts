import express from "express";
import {
  getLoyaltyInfo,
  redeemReward,
  updateLoyaltyConfig,
  updateMembershipConfig,
} from "../controllers/loyaltyController";
import { protect, adminOnly } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", getLoyaltyInfo); // public config + reward catalogue
router.post("/redeem", protect, redeemReward);

// Admin config
router.patch("/config", protect, adminOnly, updateLoyaltyConfig);
router.patch("/membership-config", protect, adminOnly, updateMembershipConfig);

export default router;
