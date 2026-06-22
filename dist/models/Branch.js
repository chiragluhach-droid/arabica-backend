"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Branch = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const branchSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    contactNumber: { type: String, required: true },
    deliveryRadiusKM: { type: Number, default: 10 },
    deliveryCharges: [
        {
            maxDistanceKM: Number,
            charge: Number,
        },
    ],
    openingHours: {
        open: String, // e.g. "08:00"
        close: String, // e.g. "23:00"
    },
    isActive: { type: Boolean, default: true },
    managerName: { type: String },
    // Vendor (branch staff) login password
    vendorPassword: { type: String, select: false },
    // Rich metadata fields
    city: { type: String },
    image: { type: String },
    mapUrl: { type: String },
    facilities: [{ type: String }],
    coords: {
        top: String,
        left: String
    },
    // Receipt printer config (one per branch). connectionType is abstracted so
    // USB/WiFi printers can be supported later without changing the POS flow.
    printerConfig: {
        enabled: { type: Boolean, default: false },
        name: { type: String },
        connectionType: { type: String, enum: ["bluetooth", "usb", "wifi"], default: "bluetooth" },
        paperWidthMM: { type: Number, default: 58 },
        charsPerLine: { type: Number, default: 32 },
        deviceName: { type: String }, // remembered device label for reconnect
        header: { type: String }, // optional extra header line (e.g. GSTIN/phone)
        footer: { type: String, default: "Thank you! Visit again." },
    }
}, { timestamps: true });
exports.Branch = mongoose_1.default.model("Branch", branchSchema);
