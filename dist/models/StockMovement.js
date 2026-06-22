"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockMovement = exports.MOVEMENT_TYPES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
exports.MOVEMENT_TYPES = ["restock", "adjust", "waste", "consume"];
// Immutable audit trail for every stock change (Zoho-style ledger).
const stockMovementSchema = new mongoose_1.default.Schema({
    item: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
    branch: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Branch", required: true },
    type: { type: String, enum: exports.MOVEMENT_TYPES, required: true },
    quantityChange: { type: Number, required: true }, // +restock, -waste/consume, ± adjust
    balanceAfter: { type: Number, required: true },
    note: { type: String },
    by: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
exports.StockMovement = mongoose_1.default.model("StockMovement", stockMovementSchema);
