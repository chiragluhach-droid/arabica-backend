import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    order: { type: Number, default: 0 },
    image: { type: String }, // Optional image for category
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);
