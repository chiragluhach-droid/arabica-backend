import { User } from "../models/User";
import { Order } from "../models/Order";
import { getLoyaltyConfig } from "../models/LoyaltyConfig";
import { getMembershipConfig } from "../models/MembershipConfig";
import { applyWalletChange } from "./walletService";
import { notify } from "./notificationService";

/** Beans earned for a given spend amount, per the loyalty config. */
export async function beansForAmount(amount: number): Promise<number> {
  const cfg = await getLoyaltyConfig();
  if (!cfg.perAmount || cfg.perAmount <= 0) return 0;
  return Math.floor(amount / cfg.perAmount) * cfg.beansPerAmount;
}

const TIER_RANK: Record<string, number> = { None: 0, Silver: 1, Gold: 2, Platinum: 3 };

/**
 * Recompute a user's membership tier from lifetime paid spend and upgrade if
 * they've crossed a threshold. Returns the new tier (or existing one).
 * Also pays tier cashback into the wallet for the order that triggered the check.
 */
export async function settleOrderRewards(orderId: string, io?: any) {
  const order = await Order.findById(orderId);
  if (!order) return;

  const user = await User.findById(order.user);
  if (!user) return;

  // 1) Award beans for this order
  const earned = await beansForAmount(order.totalAmount);
  if (earned > 0) {
    user.beans = (user.beans || 0) + earned;
    order.beansEarned = earned;
    await order.save();
  }

  // 2) Lifetime spend → membership tier
  const spendAgg = await Order.aggregate([
    { $match: { user: user._id, paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const lifetimeSpend = spendAgg[0]?.total || 0;

  const memberCfg = await getMembershipConfig();
  const sortedTiers = [...memberCfg.tiers].sort((a, b) => b.minSpend - a.minSpend);
  const earnedTier = sortedTiers.find((t) => lifetimeSpend >= t.minSpend);
  const newTierName = earnedTier?.tier || "None";

  const upgraded = TIER_RANK[newTierName] > TIER_RANK[user.membershipTier || "None"];
  if (upgraded) {
    user.membershipTier = newTierName as any;
  }
  await user.save();

  // 3) Tier cashback into wallet
  const activeTier = memberCfg.tiers.find((t) => t.tier === user.membershipTier);
  if (activeTier && activeTier.cashbackPercent > 0) {
    const cashback = Math.round((order.totalAmount * activeTier.cashbackPercent) / 100);
    if (cashback > 0) {
      await applyWalletChange({
        userId: user._id,
        amount: cashback,
        reason: "Cashback",
        description: `${user.membershipTier} cashback (${activeTier.cashbackPercent}%)`,
        orderId: order._id,
      });
    }
  }

  // 4) Notify
  if (earned > 0) {
    await notify({
      userId: String(user._id),
      type: "RewardUnlocked",
      title: "Beans earned ☕",
      body: `You earned ${earned} Arabica Beans on your order.`,
      io,
    });
  }
  if (upgraded) {
    await notify({
      userId: String(user._id),
      type: "MembershipUpgrade",
      title: `Welcome to ${newTierName}!`,
      body: `You've been upgraded to ${newTierName} membership. Enjoy your new perks.`,
      io,
    });
  }

  return { earned, tier: user.membershipTier, lifetimeSpend };
}
