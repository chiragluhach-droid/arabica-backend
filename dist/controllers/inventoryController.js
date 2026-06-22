"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getItemMovements = exports.bulkUpdate = exports.adjustStock = exports.deleteItem = exports.updateItem = exports.createItem = exports.listItems = void 0;
const InventoryItem_1 = require("../models/InventoryItem");
const StockMovement_1 = require("../models/StockMovement");
const User_1 = require("../models/User");
const notificationService_1 = require("../services/notificationService");
// Resolve the branch a request may operate on. Vendors are locked to their own
// branch; admins may target any branch (via query/body) or all.
function branchScope(req) {
    const r = req.user;
    if (r.role === "vendor")
        return { vendor: true, branchId: String(r.branch) };
    return { vendor: false, branchId: req.query.branch || req.body?.branchId };
}
const listItems = async (req, res) => {
    try {
        const { vendor, branchId } = branchScope(req);
        const { category, status, search } = req.query;
        const filter = {};
        if (vendor)
            filter.branch = branchId;
        else if (branchId && branchId !== "all")
            filter.branch = branchId;
        if (category && category !== "all")
            filter.category = category;
        if (search)
            filter.name = { $regex: search, $options: "i" };
        if (status === "out")
            filter.currentStock = { $lte: 0 };
        else if (status === "low")
            filter.$expr = { $and: [{ $gt: ["$currentStock", 0] }, { $lte: ["$currentStock", "$lowStockThreshold"] }] };
        const items = await InventoryItem_1.InventoryItem.find(filter).populate("branch", "name slug").sort({ name: 1 });
        res.status(200).json(items);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.listItems = listItems;
const createItem = async (req, res) => {
    try {
        const { vendor, branchId } = branchScope(req);
        const targetBranch = vendor ? branchId : req.body.branch || branchId;
        if (!targetBranch)
            return res.status(400).json({ message: "Branch is required" });
        const { name, category, unit, currentStock, lowStockThreshold, costPerUnit, sku } = req.body;
        if (!name)
            return res.status(400).json({ message: "Item name is required" });
        const item = await InventoryItem_1.InventoryItem.create({
            branch: targetBranch,
            name,
            category,
            unit,
            currentStock: Number(currentStock) || 0,
            lowStockThreshold: Number(lowStockThreshold) || 0,
            costPerUnit: Number(costPerUnit) || 0,
            sku,
        });
        const populated = await InventoryItem_1.InventoryItem.findById(item._id).populate("branch", "name slug");
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createItem = createItem;
async function assertBranchAccess(req, item) {
    const r = req.user;
    if (r.role === "admin")
        return true;
    return String(item.branch?._id || item.branch) === String(r.branch);
}
const updateItem = async (req, res) => {
    try {
        const item = await InventoryItem_1.InventoryItem.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Item not found" });
        if (!(await assertBranchAccess(req, item)))
            return res.status(403).json({ message: "Not authorized for this branch" });
        const fields = ["name", "category", "unit", "lowStockThreshold", "costPerUnit", "sku", "isActive"];
        for (const f of fields)
            if (req.body[f] !== undefined)
                item[f] = req.body[f];
        await item.save();
        const populated = await InventoryItem_1.InventoryItem.findById(item._id).populate("branch", "name slug");
        res.status(200).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateItem = updateItem;
const deleteItem = async (req, res) => {
    try {
        const item = await InventoryItem_1.InventoryItem.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Item not found" });
        if (!(await assertBranchAccess(req, item)))
            return res.status(403).json({ message: "Not authorized for this branch" });
        await item.deleteOne();
        res.status(200).json({ message: "Item deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deleteItem = deleteItem;
// Restock / adjust / waste — records a StockMovement and updates the balance.
const adjustStock = async (req, res) => {
    try {
        const { type, quantity, note } = req.body;
        if (!StockMovement_1.MOVEMENT_TYPES.includes(type))
            return res.status(400).json({ message: "Invalid movement type" });
        const qty = Number(quantity);
        if (!qty || qty <= 0)
            return res.status(400).json({ message: "Enter a quantity greater than zero" });
        const item = await InventoryItem_1.InventoryItem.findById(req.params.id);
        if (!item)
            return res.status(404).json({ message: "Item not found" });
        if (!(await assertBranchAccess(req, item)))
            return res.status(403).json({ message: "Not authorized for this branch" });
        const wasAboveThreshold = item.currentStock > item.lowStockThreshold;
        // restock adds; waste/consume subtract; adjust sets to the given absolute value.
        let change = 0;
        if (type === "restock")
            change = qty;
        else if (type === "waste" || type === "consume")
            change = -qty;
        else if (type === "adjust")
            change = qty - item.currentStock; // set-to value
        item.currentStock = Math.max(0, item.currentStock + change);
        await item.save();
        await StockMovement_1.StockMovement.create({
            item: item._id,
            branch: item.branch,
            type,
            quantityChange: change,
            balanceAfter: item.currentStock,
            note,
            by: req.user.userId,
        });
        // Low-stock alert when an item crosses into the danger zone.
        if (wasAboveThreshold && item.currentStock <= item.lowStockThreshold) {
            const admins = await User_1.User.find({ role: "admin" }).select("_id");
            const io = req.io;
            await Promise.all(admins.map((a) => (0, notificationService_1.notify)({
                userId: String(a._id),
                type: "LowStock",
                title: "Low stock ⚠️",
                body: `${item.name} is low (${item.currentStock} ${item.unit} left).`,
                io,
            })));
        }
        const populated = await InventoryItem_1.InventoryItem.findById(item._id).populate("branch", "name slug");
        res.status(200).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.adjustStock = adjustStock;
// Bulk: delete / set threshold / restock by a fixed amount across many items.
const bulkUpdate = async (req, res) => {
    try {
        const { ids, action, value } = req.body;
        if (!Array.isArray(ids) || ids.length === 0)
            return res.status(400).json({ message: "No items selected" });
        const r = req.user;
        const scope = { _id: { $in: ids } };
        if (r.role === "vendor")
            scope.branch = r.branch; // vendors limited to their branch
        if (action === "delete") {
            await InventoryItem_1.InventoryItem.deleteMany(scope);
        }
        else if (action === "threshold") {
            await InventoryItem_1.InventoryItem.updateMany(scope, { lowStockThreshold: Number(value) || 0 });
        }
        else if (action === "restock") {
            await InventoryItem_1.InventoryItem.updateMany(scope, { $inc: { currentStock: Number(value) || 0 } });
        }
        else {
            return res.status(400).json({ message: "Unknown bulk action" });
        }
        res.status(200).json({ message: "Bulk update applied" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.bulkUpdate = bulkUpdate;
const getItemMovements = async (req, res) => {
    try {
        const movements = await StockMovement_1.StockMovement.find({ item: req.params.id })
            .populate("by", "name")
            .sort({ createdAt: -1 })
            .limit(50);
        res.status(200).json(movements);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getItemMovements = getItemMovements;
