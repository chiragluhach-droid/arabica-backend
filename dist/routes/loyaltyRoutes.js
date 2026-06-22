"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const loyaltyController_1 = require("../controllers/loyaltyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/", loyaltyController_1.getLoyaltyInfo); // public config + reward catalogue
router.post("/redeem", authMiddleware_1.protect, loyaltyController_1.redeemReward);
// Admin config
router.patch("/config", authMiddleware_1.protect, authMiddleware_1.adminOnly, loyaltyController_1.updateLoyaltyConfig);
router.patch("/membership-config", authMiddleware_1.protect, authMiddleware_1.adminOnly, loyaltyController_1.updateMembershipConfig);
exports.default = router;
