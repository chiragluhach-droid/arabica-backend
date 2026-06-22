"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDeliveryOtp = exports.getPartnerOrders = exports.assignPartner = exports.getAvailablePartners = exports.updateOrderStatus = exports.getBranchOrders = exports.getOrderById = exports.getMyOrders = exports.markPrinted = exports.createOrder = exports.getDeliveryQuote = void 0;
const Order_1 = require("../models/Order");
const User_1 = require("../models/User");
const Branch_1 = require("../models/Branch");
const LoyaltyConfig_1 = require("../models/LoyaltyConfig");
const MembershipConfig_1 = require("../models/MembershipConfig");
const delivery_1 = require("../utils/delivery");
const couponService_1 = require("../services/couponService");
const walletService_1 = require("../services/walletService");
const loyaltyService_1 = require("../services/loyaltyService");
const notificationService_1 = require("../services/notificationService");
const PaymentProvider_1 = require("../payments/PaymentProvider");
const Counter_1 = require("../models/Counter");
const Settings_1 = require("../models/Settings");
/**
 * Get a delivery quote (distance + charge + eligibility) for a branch & location.
 * Used by checkout before placing the order. Public (no order created).
 */
const getDeliveryQuote = async (req, res) => {
    try {
        const { branchId, lat, lng } = req.body;
        if (!branchId || lat == null || lng == null) {
            return res.status(400).json({ message: "branchId, lat and lng are required" });
        }
        const branch = await Branch_1.Branch.findById(branchId);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        if (!branch.location)
            return res.status(400).json({ message: "Branch has no location configured" });
        const tiers = branch.deliveryCharges?.length
            ? branch.deliveryCharges.map((t) => ({ maxDistanceKM: t.maxDistanceKM, charge: t.charge }))
            : delivery_1.DEFAULT_DELIVERY_TIERS;
        const quote = (0, delivery_1.quoteDelivery)({ lat: branch.location.lat, lng: branch.location.lng }, { lat: Number(lat), lng: Number(lng) }, branch.deliveryRadiusKM || 10, tiers);
        res.status(200).json(quote);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getDeliveryQuote = getDeliveryQuote;
const createOrder = async (req, res) => {
    try {
        const { branchId, items, orderType, tableNumber, deliveryAddress, deliveryLocation, // { lat, lng }
        promoCode, useBeans, useWallet, paymentMethod = "Cash on Pickup", notes, } = req.body;
        const userId = req.user.userId;
        const requesterRole = req.user.role;
        // Only customers may place orders — staff accounts (admin/vendor/delivery) cannot.
        if (requesterRole && requesterRole !== "customer") {
            return res.status(403).json({ message: "Staff accounts cannot place orders. Please use a customer account." });
        }
        // Online ordering channel must be enabled by the admin.
        const settings = await (0, Settings_1.getSettings)();
        if (!settings.deliveryEnabled) {
            return res.status(403).json({ message: "Online ordering is currently unavailable. Please visit a store." });
        }
        if (!branchId || !items || items.length === 0 || !orderType) {
            return res.status(400).json({ message: "Missing required fields or items" });
        }
        if (orderType === "Dine-in" && !tableNumber) {
            return res.status(400).json({ message: "Table number is required for Dine-in" });
        }
        if (!(0, PaymentProvider_1.isPaymentMethodSupported)(paymentMethod) && paymentMethod !== "Wallet") {
            return res.status(400).json({ message: `Unsupported payment method: ${paymentMethod}` });
        }
        const user = await User_1.User.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const branch = await Branch_1.Branch.findById(branchId);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        // --- Subtotal ---
        const subtotal = items.reduce((sum, it) => sum + it.totalItemPrice, 0);
        // --- Delivery charge ---
        let deliveryCharge = 0;
        let deliveryDistanceKM;
        if (orderType === "Delivery") {
            if (!deliveryLocation?.lat || !deliveryLocation?.lng) {
                return res.status(400).json({ message: "Delivery location is required for delivery orders" });
            }
            if (!branch.location)
                return res.status(400).json({ message: "Branch has no location configured" });
            const tiers = branch.deliveryCharges?.length
                ? branch.deliveryCharges.map((t) => ({ maxDistanceKM: t.maxDistanceKM, charge: t.charge }))
                : delivery_1.DEFAULT_DELIVERY_TIERS;
            const quote = (0, delivery_1.quoteDelivery)({ lat: branch.location.lat, lng: branch.location.lng }, { lat: deliveryLocation.lat, lng: deliveryLocation.lng }, branch.deliveryRadiusKM || 10, tiers);
            if (!quote.eligible)
                return res.status(400).json({ message: quote.message });
            deliveryCharge = quote.charge;
            deliveryDistanceKM = quote.distanceKM;
            // Membership free-delivery perk
            const memberCfg = await (0, MembershipConfig_1.getMembershipConfig)();
            const tier = memberCfg.tiers.find((t) => t.tier === user.membershipTier);
            if (tier?.freeDelivery)
                deliveryCharge = 0;
        }
        // --- Coupon ---
        let couponDiscount = 0;
        let couponId;
        if (promoCode) {
            const result = await (0, couponService_1.validateCoupon)({
                code: promoCode,
                userId,
                branchId,
                subtotal,
                itemProductIds: items.map((it) => String(it.productId || it.product)),
            });
            if (!result.valid)
                return res.status(400).json({ message: result.reason });
            couponDiscount = result.discount;
            couponId = result.couponId;
        }
        // --- Beans redemption ---
        const loyaltyCfg = await (0, LoyaltyConfig_1.getLoyaltyConfig)();
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
        const effectiveMethod = walletUsed >= grandTotal ? "Wallet" : paymentMethod;
        const provider = (0, PaymentProvider_1.getPaymentProvider)(effectiveMethod === "Wallet" ? "COD" : effectiveMethod);
        const formattedItems = items.map((it) => ({
            ...it,
            product: it.productId || it.product,
        }));
        const billNo = await (0, Counter_1.nextSeq)(`bill_${branchId}`);
        const order = await Order_1.Order.create({
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
            await (0, walletService_1.applyWalletChange)({
                userId,
                amount: -walletUsed,
                reason: "OrderPayment",
                description: `Wallet payment for order`,
                orderId: String(order._id),
            });
        }
        if (couponId)
            await (0, couponService_1.consumeCoupon)(couponId, userId);
        // Settle the abstracted intent (no-op for cash today)
        await provider.createIntent({
            orderId: String(order._id),
            amount: grandTotal - walletUsed,
            currency: "INR",
            method: effectiveMethod,
        });
        await order.populate("branch", "name slug");
        const io = req.io;
        if (io)
            io.to(`branch_${branchId}`).emit("newOrder", order);
        await (0, notificationService_1.notify)({
            userId,
            type: "OrderUpdate",
            title: "Order placed 🎉",
            body: `Your order at ${branch.name} has been placed.`,
            io,
        });
        res.status(201).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.createOrder = createOrder;
// Record that a receipt was printed (for reprint audit). Staff only.
const markPrinted = async (req, res) => {
    try {
        const requester = req.user;
        if (requester.role !== "vendor" && requester.role !== "admin") {
            return res.status(403).json({ message: "Staff access required" });
        }
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, { $inc: { printCount: 1 }, lastPrintedAt: new Date() }, { new: true });
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        res.status(200).json({ printCount: order.printCount, lastPrintedAt: order.lastPrintedAt });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.markPrinted = markPrinted;
const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.userId;
        const orders = await Order_1.Order.find({ user: userId })
            .populate("branch", "name slug")
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getMyOrders = getMyOrders;
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const requester = req.user;
        const order = await Order_1.Order.findById(id)
            .select("+deliveryOtp")
            .populate("branch", "name slug contactNumber location")
            .populate("user", "name phone")
            .populate("deliveryPartner", "name phone");
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        // Owner, the branch's vendor, an admin, or the assigned partner may view it.
        const isOwner = String(order.user?._id || order.user) === String(requester.userId);
        const isBranchVendor = requester.role === "vendor" && String(requester.branch) === String(order.branch?._id || order.branch);
        const isPartner = String(order.deliveryPartner?._id || order.deliveryPartner) === String(requester.userId);
        if (!isOwner && !isBranchVendor && requester.role !== "admin" && !isPartner) {
            return res.status(403).json({ message: "Not authorized to view this order" });
        }
        // Only the customer (owner) sees the OTP — they read it out to the partner on handover.
        const out = order.toObject();
        if (!isOwner)
            delete out.deliveryOtp;
        res.status(200).json(out);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getOrderById = getOrderById;
const getBranchOrders = async (req, res) => {
    try {
        const { branchId } = req.params;
        const { all } = req.query;
        const requester = req.user;
        if (requester?.role === "vendor" && String(requester.branch) !== String(branchId)) {
            return res.status(403).json({ message: "Not authorized for this branch" });
        }
        const filter = { branch: branchId };
        if (!all)
            filter.status = { $nin: ["Delivered", "Cancelled"] };
        const orders = await Order_1.Order.find(filter)
            .populate("user", "name phone")
            .populate("deliveryPartner", "name phone")
            .sort({ createdAt: 1 });
        res.status(200).json(orders);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getBranchOrders = getBranchOrders;
// Referral payout: when a referred user's first order is delivered, reward referrer.
async function maybeRewardReferral(order, io) {
    const user = await User_1.User.findById(order.user);
    if (!user?.referredBy || user.referralRewarded)
        return;
    const referrer = await User_1.User.findById(user.referredBy);
    if (!referrer)
        return;
    const REFERRAL_BEANS = 100; // configurable default
    referrer.beans = (referrer.beans || 0) + REFERRAL_BEANS;
    await referrer.save();
    user.referralRewarded = true;
    await user.save();
    await (0, notificationService_1.notify)({
        userId: String(referrer._id),
        type: "RewardUnlocked",
        title: "Referral reward 🎁",
        body: `${user.name || "A friend"} placed their first order. You earned ${REFERRAL_BEANS} beans!`,
        io,
    });
}
// Shared side-effects when an order transitions to Delivered.
async function applyDelivered(order, io) {
    order.paymentStatus = "Paid";
    await order.save();
    await (0, loyaltyService_1.settleOrderRewards)(String(order._id), io); // beans + membership + cashback
    await maybeRewardReferral(order, io); // referral payout on first order
}
// Shared side-effects when an order is cancelled — refund wallet + beans.
async function applyCancelled(order) {
    if (order.walletUsed > 0) {
        await (0, walletService_1.applyWalletChange)({
            userId: String(order.user),
            amount: order.walletUsed,
            reason: "Refund",
            description: "Refund for cancelled order",
            orderId: String(order._id),
        });
    }
    if (order.beansUsed > 0) {
        await User_1.User.findByIdAndUpdate(order.user, { $inc: { beans: order.beansUsed } });
    }
    order.paymentStatus = order.paymentStatus === "Paid" ? "Refunded" : order.paymentStatus;
    await order.save();
}
// Emit + notify after a status change.
async function broadcastStatus(order, status, io) {
    await order.populate("branch", "name slug");
    if (io) {
        const branchRoomId = order.branch?._id || order.branch;
        if (order.user)
            io.to(`user_${order.user}`).emit("orderStatusUpdated", order);
        io.to(`branch_${branchRoomId}`).emit("orderStatusUpdated", order);
        if (order.deliveryPartner)
            io.to(`partner_${order.deliveryPartner}`).emit("orderStatusUpdated", order);
    }
    // POS walk-in orders have no customer to notify.
    if (!order.user)
        return;
    await (0, notificationService_1.notify)({
        userId: String(order.user),
        type: "OrderUpdate",
        title: `Order ${status}`,
        body: `Your order is now "${status}".`,
        io,
    });
}
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const order = await Order_1.Order.findById(id);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        const prevStatus = order.status;
        order.status = status;
        order.statusHistory.push({ status, at: new Date(), note });
        const io = req.io;
        if (status === "Delivered" && prevStatus !== "Delivered")
            await applyDelivered(order, io);
        else if (status === "Cancelled" && prevStatus !== "Cancelled")
            await applyCancelled(order);
        else
            await order.save();
        await broadcastStatus(order, status, io);
        res.status(200).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateOrderStatus = updateOrderStatus;
// ----------------------- Delivery partner flows -----------------------
// GET /api/orders/partners — list delivery partners for assignment (vendor/admin).
const getAvailablePartners = async (req, res) => {
    try {
        const requester = req.user;
        if (requester.role !== "admin" && requester.role !== "vendor") {
            return res.status(403).json({ message: "Not authorized" });
        }
        // Any active delivery partner can be assigned to any branch's order.
        const partners = await User_1.User.find({ role: "delivery", isActive: true })
            .select("name phone branch")
            .sort({ name: 1 });
        res.status(200).json(partners);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getAvailablePartners = getAvailablePartners;
// PATCH /api/orders/:id/assign — assign a partner to a delivery order (vendor/admin).
const assignPartner = async (req, res) => {
    try {
        const { id } = req.params;
        const { partnerId } = req.body;
        const requester = req.user;
        const order = await Order_1.Order.findById(id);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        if (order.orderType !== "Delivery")
            return res.status(400).json({ message: "Only delivery orders can be assigned" });
        if (requester.role === "vendor" && String(requester.branch) !== String(order.branch)) {
            return res.status(403).json({ message: "Not authorized for this branch" });
        }
        const partner = await User_1.User.findOne({ _id: partnerId, role: "delivery" });
        if (!partner)
            return res.status(404).json({ message: "Partner not found" });
        order.deliveryPartner = partnerId;
        await order.save();
        await order.populate("deliveryPartner", "name phone");
        await order.populate("branch", "name slug");
        const io = req.io;
        if (io) {
            io.to(`partner_${partnerId}`).emit("orderAssigned", order);
            io.to(`user_${order.user}`).emit("orderStatusUpdated", order);
            io.to(`branch_${order.branch._id || order.branch}`).emit("orderStatusUpdated", order);
        }
        await (0, notificationService_1.notify)({
            userId: String(order.user),
            type: "OrderUpdate",
            title: "Delivery partner assigned 🛵",
            body: `${partner.name} will deliver your order.`,
            io,
        });
        res.status(200).json(order);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.assignPartner = assignPartner;
// GET /api/orders/partner/me — a partner's assigned active orders + history + earnings.
const getPartnerOrders = async (req, res) => {
    try {
        const requester = req.user;
        if (requester.role !== "delivery")
            return res.status(403).json({ message: "Delivery partners only" });
        const settings = await (0, Settings_1.getSettings)();
        if (!settings.deliveryEnabled)
            return res.status(403).json({ message: "Delivery is currently disabled by the admin." });
        const partnerId = requester.userId;
        const [active, history] = await Promise.all([
            Order_1.Order.find({ deliveryPartner: partnerId, status: { $nin: ["Delivered", "Cancelled"] } })
                .populate("branch", "name slug location contactNumber")
                .populate("user", "name phone")
                .sort({ createdAt: 1 }),
            Order_1.Order.find({ deliveryPartner: partnerId, status: "Delivered" })
                .populate("branch", "name")
                .sort({ updatedAt: -1 })
                .limit(50),
        ]);
        // Earnings = sum of delivery fees on completed deliveries.
        const totalEarnings = history.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);
        res.status(200).json({
            active,
            history,
            stats: { completed: history.length, earnings: totalEarnings },
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getPartnerOrders = getPartnerOrders;
// PATCH /api/orders/:id/verify-otp — partner confirms handover with the customer OTP.
const verifyDeliveryOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const requester = req.user;
        const order = await Order_1.Order.findById(id).select("+deliveryOtp");
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        if (String(order.deliveryPartner) !== String(requester.userId)) {
            return res.status(403).json({ message: "This order is not assigned to you" });
        }
        if (order.status === "Delivered")
            return res.status(400).json({ message: "Order already delivered" });
        if (!otp || String(otp) !== String(order.deliveryOtp)) {
            return res.status(400).json({ message: "Incorrect OTP. Please confirm with the customer." });
        }
        order.status = "Delivered";
        order.statusHistory.push({ status: "Delivered", at: new Date(), note: "Verified via OTP" });
        const io = req.io;
        await applyDelivered(order, io);
        await broadcastStatus(order, "Delivered", io);
        res.status(200).json({ message: "Delivery confirmed", order });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.verifyDeliveryOtp = verifyDeliveryOtp;
