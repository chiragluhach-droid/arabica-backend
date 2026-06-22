import mongoose from "mongoose";

export const INVENTORY_CATEGORIES = ["Beans", "Dairy", "Syrups", "Packaging", "Bakery", "Other"] as const;
export const INVENTORY_UNITS = ["kg", "g", "L", "ml", "pcs", "pack"] as const;

// Per-branch raw-material inventory (manual stock; no auto-deduct on sale).
const inventoryItemSchema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: INVENTORY_CATEGORIES, default: "Other" },
    unit: { type: String, enum: INVENTORY_UNITS, default: "pcs" },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    sku: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ branch: 1, name: 1 });

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
