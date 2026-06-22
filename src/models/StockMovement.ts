import mongoose from "mongoose";

export const MOVEMENT_TYPES = ["restock", "adjust", "waste", "consume"] as const;

// Immutable audit trail for every stock change (Zoho-style ledger).
const stockMovementSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    quantityChange: { type: Number, required: true }, // +restock, -waste/consume, ± adjust
    balanceAfter: { type: Number, required: true },
    note: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
