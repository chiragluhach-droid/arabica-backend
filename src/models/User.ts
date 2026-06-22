import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, unique: true, sparse: true },
    name: { type: String },
    email: { type: String },
    authProviders: [{ type: String }],
    role: { type: String, enum: ["customer", "admin", "vendor", "delivery"], default: "customer" },
    // Vendor (branch staff) credentials — vendors log in with username + password
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    password: { type: String, select: false }, // scrypt "salt:hash"
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" }, // the branch a vendor manages
    isActive: { type: Boolean, default: true },
    beans: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },

    // Loyalty / membership
    membershipTier: { type: String, enum: ["None", "Silver", "Gold", "Platinum"], default: "None" },
    birthday: { type: Date },

    // Referral
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referralRewarded: { type: Boolean, default: false }, // referrer paid out after referee's 1st order

    // CRM
    tags: [{ type: String, enum: ["VIP", "Regular", "High Value", "Inactive"] }],

    addresses: [
      {
        type: { type: String, enum: ["Home", "Work", "Other"] },
        fullAddress: String,
        location: {
          lat: Number,
          lng: Number,
        },
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
