"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const productSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true },
    image: { type: String, required: true }, // Cloudinary URL
    category: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    modifiers: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Modifier",
        },
    ],
    // Branches where this product is available
    branchAvailability: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: "Branch",
        },
    ],
    isOutOfStock: { type: Boolean, default: false },
}, { timestamps: true });
exports.Product = mongoose_1.default.model("Product", productSchema);
