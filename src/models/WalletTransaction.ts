import mongoose from "mongoose";

export const WALLET_REASONS = [
  "Refund",
  "Cashback",
  "Referral",
  "Promo",
  "OrderPayment", // debit when wallet is used to pay
  "Adjustment",   // manual admin credit/debit
] as const;

const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Positive = credit, negative = debit. The User.walletBalance is the running sum.
    amount: { type: Number, required: true },
    reason: { type: String, enum: WALLET_REASONS, required: true },
    description: { type: String },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
