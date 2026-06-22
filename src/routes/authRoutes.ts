import express from "express";
import {
  loginWithPhone,
  adminLogin,
  loginVendor,
  partnerLogin,
  updateAdminAccount,
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/authController";
import { protect, adminOnly } from "../middleware/authMiddleware";

const router = express.Router();

// Customer
router.post("/login", loginWithPhone);

// Management (separate from customers)
router.post("/admin-login", adminLogin);
router.post("/vendor-login", loginVendor);   // branchId + password
router.post("/partner-login", partnerLogin); // partnerId + password
router.patch("/admin-account", protect, adminOnly, updateAdminAccount);

router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);

// Map-based saved addresses
router.post("/addresses", protect, addAddress);
router.patch("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);

export default router;
