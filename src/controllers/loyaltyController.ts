import { Request, Response } from "express";
import { getLoyaltyConfig, LoyaltyConfig } from "../models/LoyaltyConfig";
import { getMembershipConfig, MembershipConfig } from "../models/MembershipConfig";
import { User } from "../models/User";
import { applyWalletChange } from "../services/walletService";
import { notify } from "../services/notificationService";

/** Public: beans config + reward catalogue (so the dashboard can render the progress bar). */
export const getLoyaltyInfo = async (_req: Request, res: Response) => {
  try {
    const [loyalty, membership] = await Promise.all([getLoyaltyConfig(), getMembershipConfig()]);
    res.status(200).json({ loyalty, membership });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/** Customer: redeem beans for a reward in the catalogue. */
export const redeemReward = async (req: Request, res: Response) => {
  try {
    const { rewardKey } = req.body;
    const userId = (req as any).user.userId;

    const cfg = await getLoyaltyConfig();
    const reward = cfg.rewards.find((r) => r.key === rewardKey && r.isActive);
    if (!reward) return res.status(404).json({ message: "Reward not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if ((user.beans || 0) < reward.beansCost) {
      return res.status(400).json({ message: "Not enough beans for this reward" });
    }

    user.beans = (user.beans || 0) - reward.beansCost;
    await user.save();

    const io = (req as any).io;

    if (reward.rewardType === "WalletCredit") {
      await applyWalletChange({
        userId,
        amount: reward.rewardValue,
        reason: "Promo",
        description: `Redeemed: ${reward.label}`,
      });
    } else if (reward.rewardType === "Membership" && reward.membershipTier) {
      user.membershipTier = reward.membershipTier as any;
      await user.save();
    }
    // FreeItem rewards issue a one-off voucher concept; recorded via notification for MVP.

    await notify({
      userId,
      type: "RewardUnlocked",
      title: "Reward redeemed 🎉",
      body: `You redeemed "${reward.label}" for ${reward.beansCost} beans.`,
      io,
    });

    const fresh = await User.findById(userId);
    res.status(200).json({ message: "Reward redeemed", user: fresh });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---------------- Admin config ----------------

export const updateLoyaltyConfig = async (req: Request, res: Response) => {
  try {
    const cfg = await LoyaltyConfig.findOneAndUpdate({ singleton: "loyalty" }, req.body, {
      new: true,
      upsert: true,
    });
    res.status(200).json(cfg);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateMembershipConfig = async (req: Request, res: Response) => {
  try {
    const cfg = await MembershipConfig.findOneAndUpdate({ singleton: "membership" }, req.body, {
      new: true,
      upsert: true,
    });
    res.status(200).json(cfg);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
