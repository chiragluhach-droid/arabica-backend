import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["OrderUpdate", "Coupon", "Birthday", "RewardUnlocked", "FlashSale", "MembershipUpgrade", "LowStock"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
