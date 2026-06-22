"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("../config/db");
const Order_1 = require("../models/Order");
const Coupon_1 = require("../models/Coupon");
const WalletTransaction_1 = require("../models/WalletTransaction");
const Notification_1 = require("../models/Notification");
const InventoryItem_1 = require("../models/InventoryItem");
const StockMovement_1 = require("../models/StockMovement");
const Counter_1 = require("../models/Counter");
const User_1 = require("../models/User");
dotenv_1.default.config();
/**
 * Fresh operational start.
 *  KEEPS:    Branches, Categories, Products, Modifiers, the Admin account,
 *            and config singletons (Settings, Loyalty, Membership).
 *  REMOVES:  Orders, Coupons, Wallet transactions, Notifications, Inventory +
 *            stock movements, bill-number counters, and all customer + delivery
 *            accounts.
 */
const reset = async () => {
    try {
        await (0, db_1.connectDB)();
        console.log("Resetting operational data (keeping branches + menu + admin)...\n");
        const removed = {
            orders: (await Order_1.Order.deleteMany({})).deletedCount || 0,
            coupons: (await Coupon_1.Coupon.deleteMany({})).deletedCount || 0,
            walletTransactions: (await WalletTransaction_1.WalletTransaction.deleteMany({})).deletedCount || 0,
            notifications: (await Notification_1.Notification.deleteMany({})).deletedCount || 0,
            inventoryItems: (await InventoryItem_1.InventoryItem.deleteMany({})).deletedCount || 0,
            stockMovements: (await StockMovement_1.StockMovement.deleteMany({})).deletedCount || 0,
            billCounters: (await Counter_1.Counter.deleteMany({})).deletedCount || 0,
            customersAndPartners: (await User_1.User.deleteMany({ role: { $in: ["customer", "delivery"] } })).deletedCount || 0,
        };
        console.log("Removed:");
        for (const [k, v] of Object.entries(removed))
            console.log(`   ${k}: ${v}`);
        const kept = {
            admins: await User_1.User.countDocuments({ role: "admin" }),
            branches: await (await Promise.resolve().then(() => __importStar(require("../models/Branch")))).Branch.countDocuments(),
            products: await (await Promise.resolve().then(() => __importStar(require("../models/Product")))).Product.countDocuments(),
        };
        console.log("\nKept:");
        console.log(`   admin accounts: ${kept.admins}`);
        console.log(`   branches: ${kept.branches}`);
        console.log(`   products: ${kept.products}`);
        console.log("   (categories, modifiers, settings & loyalty config preserved)\n");
        console.log("Fresh start complete. Bill numbers will restart at 1.");
        process.exit(0);
    }
    catch (error) {
        console.error("Reset failed:", error);
        process.exit(1);
    }
};
reset();
