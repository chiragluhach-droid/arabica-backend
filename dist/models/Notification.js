"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const notificationSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
        type: String,
        enum: ["OrderUpdate", "Coupon", "Birthday", "RewardUnlocked", "FlashSale", "MembershipUpgrade", "LowStock"],
        required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    meta: { type: mongoose_1.default.Schema.Types.Mixed },
}, { timestamps: true });
exports.Notification = mongoose_1.default.model("Notification", notificationSchema);
