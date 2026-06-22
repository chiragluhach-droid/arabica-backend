"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Customer
router.post("/login", authController_1.loginWithPhone);
// Management (separate from customers)
router.post("/admin-login", authController_1.adminLogin);
router.post("/vendor-login", authController_1.loginVendor); // branchId + password
router.post("/partner-login", authController_1.partnerLogin); // partnerId + password
router.patch("/admin-account", authMiddleware_1.protect, authMiddleware_1.adminOnly, authController_1.updateAdminAccount);
router.get("/me", authMiddleware_1.protect, authController_1.getMe);
router.patch("/profile", authMiddleware_1.protect, authController_1.updateProfile);
// Map-based saved addresses
router.post("/addresses", authMiddleware_1.protect, authController_1.addAddress);
router.patch("/addresses/:addressId", authMiddleware_1.protect, authController_1.updateAddress);
router.delete("/addresses/:addressId", authMiddleware_1.protect, authController_1.deleteAddress);
exports.default = router;
