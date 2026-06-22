"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryItem = exports.INVENTORY_UNITS = exports.INVENTORY_CATEGORIES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.INVENTORY_CATEGORIES = ["Beans", "Dairy", "Syrups", "Packaging", "Bakery", "Other"];
exports.INVENTORY_UNITS = ["kg", "g", "L", "ml", "pcs", "pack"];
// Per-branch raw-material inventory (manual stock; no auto-deduct on sale).
const inventoryItemSchema = new mongoose_1.default.Schema({
    branch: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: exports.INVENTORY_CATEGORIES, default: "Other" },
    unit: { type: String, enum: exports.INVENTORY_UNITS, default: "pcs" },
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    sku: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
inventoryItemSchema.index({ branch: 1, name: 1 });
exports.InventoryItem = mongoose_1.default.model("InventoryItem", inventoryItemSchema);
