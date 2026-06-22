"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyWalletChange = applyWalletChange;
const User_1 = require("../models/User");
const WalletTransaction_1 = require("../models/WalletTransaction");
/**
 * Apply a wallet change and record an immutable transaction row.
 * Returns the new balance. Throws if a debit would overdraw.
 */
async function applyWalletChange({ userId, amount, reason, description, orderId, }) {
    const user = await User_1.User.findById(userId);
    if (!user)
        throw new Error("User not found");
    const current = user.walletBalance || 0;
    if (amount < 0 && current + amount < 0) {
        throw new Error("Insufficient wallet balance");
    }
    const balanceAfter = current + amount;
    user.walletBalance = balanceAfter;
    await user.save();
    await WalletTransaction_1.WalletTransaction.create({
        user: user._id,
        amount,
        reason,
        description,
        order: orderId,
        balanceAfter,
    });
    return balanceAfter;
}
