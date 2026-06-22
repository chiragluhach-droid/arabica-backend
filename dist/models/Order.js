"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = exports.ORDER_STATUSES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const orderItemSchema = new mongoose_1.default.Schema({
    product: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    basePrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    modifiers: [
        {
            name: { type: String },
            option: { type: String },
            priceAdjustment: { type: Number, default: 0 }
        }
    ],
    totalItemPrice: { type: Number, required: true }
});
// Canonical lifecycle. "Out for Delivery" only applies to Delivery orders.
exports.ORDER_STATUSES = [
    "Placed",
    "Accepted",
    "Preparing",
    "Ready",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
];
const statusEventSchema = new mongoose_1.default.Schema({
    status: { type: String, enum: exports.ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String },
}, { _id: false });
const orderSchema = new mongoose_1.default.Schema({
    // Optional: POS walk-in orders have no customer account.
    user: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    branch: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Branch", required: true },
    items: [orderItemSchema],
    orderType: { type: String, enum: ["Dine-in", "Pickup", "Delivery"], required: true },
    tableNumber: { type: String },
    // Channel: "online" (customer app) or "pos" (vendor counter).
    source: { type: String, enum: ["online", "pos"], default: "online" },
    placedBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" }, // vendor/admin who rang up a POS order
    // Receipt / printing
    billNo: { type: Number }, // per-branch sequential bill number
    printCount: { type: Number, default: 0 },
    lastPrintedAt: { type: Date },
    // Delivery details (only for orderType === "Delivery")
    deliveryAddress: { type: String },
    deliveryLocation: {
        lat: { type: Number },
        lng: { type: Number },
    },
    deliveryDistanceKM: { type: Number },
    deliveryFee: { type: Number, default: 0 },
    deliveryPartner: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
    deliveryOtp: { type: String, select: false }, // verified by partner on handover
    status: {
        type: String,
        enum: exports.ORDER_STATUSES,
        default: "Placed",
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    // Money breakdown
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    // Loyalty / wallet / coupon
    beansUsed: { type: Number, default: 0 },
    beansEarned: { type: Number, default: 0 },
    walletUsed: { type: Number, default: 0 },
    coupon: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Coupon" },
    promoCode: { type: String },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed", "Refunded"],
        default: "Pending",
    },
    // Abstracted method — online: COD/Cash on Pickup/Wallet/Razorpay; POS: Cash/Card/UPI.
    paymentMethod: {
        type: String,
        enum: ["COD", "Cash on Pickup", "Wallet", "Razorpay", "Cash", "Card", "UPI"],
        default: "Cash on Pickup",
    },
    paymentRef: { type: String },
    notes: { type: String },
}, { timestamps: true });
exports.Order = mongoose_1.default.model("Order", orderSchema);
