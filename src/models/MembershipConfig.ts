import mongoose from "mongoose";

// Admin-editable membership tiers (singleton). Tiers upgrade automatically based
// on lifetime spend thresholds. Each tier carries configurable perks.

const tierSchema = new mongoose.Schema(
  {
    tier: { type: String, enum: ["Silver", "Gold", "Platinum"], required: true },
    minSpend: { type: Number, required: true }, // lifetime spend to reach this tier
    cashbackPercent: { type: Number, default: 0 },
    freeDelivery: { type: Boolean, default: false },
    birthdayReward: { type: Boolean, default: false },
    exclusiveMenu: { type: Boolean, default: false },
    priorityService: { type: Boolean, default: false },
  },
  { _id: false }
);

const membershipConfigSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "membership", unique: true },
    tiers: {
      type: [tierSchema],
      default: [
        { tier: "Silver", minSpend: 2000, cashbackPercent: 5, freeDelivery: false, birthdayReward: false, exclusiveMenu: false, priorityService: false },
        { tier: "Gold", minSpend: 7500, cashbackPercent: 10, freeDelivery: false, birthdayReward: true, exclusiveMenu: false, priorityService: true },
        { tier: "Platinum", minSpend: 20000, cashbackPercent: 15, freeDelivery: true, birthdayReward: true, exclusiveMenu: true, priorityService: true },
      ],
    },
  },
  { timestamps: true }
);

export const MembershipConfig = mongoose.model("MembershipConfig", membershipConfigSchema);

export async function getMembershipConfig() {
  let cfg = await MembershipConfig.findOne({ singleton: "membership" });
  if (!cfg) cfg = await MembershipConfig.create({ singleton: "membership" });
  return cfg;
}
