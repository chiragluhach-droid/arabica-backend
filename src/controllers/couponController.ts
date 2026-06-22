import { Request, Response } from "express";
import { Coupon } from "../models/Coupon";
import { validateCoupon } from "../services/couponService";

/** Customer-facing: preview a coupon against the current cart. */
export const previewCoupon = async (req: Request, res: Response) => {
  try {
    const { code, branchId, subtotal, itemProductIds } = req.body;
    const userId = (req as any).user.userId;
    if (!code || !branchId) return res.status(400).json({ message: "code and branchId are required" });

    const result = await validateCoupon({
      code,
      userId,
      branchId,
      subtotal: Number(subtotal) || 0,
      itemProductIds: Array.isArray(itemProductIds) ? itemProductIds.map(String) : [],
    });
    res.status(result.valid ? 200 : 400).json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---------------- Admin CRUD ----------------

export const listCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (error: any) {
    if (error.code === 11000) return res.status(400).json({ message: "Coupon code already exists" });
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.status(200).json(coupon);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.status(200).json({ message: "Coupon deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
