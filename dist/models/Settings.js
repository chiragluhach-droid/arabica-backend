"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
exports.getSettings = getSettings;
const mongoose_1 = __importDefault(require("mongoose"));
// Single global app-settings document (admin-editable).
const settingsSchema = new mongoose_1.default.Schema({
    singleton: { type: String, default: "app", unique: true },
    gstPercent: { type: Number, default: 5 },
    // Operating channels:
    //  - posEnabled: in-store POS billing (vendor POS screen)
    //  - deliveryEnabled: online channel — customer ordering + KDS + delivery partners
    posEnabled: { type: Boolean, default: true },
    deliveryEnabled: { type: Boolean, default: true },
    currency: { type: String, default: "INR" },
}, { timestamps: true });
exports.Settings = mongoose_1.default.model("Settings", settingsSchema);
async function getSettings() {
    let s = await exports.Settings.findOne({ singleton: "app" });
    if (!s)
        s = await exports.Settings.create({ singleton: "app" });
    return s;
}
