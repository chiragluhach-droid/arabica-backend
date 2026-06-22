"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notify = notify;
const Notification_1 = require("../models/Notification");
class StubDriver {
    channel;
    constructor(channel) {
        this.channel = channel;
    }
    async send(to, title, body) {
        // Swap this body for a real provider SDK call later.
        console.log(`[notify:${this.channel}]`, to.email || to.phone || "-", "::", title, "::", body);
    }
}
const drivers = {
    InApp: new StubDriver("InApp"),
    Email: new StubDriver("Email"),
    WhatsApp: new StubDriver("WhatsApp"),
    Push: new StubDriver("Push"),
};
/**
 * Persist an in-app notification and fan out to the requested channels.
 * Always records InApp so it shows in the customer's bell.
 */
async function notify({ userId, type, title, body, channels = ["InApp"], to = {}, io, meta, }) {
    const doc = await Notification_1.Notification.create({ user: userId, type, title, body, meta });
    await Promise.all(channels
        .filter((c) => c !== "InApp")
        .map((c) => drivers[c].send(to, title, body).catch((e) => console.error("notify error", e))));
    if (io) {
        io.to(`user_${userId}`).emit("notification", doc);
    }
    return doc;
}
