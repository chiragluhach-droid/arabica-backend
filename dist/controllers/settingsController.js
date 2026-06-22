"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getPublicSettings = void 0;
const Settings_1 = require("../models/Settings");
// Public — customer app, POS, etc. read GST + which channels are open.
const getPublicSettings = async (_req, res) => {
    try {
        const s = await (0, Settings_1.getSettings)();
        res.status(200).json({
            gstPercent: s.gstPercent,
            posEnabled: s.posEnabled,
            deliveryEnabled: s.deliveryEnabled,
            currency: s.currency,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getPublicSettings = getPublicSettings;
// Admin — update GST + channel toggles.
const updateSettings = async (req, res) => {
    try {
        await (0, Settings_1.getSettings)(); // ensure the singleton exists
        const fields = ["gstPercent", "posEnabled", "deliveryEnabled", "currency"];
        const update = {};
        for (const f of fields)
            if (req.body[f] !== undefined)
                update[f] = req.body[f];
        const s = await Settings_1.Settings.findOneAndUpdate({ singleton: "app" }, update, { new: true });
        res.status(200).json(s);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updateSettings = updateSettings;
