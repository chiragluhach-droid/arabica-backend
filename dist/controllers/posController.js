"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPosOrder = void 0;
const Order_1 = require("../models/Order");
const Branch_1 = require("../models/Branch");
const Counter_1 = require("../models/Counter");
const Settings_1 = require("../models/Settings");
const POS_TENDERS = ["Cash", "Card", "UPI"];
/**
 * Create a POS (counter) order. Vendor/admin only — this is the staff-side order
 * entry, separate from the customer `POST /orders` flow (which 403s for staff).
 * Walk-in only: no customer account, no loyalty. Marked paid immediately and
 * pushed to the branch KDS via the `newOrder` socket event.
 */
const createPosOrder = async (req, res) => {
    try {
        const requester = req.user;
        if (requester.role !== "vendor" && requester.role !== "admin") {
            return res.status(403).json({ message: "Only branch staff can use the POS" });
        }
        const settings = await (0, Settings_1.getSettings)();
        if (!settings.posEnabled) {
            return res.status(403).json({ message: "POS billing is currently disabled by the admin." });
        }
        const { items, orderType = "Pickup", tableNumber, paymentMethod, notes } = req.body;
        // Vendors are locked to their own branch; admins may pass a branchId.
        const branchId = requester.role === "vendor" ? requester.branch : req.body.branchId;
        if (!branchId)
            return res.status(400).json({ message: "Branch is required" });
        if (!items || items.length === 0)
            return res.status(400).json({ message: "Add at least one item" });
        if (!POS_TENDERS.includes(paymentMethod)) {
            return res.status(400).json({ message: "Select a payment method (Cash, Card or UPI)" });
        }
        if (orderType === "Dine-in" && !tableNumber) {
            return res.status(400).json({ message: "Table number is required for Dine-in" });
        }
        const branch = await Branch_1.Branch.findById(branchId);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        const subtotal = items.reduce((sum, it) => sum + it.totalItemPrice, 0);
        const tax = Math.round(subtotal * (settings.gstPercent / 100));
        const totalAmount = subtotal + tax;
        const formattedItems = items.map((it) => ({
            ...it,
            product: it.productId || it.product,
        }));
        const billNo = await (0, Counter_1.nextSeq)(`bill_${branchId}`);
        const order = await Order_1.Order.create({
            branch: branchId,
            items: formattedItems,
            orderType,
            tableNumber: orderType === "Dine-in" ? tableNumber : undefined,
            source: "pos",
            placedBy: requester.userId,
            billNo,
            subtotal,
            tax,
            totalAmount,
            paymentMethod,
            paymentStatus: "Paid",
            // A POS sale is complete the moment it's billed — no kitchen workflow and
            // no accept/reject. It's recorded as a finished bill (shows in Bills +
            // analytics), and is NOT pushed to the KDS.
            status: "Delivered",
            statusHistory: [{ status: "Delivered", at: new Date() }],
            notes,
        });
        await order.populate("branch", "name slug");
        res.status(201).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createPosOrder = createPosOrder;
