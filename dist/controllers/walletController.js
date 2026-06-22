"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyWallet = void 0;
const User_1 = require("../models/User");
const WalletTransaction_1 = require("../models/WalletTransaction");
const getMyWallet = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [user, transactions] = await Promise.all([
            User_1.User.findById(userId).select("walletBalance beans membershipTier"),
            WalletTransaction_1.WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
        ]);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.status(200).json({
            balance: user.walletBalance || 0,
            beans: user.beans || 0,
            membershipTier: user.membershipTier,
            transactions,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getMyWallet = getMyWallet;
