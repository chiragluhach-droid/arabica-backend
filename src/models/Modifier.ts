import mongoose from "mongoose";

const modifierOptionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Regular", "Large", "Oat Milk"
  priceAdjustment: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
});

const modifierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Size", "Milk", "Temperature"
    type: { type: String, enum: ["single", "multiple"], default: "single" },
    isRequired: { type: Boolean, default: true },
    options: [modifierOptionSchema],
  },
  { timestamps: true }
);

export const Modifier = mongoose.model("Modifier", modifierSchema);
