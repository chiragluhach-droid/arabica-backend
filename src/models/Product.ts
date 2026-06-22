import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true },
    image: { type: String, required: true }, // Cloudinary URL
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    modifiers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Modifier",
      },
    ],
    // Branches where this product is available
    branchAvailability: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],
    isOutOfStock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
