import { Request, Response } from "express";
import { User } from "../models/User";
import { WalletTransaction } from "../models/WalletTransaction";

export const getMyWallet = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const [user, transactions] = await Promise.all([
      User.findById(userId).select("walletBalance beans membershipTier"),
      WalletTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
    ]);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({
      balance: user.walletBalance || 0,
      beans: user.beans || 0,
      membershipTier: user.membershipTier,
      transactions,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
