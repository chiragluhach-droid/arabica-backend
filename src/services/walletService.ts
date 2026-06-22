import mongoose from "mongoose";
import { User } from "../models/User";
import { WalletTransaction, WALLET_REASONS } from "../models/WalletTransaction";

type Reason = (typeof WALLET_REASONS)[number];

interface WalletChange {
  userId: string | mongoose.Types.ObjectId;
  amount: number; // positive credit, negative debit
  reason: Reason;
  description?: string;
  orderId?: string | mongoose.Types.ObjectId;
}

/**
 * Apply a wallet change and record an immutable transaction row.
 * Returns the new balance. Throws if a debit would overdraw.
 */
export async function applyWalletChange({
  userId,
  amount,
  reason,
  description,
  orderId,
}: WalletChange): Promise<number> {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const current = user.walletBalance || 0;
  if (amount < 0 && current + amount < 0) {
    throw new Error("Insufficient wallet balance");
  }

  const balanceAfter = current + amount;
  user.walletBalance = balanceAfter;
  await user.save();

  await WalletTransaction.create({
    user: user._id,
    amount,
    reason,
    description,
    order: orderId,
    balanceAfter,
  });

  return balanceAfter;
}
