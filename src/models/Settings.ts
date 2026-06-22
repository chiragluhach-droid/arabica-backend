import mongoose from "mongoose";

// Single global app-settings document (admin-editable).
const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "app", unique: true },
    gstPercent: { type: Number, default: 5 },
    // Operating channels:
    //  - posEnabled: in-store POS billing (vendor POS screen)
    //  - deliveryEnabled: online channel — customer ordering + KDS + delivery partners
    posEnabled: { type: Boolean, default: true },
    deliveryEnabled: { type: Boolean, default: true },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

export async function getSettings() {
  let s = await Settings.findOne({ singleton: "app" });
  if (!s) s = await Settings.create({ singleton: "app" });
  return s;
}
