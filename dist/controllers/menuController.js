"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenuForBranch = void 0;
const Branch_1 = require("../models/Branch");
const Category_1 = require("../models/Category");
const Product_1 = require("../models/Product");
const getMenuForBranch = async (req, res) => {
    try {
        const { branchSlug } = req.params;
        const branch = await Branch_1.Branch.findOne({ slug: branchSlug });
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        // Get products available at this branch, populating category and modifiers
        const products = await Product_1.Product.find({
            branchAvailability: branch._id,
            isOutOfStock: false,
        })
            .populate("category")
            .populate("modifiers");
        // We can format this by categories for the frontend, or the frontend can do it.
        // Let's send raw products and let frontend group by category, or group it here.
        // Sending it structured is easier for the frontend.
        const categories = await Category_1.Category.find().sort({ order: 1 });
        const menu = categories.map((cat) => {
            return {
                _id: cat._id,
                name: cat.name,
                slug: cat.slug,
                products: products.filter((p) => p.category._id.toString() === cat._id.toString()),
            };
        }).filter(cat => cat.products.length > 0); // Only return categories that have products
        res.status(200).json({ branch, menu });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getMenuForBranch = getMenuForBranch;
