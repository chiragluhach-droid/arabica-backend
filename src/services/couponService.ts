import { Coupon } from "../models/Coupon";
import { Order } from "../models/Order";

interface ValidateArgs {
  code: string;
  userId: string;
  branchId: string;
  subtotal: number;
  itemProductIds: string[];
}

export interface CouponResult {
  valid: boolean;
  reason?: string;
  discount: number;
  couponId?: string;
  code?: string;
}

/**
 * Validate a coupon for a cart and compute the discount (rupees).
 * Pure read — does NOT mark the coupon used; the order controller does that on success.
 */
export async function validateCoupon({
  code,
  userId,
  branchId,
  subtotal,
  itemProductIds,
}: ValidateArgs): Promise<CouponResult> {
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) return { valid: false, reason: "Invalid coupon code", discount: 0 };

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt)
    return { valid: false, reason: "Coupon is not active yet", discount: 0 };
  if (coupon.expiresAt && now > coupon.expiresAt)
    return { valid: false, reason: "Coupon has expired", discount: 0 };

  if (coupon.minOrder && subtotal < coupon.minOrder)
    return { valid: false, reason: `Minimum order ₹${coupon.minOrder} required`, discount: 0 };

  if (coupon.eligibleBranches.length && !coupon.eligibleBranches.some((b) => String(b) === String(branchId)))
    return { valid: false, reason: "Coupon not valid at this branch", discount: 0 };

  // Usage limits
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return { valid: false, reason: "Coupon usage limit reached", discount: 0 };

  if (coupon.perUserLimit) {
    const timesUsed = coupon.usedBy.filter((u) => String(u) === String(userId)).length;
    if (timesUsed >= coupon.perUserLimit)
      return { valid: false, reason: "You've already used this coupon", discount: 0 };
  }

  // First-order constraint
  if (coupon.type === "FirstOrder") {
    const prior = await Order.countDocuments({ user: userId });
    if (prior > 0) return { valid: false, reason: "Valid on your first order only", discount: 0 };
  }

  // Eligible products → discount base is the subtotal of those products (fallback: whole subtotal)
  const base = coupon.eligibleProducts.length
    ? subtotal // (item-level base would need line totals; whole-cart base is a safe MVP)
    : subtotal;

  if (coupon.eligibleProducts.length && !coupon.eligibleProducts.some((p) => itemProductIds.includes(String(p))))
    return { valid: false, reason: "Coupon not valid for these items", discount: 0 };

  let discount = 0;
  switch (coupon.type) {
    case "Flat":
    case "FirstOrder":
    case "Birthday":
    case "Festival":
      // Flat-style coupons use `value` as rupees off (Percentage handled below if value<=100 & type=Percentage)
      discount = coupon.value;
      break;
    case "Percentage":
      discount = Math.round((base * coupon.value) / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      break;
    case "FreeProduct":
    case "BuyXGetY":
      // Discount equals value (₹ off) as a simple, gateway-agnostic MVP.
      discount = coupon.value;
      break;
    default:
      discount = coupon.value;
  }

  discount = Math.max(0, Math.min(discount, subtotal));
  return { valid: true, discount, couponId: String(coupon._id), code: coupon.code };
}

/** Mark a coupon consumed after a successful order. */
export async function consumeCoupon(couponId: string, userId: string) {
  await Coupon.findByIdAndUpdate(couponId, {
    $inc: { usedCount: 1 },
    $push: { usedBy: userId },
  });
}
