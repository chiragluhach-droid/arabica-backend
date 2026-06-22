"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.adminUpdateOrder = exports.getAllOrders = exports.getCustomers = exports.deletePartner = exports.updatePartner = exports.createPartner = exports.getPartners = exports.deleteVendor = exports.updateVendor = exports.createVendor = exports.getVendors = exports.deleteBranch = exports.updateBranch = exports.createBranch = exports.getAdminBranches = exports.getMeta = exports.uploadImage = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getAllProducts = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const Product_1 = require("../models/Product");
const Category_1 = require("../models/Category");
const Modifier_1 = require("../models/Modifier");
const Branch_1 = require("../models/Branch");
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
const password_1 = require("../utils/password");
const slugify = (s) => s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
// GET /api/admin/products — all products (including out of stock) for management
const getAllProducts = async (_req, res) => {
    try {
        const products = await Product_1.Product.find()
            .populate("category")
            .populate("modifiers")
            .sort({ createdAt: -1 });
        res.status(200).json(products);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getAllProducts = getAllProducts;
// POST /api/admin/products — create a product
const createProduct = async (req, res) => {
    try {
        const { name, description, basePrice, image, category, modifiers, branchAvailability } = req.body;
        if (!name || basePrice == null || !image || !category) {
            return res.status(400).json({ message: "Name, base price, image and category are required" });
        }
        // Default: available at every branch unless caller specifies a subset
        let branches = branchAvailability;
        if (!branches || branches.length === 0) {
            branches = (await Branch_1.Branch.find().select("_id")).map((b) => b._id);
        }
        const product = await Product_1.Product.create({
            name,
            description,
            basePrice,
            image,
            category,
            modifiers: modifiers || [],
            branchAvailability: branches,
        });
        const populated = await Product_1.Product.findById(product._id)
            .populate("category")
            .populate("modifiers");
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createProduct = createProduct;
// PATCH /api/admin/products/:id — update a product
const updateProduct = async (req, res) => {
    try {
        const { name, description, basePrice, image, category, modifiers, branchAvailability, isOutOfStock } = req.body;
        const update = {};
        if (name !== undefined)
            update.name = name;
        if (description !== undefined)
            update.description = description;
        if (basePrice !== undefined)
            update.basePrice = basePrice;
        if (image !== undefined)
            update.image = image;
        if (category !== undefined)
            update.category = category;
        if (modifiers !== undefined)
            update.modifiers = modifiers;
        if (branchAvailability !== undefined)
            update.branchAvailability = branchAvailability;
        if (isOutOfStock !== undefined)
            update.isOutOfStock = isOutOfStock;
        const product = await Product_1.Product.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate("category")
            .populate("modifiers");
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json(product);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateProduct = updateProduct;
// DELETE /api/admin/products/:id
const deleteProduct = async (req, res) => {
    try {
        const product = await Product_1.Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.status(200).json({ message: "Product deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deleteProduct = deleteProduct;
// POST /api/admin/upload — upload a base64 data-URL image to Cloudinary, return the URL
const uploadImage = async (req, res) => {
    try {
        const { image } = req.body; // expects a base64 data URL: "data:image/png;base64,...."
        if (!image) {
            return res.status(400).json({ message: "No image provided" });
        }
        const result = await cloudinary_1.default.uploader.upload(image, {
            folder: "arabica-coffee/products",
            resource_type: "image",
        });
        res.status(200).json({ url: result.secure_url });
    }
    catch (error) {
        res.status(500).json({ message: "Image upload failed", error: error.message });
    }
};
exports.uploadImage = uploadImage;
// GET /api/admin/meta — categories, modifiers and branches for building forms
const getMeta = async (_req, res) => {
    try {
        const [categories, modifiers, branches] = await Promise.all([
            Category_1.Category.find().sort({ order: 1 }),
            Modifier_1.Modifier.find(),
            Branch_1.Branch.find().select("name slug"),
        ]);
        res.status(200).json({ categories, modifiers, branches });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getMeta = getMeta;
// ----------------------- Branch management -----------------------
// GET /api/admin/branches — all branches (including inactive)
const getAdminBranches = async (_req, res) => {
    try {
        const branches = await Branch_1.Branch.find().sort({ createdAt: 1 });
        res.status(200).json(branches);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getAdminBranches = getAdminBranches;
// POST /api/admin/branches
const createBranch = async (req, res) => {
    try {
        const { name, address, location, contactNumber, deliveryRadiusKM, deliveryCharges, openingHours, managerName, isActive } = req.body;
        if (!name || !address || !contactNumber) {
            return res.status(400).json({ message: "Name, address and contact number are required" });
        }
        const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
        if (await Branch_1.Branch.findOne({ slug })) {
            return res.status(409).json({ message: `A branch with slug "${slug}" already exists` });
        }
        const branch = await Branch_1.Branch.create({
            name,
            slug,
            address,
            location: location || { lat: 0, lng: 0 },
            contactNumber,
            deliveryRadiusKM: deliveryRadiusKM ?? 10,
            deliveryCharges: deliveryCharges || [
                { maxDistanceKM: 3, charge: 0 },
                { maxDistanceKM: 6, charge: 30 },
                { maxDistanceKM: 10, charge: 60 },
            ],
            openingHours: openingHours || { open: "08:00", close: "23:00" },
            managerName,
            isActive: isActive ?? true,
            vendorPassword: req.body.vendorPassword ? (0, password_1.hashPassword)(req.body.vendorPassword) : undefined,
        });
        res.status(201).json(branch);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createBranch = createBranch;
// PATCH /api/admin/branches/:id
const updateBranch = async (req, res) => {
    try {
        const fields = ["name", "address", "location", "contactNumber", "deliveryRadiusKM", "deliveryCharges", "openingHours", "managerName", "isActive"];
        const update = {};
        for (const f of fields)
            if (req.body[f] !== undefined)
                update[f] = req.body[f];
        if (req.body.slug !== undefined)
            update.slug = slugify(req.body.slug);
        // Only overwrite the vendor password when a new non-empty one is provided.
        if (req.body.vendorPassword)
            update.vendorPassword = (0, password_1.hashPassword)(req.body.vendorPassword);
        const branch = await Branch_1.Branch.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        res.status(200).json(branch);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateBranch = updateBranch;
// DELETE /api/admin/branches/:id
const deleteBranch = async (req, res) => {
    try {
        const branch = await Branch_1.Branch.findByIdAndDelete(req.params.id);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        // Unassign any vendors tied to this branch
        await User_1.User.updateMany({ branch: branch._id }, { $unset: { branch: "" }, isActive: false });
        res.status(200).json({ message: "Branch deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deleteBranch = deleteBranch;
// ----------------------- Vendor management -----------------------
// GET /api/admin/vendors
const getVendors = async (_req, res) => {
    try {
        const vendors = await User_1.User.find({ role: "vendor" })
            .select("-password")
            .populate("branch", "name slug")
            .sort({ createdAt: -1 });
        res.status(200).json(vendors);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getVendors = getVendors;
// POST /api/admin/vendors
const createVendor = async (req, res) => {
    try {
        const { name, username, password, branch } = req.body;
        if (!name || !username || !password || !branch) {
            return res.status(400).json({ message: "Name, username, password and branch are required" });
        }
        const uname = String(username).toLowerCase().trim();
        if (await User_1.User.findOne({ username: uname })) {
            return res.status(409).json({ message: `Username "${uname}" is already taken` });
        }
        if (!(await Branch_1.Branch.findById(branch))) {
            return res.status(400).json({ message: "Selected branch does not exist" });
        }
        const vendor = await User_1.User.create({
            name,
            username: uname,
            password: (0, password_1.hashPassword)(password),
            branch,
            role: "vendor",
            isActive: true,
        });
        const populated = await User_1.User.findById(vendor._id).select("-password").populate("branch", "name slug");
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createVendor = createVendor;
// PATCH /api/admin/vendors/:id
const updateVendor = async (req, res) => {
    try {
        const { name, branch, isActive, password } = req.body;
        const update = {};
        if (name !== undefined)
            update.name = name;
        if (branch !== undefined)
            update.branch = branch;
        if (isActive !== undefined)
            update.isActive = isActive;
        if (password)
            update.password = (0, password_1.hashPassword)(password); // only when a new password is provided
        const vendor = await User_1.User.findOneAndUpdate({ _id: req.params.id, role: "vendor" }, update, { new: true })
            .select("-password")
            .populate("branch", "name slug");
        if (!vendor)
            return res.status(404).json({ message: "Vendor not found" });
        res.status(200).json(vendor);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateVendor = updateVendor;
// DELETE /api/admin/vendors/:id
const deleteVendor = async (req, res) => {
    try {
        const vendor = await User_1.User.findOneAndDelete({ _id: req.params.id, role: "vendor" });
        if (!vendor)
            return res.status(404).json({ message: "Vendor not found" });
        res.status(200).json({ message: "Vendor deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deleteVendor = deleteVendor;
// ----------------------- Delivery partner management -----------------------
// GET /api/admin/partners
const getPartners = async (_req, res) => {
    try {
        const partners = await User_1.User.find({ role: "delivery" })
            .select("-password")
            .populate("branch", "name slug")
            .sort({ createdAt: -1 });
        res.status(200).json(partners);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getPartners = getPartners;
// POST /api/admin/partners
const createPartner = async (req, res) => {
    try {
        const { name, username, password, phone, branch } = req.body;
        if (!name || !username || !password) {
            return res.status(400).json({ message: "Name, username and password are required" });
        }
        const uname = String(username).toLowerCase().trim();
        if (await User_1.User.findOne({ username: uname })) {
            return res.status(409).json({ message: `Username "${uname}" is already taken` });
        }
        if (branch && !(await Branch_1.Branch.findById(branch))) {
            return res.status(400).json({ message: "Selected branch does not exist" });
        }
        const partner = await User_1.User.create({
            name,
            username: uname,
            password: (0, password_1.hashPassword)(password),
            phone,
            branch: branch || undefined,
            role: "delivery",
            isActive: true,
        });
        const populated = await User_1.User.findById(partner._id).select("-password").populate("branch", "name slug");
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createPartner = createPartner;
// PATCH /api/admin/partners/:id
const updatePartner = async (req, res) => {
    try {
        const { name, branch, isActive, password, phone } = req.body;
        const update = {};
        if (name !== undefined)
            update.name = name;
        if (phone !== undefined)
            update.phone = phone;
        if (branch !== undefined)
            update.branch = branch || undefined;
        if (isActive !== undefined)
            update.isActive = isActive;
        if (password)
            update.password = (0, password_1.hashPassword)(password);
        const partner = await User_1.User.findOneAndUpdate({ _id: req.params.id, role: "delivery" }, update, { new: true })
            .select("-password")
            .populate("branch", "name slug");
        if (!partner)
            return res.status(404).json({ message: "Partner not found" });
        res.status(200).json(partner);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updatePartner = updatePartner;
// DELETE /api/admin/partners/:id
const deletePartner = async (req, res) => {
    try {
        const partner = await User_1.User.findOneAndDelete({ _id: req.params.id, role: "delivery" });
        if (!partner)
            return res.status(404).json({ message: "Partner not found" });
        res.status(200).json({ message: "Partner deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deletePartner = deletePartner;
// ----------------------- Customer management -----------------------
// GET /api/admin/customers
const getCustomers = async (_req, res) => {
    try {
        const customers = await User_1.User.find({ role: "customer" }).select("-password").lean();
        // Calculate amount spent by aggregating orders
        const ordersAggregation = await Order_1.Order.aggregate([
            { $match: { user: { $in: customers.map((c) => c._id) }, status: { $ne: "cancelled" } } },
            { $group: { _id: "$user", totalSpent: { $sum: "$totalAmount" }, orderCount: { $sum: 1 } } }
        ]);
        const aggregatedData = new Map(ordersAggregation.map((a) => [a._id.toString(), a]));
        const result = customers.map((c) => {
            const data = aggregatedData.get(c._id.toString()) || { totalSpent: 0, orderCount: 0 };
            return {
                ...c,
                totalSpent: data.totalSpent,
                orderCount: data.orderCount,
            };
        });
        // Sort by total spent descending
        result.sort((a, b) => b.totalSpent - a.totalSpent);
        res.status(200).json(result);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getCustomers = getCustomers;
// ----------------------- Order management (admin: full powers) -----------------------
// GET /api/admin/orders?branch=&status=&source=&search=&limit=
const getAllOrders = async (req, res) => {
    try {
        const { branch, status, source, search, limit } = req.query;
        const filter = {};
        if (branch && branch !== "all")
            filter.branch = branch;
        if (status && status !== "all")
            filter.status = status;
        if (source && source !== "all")
            filter.source = source;
        if (search) {
            const n = Number(search);
            if (!isNaN(n))
                filter.billNo = n;
        }
        const orders = await Order_1.Order.find(filter)
            .populate("branch", "name slug")
            .populate("user", "name phone")
            .populate("deliveryPartner", "name phone")
            .sort({ createdAt: -1 })
            .limit(Number(limit) || 150);
        res.status(200).json(orders);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getAllOrders = getAllOrders;
// PATCH /api/admin/orders/:id — edit non-status fields (status uses /orders/:id/status)
const adminUpdateOrder = async (req, res) => {
    try {
        const fields = ["paymentStatus", "paymentMethod", "tableNumber", "notes", "orderType"];
        const update = {};
        for (const f of fields)
            if (req.body[f] !== undefined)
                update[f] = req.body[f];
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate("branch", "name slug")
            .populate("user", "name phone");
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        res.status(200).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.adminUpdateOrder = adminUpdateOrder;
// DELETE /api/admin/orders/:id
const deleteOrder = async (req, res) => {
    try {
        const order = await Order_1.Order.findByIdAndDelete(req.params.id);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        res.status(200).json({ message: "Order deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deleteOrder = deleteOrder;
