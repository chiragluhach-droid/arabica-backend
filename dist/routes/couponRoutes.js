"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const couponController_1 = require("../controllers/couponController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Customer
router.post("/preview", authMiddleware_1.protect, couponController_1.previewCoupon);
// Admin
router.get("/", authMiddleware_1.protect, authMiddleware_1.adminOnly, couponController_1.listCoupons);
router.post("/", authMiddleware_1.protect, authMiddleware_1.adminOnly, couponController_1.createCoupon);
router.patch("/:id", authMiddleware_1.protect, authMiddleware_1.adminOnly, couponController_1.updateCoupon);
router.delete("/:id", authMiddleware_1.protect, authMiddleware_1.adminOnly, couponController_1.deleteCoupon);
exports.default = router;
