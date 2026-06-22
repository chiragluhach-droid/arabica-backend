"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyConfig = void 0;
exports.getLoyaltyConfig = getLoyaltyConfig;
const mongoose_1 = __importDefault(require("mongoose"));
// A single global, admin-editable configuration document (singleton).
// Controls how Arabica Beans are earned and what they redeem for.
const rewardSchema = new mongoose_1.default.Schema({
    key: { type: String, required: true }, // e.g. "free_cookie"
    label: { type: String, required: true }, // "Free Cookie"
    beansCost: { type: Number, required: true },
    // What redeeming grants: a wallet voucher, a membership upgrade, or a free item.
    rewardType: {
        type: String,
        enum: ["WalletCredit", "Membership", "FreeItem"],
        default: "WalletCredit",
    },
    rewardValue: { type: Number, default: 0 }, // ₹ for WalletCredit
    membershipTier: { type: String, enum: ["Silver", "Gold", "Platinum"] },
    isActive: { type: Boolean, default: true },
}, { _id: false });
const loyaltyConfigSchema = new mongoose_1.default.Schema({
    singleton: { type: String, default: "loyalty", unique: true },
    // Beans earned per this many rupees spent.
    beansPerAmount: { type: Number, default: 10 }, // 10 beans
    perAmount: { type: Number, default: 100 }, // per ₹100
    // 1 bean redeem value in rupees when spent at checkout.
    beanRedeemValue: { type: Number, default: 1 },
    rewards: {
        type: [rewardSchema],
        default: [
            { key: "free_cookie", label: "Free Cookie", beansCost: 500, rewardType: "FreeItem", rewardValue: 0 },
            { key: "free_coffee", label: "Free Coffee", beansCost: 1000, rewardType: "FreeItem", rewardValue: 0 },
            { key: "voucher_250", label: "₹250 Voucher", beansCost: 2500, rewardType: "WalletCredit", rewardValue: 250 },
            { key: "gold_membership", label: "Gold Membership", beansCost: 5000, rewardType: "Membership", membershipTier: "Gold" },
        ],
    },
}, { timestamps: true });
exports.LoyaltyConfig = mongoose_1.default.model("LoyaltyConfig", loyaltyConfigSchema);
// Convenience: always return the singleton, creating it with defaults if missing.
async function getLoyaltyConfig() {
    let cfg = await exports.LoyaltyConfig.findOne({ singleton: "loyalty" });
    if (!cfg)
        cfg = await exports.LoyaltyConfig.create({ singleton: "loyalty" });
    return cfg;
}
