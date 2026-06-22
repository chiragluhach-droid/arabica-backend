"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCoupon = exports.updateCoupon = exports.createCoupon = exports.listCoupons = exports.previewCoupon = void 0;
const Coupon_1 = require("../models/Coupon");
const couponService_1 = require("../services/couponService");
/** Customer-facing: preview a coupon against the current cart. */
const previewCoupon = async (req, res) => {
    try {
        const { code, branchId, subtotal, itemProductIds } = req.body;
        const userId = req.user.userId;
        if (!code || !branchId)
            return res.status(400).json({ message: "code and branchId are required" });
        const result = await (0, couponService_1.validateCoupon)({
            code,
            userId,
            branchId,
            subtotal: Number(subtotal) || 0,
            itemProductIds: Array.isArray(itemProductIds) ? itemProductIds.map(String) : [],
        });
        res.status(result.valid ? 200 : 400).json(result);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.previewCoupon = previewCoupon;
// ---------------- Admin CRUD ----------------
const listCoupons = async (_req, res) => {
    try {
        const coupons = await Coupon_1.Coupon.find().sort({ createdAt: -1 });
        res.status(200).json(coupons);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.listCoupons = listCoupons;
const createCoupon = async (req, res) => {
    try {
        const coupon = await Coupon_1.Coupon.create(req.body);
        res.status(201).json(coupon);
    }
    catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ message: "Coupon code already exists" });
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createCoupon = createCoupon;
const updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon_1.Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!coupon)
            return res.status(404).json({ message: "Coupon not found" });
        res.status(200).json(coupon);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateCoupon = updateCoupon;
const deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon_1.Coupon.findByIdAndDelete(req.params.id);
        if (!coupon)
            return res.status(404).json({ message: "Coupon not found" });
        res.status(200).json({ message: "Coupon deleted" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.deleteCoupon = deleteCoupon;
