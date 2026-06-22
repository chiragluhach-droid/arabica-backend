"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMembershipConfig = exports.updateLoyaltyConfig = exports.redeemReward = exports.getLoyaltyInfo = void 0;
const LoyaltyConfig_1 = require("../models/LoyaltyConfig");
const MembershipConfig_1 = require("../models/MembershipConfig");
const User_1 = require("../models/User");
const walletService_1 = require("../services/walletService");
const notificationService_1 = require("../services/notificationService");
/** Public: beans config + reward catalogue (so the dashboard can render the progress bar). */
const getLoyaltyInfo = async (_req, res) => {
    try {
        const [loyalty, membership] = await Promise.all([(0, LoyaltyConfig_1.getLoyaltyConfig)(), (0, MembershipConfig_1.getMembershipConfig)()]);
        res.status(200).json({ loyalty, membership });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getLoyaltyInfo = getLoyaltyInfo;
/** Customer: redeem beans for a reward in the catalogue. */
const redeemReward = async (req, res) => {
    try {
        const { rewardKey } = req.body;
        const userId = req.user.userId;
        const cfg = await (0, LoyaltyConfig_1.getLoyaltyConfig)();
        const reward = cfg.rewards.find((r) => r.key === rewardKey && r.isActive);
        if (!reward)
            return res.status(404).json({ message: "Reward not found" });
        const user = await User_1.User.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if ((user.beans || 0) < reward.beansCost) {
            return res.status(400).json({ message: "Not enough beans for this reward" });
        }
        user.beans = (user.beans || 0) - reward.beansCost;
        await user.save();
        const io = req.io;
        if (reward.rewardType === "WalletCredit") {
            await (0, walletService_1.applyWalletChange)({
                userId,
                amount: reward.rewardValue,
                reason: "Promo",
                description: `Redeemed: ${reward.label}`,
            });
        }
        else if (reward.rewardType === "Membership" && reward.membershipTier) {
            user.membershipTier = reward.membershipTier;
            await user.save();
        }
        // FreeItem rewards issue a one-off voucher concept; recorded via notification for MVP.
        await (0, notificationService_1.notify)({
            userId,
            type: "RewardUnlocked",
            title: "Reward redeemed 🎉",
            body: `You redeemed "${reward.label}" for ${reward.beansCost} beans.`,
            io,
        });
        const fresh = await User_1.User.findById(userId);
        res.status(200).json({ message: "Reward redeemed", user: fresh });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.redeemReward = redeemReward;
// ---------------- Admin config ----------------
const updateLoyaltyConfig = async (req, res) => {
    try {
        const cfg = await LoyaltyConfig_1.LoyaltyConfig.findOneAndUpdate({ singleton: "loyalty" }, req.body, {
            new: true,
            upsert: true,
        });
        res.status(200).json(cfg);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateLoyaltyConfig = updateLoyaltyConfig;
const updateMembershipConfig = async (req, res) => {
    try {
        const cfg = await MembershipConfig_1.MembershipConfig.findOneAndUpdate({ singleton: "membership" }, req.body, {
            new: true,
            upsert: true,
        });
        res.status(200).json(cfg);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateMembershipConfig = updateMembershipConfig;
