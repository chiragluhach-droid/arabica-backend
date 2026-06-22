"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modifier = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const modifierOptionSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true }, // e.g., "Regular", "Large", "Oat Milk"
    priceAdjustment: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
});
const modifierSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true }, // e.g., "Size", "Milk", "Temperature"
    type: { type: String, enum: ["single", "multiple"], default: "single" },
    isRequired: { type: Boolean, default: true },
    options: [modifierOptionSchema],
}, { timestamps: true });
exports.Modifier = mongoose_1.default.model("Modifier", modifierSchema);
