import mongoose from "mongoose";

export const COUPON_TYPES = [
  "Flat",          // flat ₹ off
  "Percentage",    // % off (with optional maxDiscount cap)
  "FreeProduct",   // a free product added/discounted
  "BuyXGetY",      // buy X qty, get Y free
  "FirstOrder",    // only valid on the customer's first order
  "Birthday",      // only valid around the customer's birthday
  "Festival",      // time-boxed festival promo
] as const;

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    type: { type: String, enum: COUPON_TYPES, required: true },

    // Value semantics depend on `type`:
    //  - Flat: rupees off; Percentage: percent off
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number }, // cap for Percentage
    minOrder: { type: Number, default: 0 },

    // BuyXGetY / FreeProduct
    buyQuantity: { type: Number },
    getQuantity: { type: Number },
    freeProduct: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },

    // Constraints
    eligibleBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }], // empty = all
    eligibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }], // empty = all
    usageLimit: { type: Number, default: 0 },        // 0 = unlimited (total)
    perUserLimit: { type: Number, default: 1 },      // 0 = unlimited per user
    usedCount: { type: Number, default: 0 },
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    startsAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Coupon = mongoose.model("Coupon", couponSchema);
