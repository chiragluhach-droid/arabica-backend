import { Request, Response } from "express";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { Branch } from "../models/Branch";
import { getLoyaltyConfig } from "../models/LoyaltyConfig";
import { getMembershipConfig } from "../models/MembershipConfig";
import { quoteDelivery, DEFAULT_DELIVERY_TIERS } from "../utils/delivery";
import { validateCoupon, consumeCoupon } from "../services/couponService";
import { applyWalletChange } from "../services/walletService";
import { settleOrderRewards } from "../services/loyaltyService";
import { notify } from "../services/notificationService";
import { getPaymentProvider, isPaymentMethodSupported, PaymentMethod } from "../payments/PaymentProvider";
import { nextSeq } from "../models/Counter";
import { getSettings } from "../models/Settings";

/**
 * Get a delivery quote (distance + charge + eligibility) for a branch & location.
 * Used by checkout before placing the order. Public (no order created).
 */
export const getDeliveryQuote = async (req: Request, res: Response) => {
  try {
    const { branchId, lat, lng } = req.body;
    if (!branchId || lat == null || lng == null) {
      return res.status(400).json({ message: "branchId, lat and lng are required" });
    }
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    if (!branch.location) return res.status(400).json({ message: "Branch has no location configured" });

    const tiers = branch.deliveryCharges?.length
      ? branch.deliveryCharges.map((t: any) => ({ maxDistanceKM: t.maxDistanceKM, charge: t.charge }))
      : DEFAULT_DELIVERY_TIERS;

    const quote = quoteDelivery(
      { lat: branch.location.lat, lng: branch.location.lng },
      { lat: Number(lat), lng: Number(lng) },
      branch.deliveryRadiusKM || 10,
      tiers
    );

    res.status(200).json(quote);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      branchId,
      items,
      orderType,
      tableNumber,
      deliveryAddress,
      deliveryLocation, // { lat, lng }
      promoCode,
      useBeans,
      useWallet,
      paymentMethod = "Cash on Pickup",
      notes,
    } = req.body;

    const userId = (req as any).user.userId;
    const requesterRole = (req as any).user.role;

    // Only customers may place orders — staff accounts (admin/vendor/delivery) cannot.
    if (requesterRole && requesterRole !== "customer") {
      return res.status(403).json({ message: "Staff accounts cannot place orders. Please use a customer account." });
    }

    // Online ordering channel must be enabled by the admin.
    const settings = await getSettings();
    if (!settings.deliveryEnabled) {
      return res.status(403).json({ message: "Online ordering is currently unavailable. Please visit a store." });
    }

    if (!branchId || !items || items.length === 0 || !orderType) {
      return res.status(400).json({ message: "Missing required fields or items" });
    }
    if (orderType === "Dine-in" && !tableNumber) {
      return res.status(400).json({ message: "Table number is required for Dine-in" });
    }
    if (!isPaymentMethodSupported(paymentMethod) && paymentMethod !== "Wallet") {
      return res.status(400).json({ message: `Unsupported payment method: ${paymentMethod}` });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    // --- Subtotal ---
    const subtotal = items.reduce((sum: number, it: any) => sum + it.totalItemPrice, 0);

    // --- Delivery charge ---
    let deliveryCharge = 0;
    let deliveryDistanceKM: number | undefined;
    if (orderType === "Delivery") {
      if (!deliveryLocation?.lat || !deliveryLocation?.lng) {
        return res.status(400).json({ message: "Delivery location is required for delivery orders" });
      }
      if (!branch.location) return res.status(400).json({ message: "Branch has no location configured" });
      const tiers = branch.deliveryCharges?.length
        ? branch.deliveryCharges.map((t: any) => ({ maxDistanceKM: t.maxDistanceKM, charge: t.charge }))
        : DEFAULT_DELIVERY_TIERS;
      const quote = quoteDelivery(
        { lat: branch.location.lat, lng: branch.location.lng },
        { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
        branch.deliveryRadiusKM || 10,
        tiers
      );
      if (!quote.eligible) return res.status(400).json({ message: quote.message });
      deliveryCharge = quote.charge;
      deliveryDistanceKM = quote.distanceKM;

      // Membership free-delivery perk
      const memberCfg = await getMembershipConfig();
      const tier = memberCfg.tiers.find((t) => t.tier === user.membershipTier);
      if (tier?.freeDelivery) deliveryCharge = 0;
    }

    // --- Coupon ---
    let couponDiscount = 0;
    let couponId: string | undefined;
    if (promoCode) {
      const result = await validateCoupon({
        code: promoCode,
        userId,
        branchId,
        subtotal,
        itemProductIds: items.map((it: any) => String(it.productId || it.product)),
      });
      if (!result.valid) return res.status(400).json({ message: result.reason });
      couponDiscount = result.discount;
      couponId = result.couponId;
    }

    // --- Beans redemption ---
    const loyaltyCfg = await getLoyaltyConfig();
    let beansUsed = 0;
    let beansValue = 0;
    if (useBeans && (user.beans || 0) > 0) {
      const maxRedeemable = Math.max(0, subtotal - couponDiscount);
      const beansWorth = (user.beans || 0) * loyaltyCfg.beanRedeemValue;
      beansValue = Math.min(beansWorth, maxRedeemable);
      beansUsed = Math.ceil(beansValue / loyaltyCfg.beanRedeemValue);
      beansValue = beansUsed * loyaltyCfg.beanRedeemValue;
      if (beansValue > maxRedeemable) {
        beansValue = maxRedeemable;
      }
    }

    const discountedGoods = Math.max(0, subtotal - couponDiscount - beansValue);
    const tax = Math.round(discountedGoods * (settings.gstPercent / 100));
    const grandTotal = discountedGoods + tax + deliveryCharge;

    // --- Wallet payment ---
    let walletUsed = 0;
    if (useWallet && (user.walletBalance || 0) > 0) {
      walletUsed = Math.min(user.walletBalance || 0, grandTotal);
    }

    // --- Payment intent (abstraction; cash settles later) ---
    const effectiveMethod: PaymentMethod =
      walletUsed >= grandTotal ? "Wallet" : (paymentMethod as PaymentMethod);
    const provider = getPaymentProvider(effectiveMethod === "Wallet" ? "COD" : effectiveMethod);

    const formattedItems = items.map((it: any) => ({
      ...it,
      product: it.productId || it.product,
    }));

    const billNo = await nextSeq(`bill_${branchId}`);

    const order = await Order.create({
      user: userId,
      branch: branchId,
      items: formattedItems,
      orderType,
      tableNumber,
      billNo,
      deliveryAddress: orderType === "Delivery" ? deliveryAddress : undefined,
      deliveryLocation: orderType === "Delivery" ? deliveryLocation : undefined,
      deliveryDistanceKM,
      deliveryOtp: orderType === "Delivery" ? String(Math.floor(1000 + Math.random() * 9000)) : undefined,
      deliveryFee: deliveryCharge,
      deliveryCharge,
      subtotal,
      tax,
      discount: couponDiscount,
      beansUsed,
      walletUsed,
      coupon: couponId,
      promoCode: promoCode || undefined,
      totalAmount: grandTotal,
      paymentMethod: effectiveMethod,
      paymentStatus: "Pending",
      notes,
      status: "Placed",
      statusHistory: [{ status: "Placed", at: new Date() }],
    });

    // --- Side effects after the order exists ---
    if (beansUsed > 0) {
      user.beans = (user.beans || 0) - beansUsed;
      await user.save();
    }
    if (walletUsed > 0) {
      await applyWalletChange({
        userId,
        amount: -walletUsed,
        reason: "OrderPayment",
        description: `Wallet payment for order`,
        orderId: String(order._id),
      });
    }
    if (couponId) await consumeCoupon(couponId, userId);

    // Settle the abstracted intent (no-op for cash today)
    await provider.createIntent({
      orderId: String(order._id),
      amount: grandTotal - walletUsed,
      currency: "INR",
      method: effectiveMethod,
    });

    await order.populate("branch", "name slug");

    const io = (req as any).io;
    if (io) io.to(`branch_${branchId}`).emit("newOrder", order);

    await notify({
      userId,
      type: "OrderUpdate",
      title: "Order placed 🎉",
      body: `Your order at ${branch.name} has been placed.`,
      io,
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Record that a receipt was printed (for reprint audit). Staff only.
export const markPrinted = async (req: Request, res: Response) => {
  try {
    const requester = (req as any).user;
    if (requester.role !== "vendor" && requester.role !== "admin") {
      return res.status(403).json({ message: "Staff access required" });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $inc: { printCount: 1 }, lastPrintedAt: new Date() },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ printCount: order.printCount, lastPrintedAt: order.lastPrintedAt });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const orders = await Order.find({ user: userId })
      .populate("branch", "name slug")
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requester = (req as any).user;
    const order = await Order.findById(id)
      .select("+deliveryOtp")
      .populate("branch", "name slug contactNumber location")
      .populate("user", "name phone")
      .populate("deliveryPartner", "name phone");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Owner, the branch's vendor, an admin, or the assigned partner may view it.
    const isOwner = String((order.user as any)?._id || order.user) === String(requester.userId);
    const isBranchVendor = requester.role === "vendor" && String(requester.branch) === String((order.branch as any)?._id || order.branch);
    const isPartner = String((order.deliveryPartner as any)?._id || order.deliveryPartner) === String(requester.userId);
    if (!isOwner && !isBranchVendor && requester.role !== "admin" && !isPartner) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    // Only the customer (owner) sees the OTP — they read it out to the partner on handover.
    const out = order.toObject();
    if (!isOwner) delete (out as any).deliveryOtp;
    res.status(200).json(out);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getBranchOrders = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.params;
    const { all } = req.query;
    const requester = (req as any).user;
    if (requester?.role === "vendor" && String(requester.branch) !== String(branchId)) {
      return res.status(403).json({ message: "Not authorized for this branch" });
    }

    const filter: any = { branch: branchId };
    if (!all) filter.status = { $nin: ["Delivered", "Cancelled"] };

    const orders = await Order.find(filter)
      .populate("user", "name phone")
      .populate("deliveryPartner", "name phone")
      .sort({ createdAt: 1 });
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Referral payout: when a referred user's first order is delivered, reward referrer.
async function maybeRewardReferral(order: any, io?: any) {
  const user = await User.findById(order.user);
  if (!user?.referredBy || user.referralRewarded) return;

  const referrer = await User.findById(user.referredBy);
  if (!referrer) return;

  const REFERRAL_BEANS = 100; // configurable default
  referrer.beans = (referrer.beans || 0) + REFERRAL_BEANS;
  await referrer.save();
  user.referralRewarded = true;
  await user.save();

  await notify({
    userId: String(referrer._id),
    type: "RewardUnlocked",
    title: "Referral reward 🎁",
    body: `${user.name || "A friend"} placed their first order. You earned ${REFERRAL_BEANS} beans!`,
    io,
  });
}

// Shared side-effects when an order transitions to Delivered.
async function applyDelivered(order: any, io?: any) {
  order.paymentStatus = "Paid";
  await order.save();
  await settleOrderRewards(String(order._id), io); // beans + membership + cashback
  await maybeRewardReferral(order, io);            // referral payout on first order
}

// Shared side-effects when an order is cancelled — refund wallet + beans.
async function applyCancelled(order: any) {
  if (order.walletUsed > 0) {
    await applyWalletChange({
      userId: String(order.user),
      amount: order.walletUsed,
      reason: "Refund",
      description: "Refund for cancelled order",
      orderId: String(order._id),
    });
  }
  if (order.beansUsed > 0) {
    await User.findByIdAndUpdate(order.user, { $inc: { beans: order.beansUsed } });
  }
  order.paymentStatus = order.paymentStatus === "Paid" ? "Refunded" : order.paymentStatus;
  await order.save();
}

// Emit + notify after a status change.
async function broadcastStatus(order: any, status: string, io?: any) {
  await order.populate("branch", "name slug");
  if (io) {
    const branchRoomId = (order.branch as any)?._id || order.branch;
    if (order.user) io.to(`user_${order.user}`).emit("orderStatusUpdated", order);
    io.to(`branch_${branchRoomId}`).emit("orderStatusUpdated", order);
    if (order.deliveryPartner) io.to(`partner_${order.deliveryPartner}`).emit("orderStatusUpdated", order);
  }
  // POS walk-in orders have no customer to notify.
  if (!order.user) return;
  await notify({
    userId: String(order.user),
    type: "OrderUpdate",
    title: `Order ${status}`,
    body: `Your order is now "${status}".`,
    io,
  });
}

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const prevStatus = order.status;
    order.status = status;
    order.statusHistory.push({ status, at: new Date(), note } as any);

    const io = (req as any).io;

    if (status === "Delivered" && prevStatus !== "Delivered") await applyDelivered(order, io);
    else if (status === "Cancelled" && prevStatus !== "Cancelled") await applyCancelled(order);
    else await order.save();

    await broadcastStatus(order, status, io);
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------------- Delivery partner flows -----------------------

// GET /api/orders/partners — list delivery partners for assignment (vendor/admin).
export const getAvailablePartners = async (req: Request, res: Response) => {
  try {
    const requester = (req as any).user;
    if (requester.role !== "admin" && requester.role !== "vendor") {
      return res.status(403).json({ message: "Not authorized" });
    }
    // Any active delivery partner can be assigned to any branch's order.
    const partners = await User.find({ role: "delivery", isActive: true })
      .select("name phone branch")
      .sort({ name: 1 });
    res.status(200).json(partners);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/orders/:id/assign — assign a partner to a delivery order (vendor/admin).
export const assignPartner = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { partnerId } = req.body;
    const requester = (req as any).user;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.orderType !== "Delivery") return res.status(400).json({ message: "Only delivery orders can be assigned" });
    if (requester.role === "vendor" && String(requester.branch) !== String(order.branch)) {
      return res.status(403).json({ message: "Not authorized for this branch" });
    }

    const partner = await User.findOne({ _id: partnerId, role: "delivery" });
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    order.deliveryPartner = partnerId;
    await order.save();
    await order.populate("deliveryPartner", "name phone");
    await order.populate("branch", "name slug");

    const io = (req as any).io;
    if (io) {
      io.to(`partner_${partnerId}`).emit("orderAssigned", order);
      io.to(`user_${order.user}`).emit("orderStatusUpdated", order);
      io.to(`branch_${order.branch._id || order.branch}`).emit("orderStatusUpdated", order);
    }

    await notify({
      userId: String(order.user),
      type: "OrderUpdate",
      title: "Delivery partner assigned 🛵",
      body: `${partner.name} will deliver your order.`,
      io,
    });

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// GET /api/orders/partner/me — a partner's assigned active orders + history + earnings.
export const getPartnerOrders = async (req: Request, res: Response) => {
  try {
    const requester = (req as any).user;
    if (requester.role !== "delivery") return res.status(403).json({ message: "Delivery partners only" });
    const settings = await getSettings();
    if (!settings.deliveryEnabled) return res.status(403).json({ message: "Delivery is currently disabled by the admin." });
    const partnerId = requester.userId;

    const [active, history] = await Promise.all([
      Order.find({ deliveryPartner: partnerId, status: { $nin: ["Delivered", "Cancelled"] } })
        .populate("branch", "name slug location contactNumber")
        .populate("user", "name phone")
        .sort({ createdAt: 1 }),
      Order.find({ deliveryPartner: partnerId, status: "Delivered" })
        .populate("branch", "name")
        .sort({ updatedAt: -1 })
        .limit(50),
    ]);

    // Earnings = sum of delivery fees on completed deliveries.
    const totalEarnings = history.reduce((sum, o: any) => sum + (o.deliveryCharge || 0), 0);

    res.status(200).json({
      active,
      history,
      stats: { completed: history.length, earnings: totalEarnings },
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/orders/:id/verify-otp — partner confirms handover with the customer OTP.
export const verifyDeliveryOtp = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    const requester = (req as any).user;

    const order = await Order.findById(id).select("+deliveryOtp");
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.deliveryPartner) !== String(requester.userId)) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }
    if (order.status === "Delivered") return res.status(400).json({ message: "Order already delivered" });
    if (!otp || String(otp) !== String(order.deliveryOtp)) {
      return res.status(400).json({ message: "Incorrect OTP. Please confirm with the customer." });
    }

    order.status = "Delivered";
    order.statusHistory.push({ status: "Delivered", at: new Date(), note: "Verified via OTP" } as any);

    const io = (req as any).io;
    await applyDelivered(order, io);
    await broadcastStatus(order, "Delivered", io);

    res.status(200).json({ message: "Delivery confirmed", order });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
