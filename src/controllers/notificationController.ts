import { Request, Response } from "express";
import { Notification } from "../models/Notification";

export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    const unread = await Notification.countDocuments({ user: userId, isRead: false });
    res.status(200).json({ notifications, unread });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    await Notification.findOneAndUpdate({ _id: id, user: userId }, { isRead: true });
    res.status(200).json({ message: "Marked read" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
    res.status(200).json({ message: "All marked read" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
