import { Notification } from "../models/Notification";

// Channel abstraction. Each channel is a no-op stub today (logs + persists),
// so external providers (Resend/Nodemailer, Twilio/Gupshup WhatsApp, Web Push)
// can be slotted in later by implementing `send` — callers never change.

export type NotificationChannel = "InApp" | "Email" | "WhatsApp" | "Push";

export type NotificationType =
  | "OrderUpdate"
  | "Coupon"
  | "Birthday"
  | "RewardUnlocked"
  | "FlashSale"
  | "MembershipUpgrade"
  | "LowStock";

interface ChannelDriver {
  readonly channel: NotificationChannel;
  send(to: { email?: string; phone?: string }, title: string, body: string): Promise<void>;
}

class StubDriver implements ChannelDriver {
  constructor(public readonly channel: NotificationChannel) {}
  async send(to: { email?: string; phone?: string }, title: string, body: string) {
    // Swap this body for a real provider SDK call later.
    console.log(`[notify:${this.channel}]`, to.email || to.phone || "-", "::", title, "::", body);
  }
}

const drivers: Record<NotificationChannel, ChannelDriver> = {
  InApp: new StubDriver("InApp"),
  Email: new StubDriver("Email"),
  WhatsApp: new StubDriver("WhatsApp"),
  Push: new StubDriver("Push"),
};

interface NotifyArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  to?: { email?: string; phone?: string };
  io?: any; // socket.io server, optional, for live in-app toast
  meta?: Record<string, unknown>;
}

/**
 * Persist an in-app notification and fan out to the requested channels.
 * Always records InApp so it shows in the customer's bell.
 */
export async function notify({
  userId,
  type,
  title,
  body,
  channels = ["InApp"],
  to = {},
  io,
  meta,
}: NotifyArgs) {
  const doc = await Notification.create({ user: userId, type, title, body, meta });

  await Promise.all(
    channels
      .filter((c) => c !== "InApp")
      .map((c) => drivers[c].send(to, title, body).catch((e) => console.error("notify error", e)))
  );

  if (io) {
    io.to(`user_${userId}`).emit("notification", doc);
  }

  return doc;
}
