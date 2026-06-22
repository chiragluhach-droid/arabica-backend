"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const posController_1 = require("../controllers/posController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post("/", authMiddleware_1.protect, orderController_1.createOrder);
// POS (counter) order entry — staff only
router.post("/pos", authMiddleware_1.protect, posController_1.createPosOrder);
router.get("/me", authMiddleware_1.protect, orderController_1.getMyOrders);
// Delivery distance + charge quote for checkout
router.post("/delivery-quote", authMiddleware_1.protect, orderController_1.getDeliveryQuote);
// Delivery partner flows (specific routes BEFORE the /:id catch-all)
router.get("/partners", authMiddleware_1.protect, orderController_1.getAvailablePartners);
router.get("/partner/me", authMiddleware_1.protect, orderController_1.getPartnerOrders);
router.get("/branch/:branchId", authMiddleware_1.protect, orderController_1.getBranchOrders);
router.get("/:id", authMiddleware_1.protect, orderController_1.getOrderById);
router.patch("/:id/status", authMiddleware_1.protect, orderController_1.updateOrderStatus);
router.patch("/:id/assign", authMiddleware_1.protect, orderController_1.assignPartner);
router.patch("/:id/verify-otp", authMiddleware_1.protect, orderController_1.verifyDeliveryOtp);
router.patch("/:id/printed", authMiddleware_1.protect, orderController_1.markPrinted);
exports.default = router;
