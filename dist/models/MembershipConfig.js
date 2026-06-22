"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipConfig = void 0;
exports.getMembershipConfig = getMembershipConfig;
const mongoose_1 = __importDefault(require("mongoose"));
// Admin-editable membership tiers (singleton). Tiers upgrade automatically based
// on lifetime spend thresholds. Each tier carries configurable perks.
const tierSchema = new mongoose_1.default.Schema({
    tier: { type: String, enum: ["Silver", "Gold", "Platinum"], required: true },
    minSpend: { type: Number, required: true }, // lifetime spend to reach this tier
    cashbackPercent: { type: Number, default: 0 },
    freeDelivery: { type: Boolean, default: false },
    birthdayReward: { type: Boolean, default: false },
    exclusiveMenu: { type: Boolean, default: false },
    priorityService: { type: Boolean, default: false },
}, { _id: false });
const membershipConfigSchema = new mongoose_1.default.Schema({
    singleton: { type: String, default: "membership", unique: true },
    tiers: {
        type: [tierSchema],
        default: [
            { tier: "Silver", minSpend: 2000, cashbackPercent: 5, freeDelivery: false, birthdayReward: false, exclusiveMenu: false, priorityService: false },
            { tier: "Gold", minSpend: 7500, cashbackPercent: 10, freeDelivery: false, birthdayReward: true, exclusiveMenu: false, priorityService: true },
            { tier: "Platinum", minSpend: 20000, cashbackPercent: 15, freeDelivery: true, birthdayReward: true, exclusiveMenu: true, priorityService: true },
        ],
    },
}, { timestamps: true });
exports.MembershipConfig = mongoose_1.default.model("MembershipConfig", membershipConfigSchema);
async function getMembershipConfig() {
    let cfg = await exports.MembershipConfig.findOne({ singleton: "membership" });
    if (!cfg)
        cfg = await exports.MembershipConfig.create({ singleton: "membership" });
    return cfg;
}
