"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletTransaction = exports.WALLET_REASONS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.WALLET_REASONS = [
    "Refund",
    "Cashback",
    "Referral",
    "Promo",
    "OrderPayment", // debit when wallet is used to pay
    "Adjustment", // manual admin credit/debit
];
const walletTransactionSchema = new mongoose_1.default.Schema({
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Positive = credit, negative = debit. The User.walletBalance is the running sum.
    amount: { type: Number, required: true },
    reason: { type: String, enum: exports.WALLET_REASONS, required: true },
    description: { type: String },
    order: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Order" },
    balanceAfter: { type: Number, required: true },
}, { timestamps: true });
exports.WalletTransaction = mongoose_1.default.model("WalletTransaction", walletTransactionSchema);
