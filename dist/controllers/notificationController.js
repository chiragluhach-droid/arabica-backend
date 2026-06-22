"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllRead = exports.markRead = exports.getMyNotifications = void 0;
const Notification_1 = require("../models/Notification");
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await Notification_1.Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);
        const unread = await Notification_1.Notification.countDocuments({ user: userId, isRead: false });
        res.status(200).json({ notifications, unread });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getMyNotifications = getMyNotifications;
const markRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        await Notification_1.Notification.findOneAndUpdate({ _id: id, user: userId }, { isRead: true });
        res.status(200).json({ message: "Marked read" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.markRead = markRead;
const markAllRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        await Notification_1.Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
        res.status(200).json({ message: "All marked read" });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.markAllRead = markAllRead;
