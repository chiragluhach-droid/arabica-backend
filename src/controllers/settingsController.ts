import { Request, Response } from "express";
import { Settings, getSettings } from "../models/Settings";

// Public — customer app, POS, etc. read GST + which channels are open.
export const getPublicSettings = async (_req: Request, res: Response) => {
  try {
    const s = await getSettings();
    res.status(200).json({
      gstPercent: s.gstPercent,
      posEnabled: s.posEnabled,
      deliveryEnabled: s.deliveryEnabled,
      currency: s.currency,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Admin — update GST + channel toggles.
export const updateSettings = async (req: Request, res: Response) => {
  try {
    await getSettings(); // ensure the singleton exists
    const fields = ["gstPercent", "posEnabled", "deliveryEnabled", "currency"];
    const update: Record<string, unknown> = {};
    for (const f of fields) if (req.body[f] !== undefined) update[f] = req.body[f];

    const s = await Settings.findOneAndUpdate({ singleton: "app" }, update, { new: true });
    res.status(200).json(s);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
