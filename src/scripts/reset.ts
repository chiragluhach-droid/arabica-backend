import dotenv from "dotenv";
import { connectDB } from "../config/db";
import { Order } from "../models/Order";
import { Coupon } from "../models/Coupon";
import { WalletTransaction } from "../models/WalletTransaction";
import { Notification } from "../models/Notification";
import { InventoryItem } from "../models/InventoryItem";
import { StockMovement } from "../models/StockMovement";
import { Counter } from "../models/Counter";
import { User } from "../models/User";

dotenv.config();

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
    await connectDB();
    console.log("Resetting operational data (keeping branches + menu + admin)...\n");

    const removed = {
      orders: (await Order.deleteMany({})).deletedCount || 0,
      coupons: (await Coupon.deleteMany({})).deletedCount || 0,
      walletTransactions: (await WalletTransaction.deleteMany({})).deletedCount || 0,
      notifications: (await Notification.deleteMany({})).deletedCount || 0,
      inventoryItems: (await InventoryItem.deleteMany({})).deletedCount || 0,
      stockMovements: (await StockMovement.deleteMany({})).deletedCount || 0,
      billCounters: (await Counter.deleteMany({})).deletedCount || 0,
      customersAndPartners: (await User.deleteMany({ role: { $in: ["customer", "delivery"] } })).deletedCount || 0,
    };

    console.log("Removed:");
    for (const [k, v] of Object.entries(removed)) console.log(`   ${k}: ${v}`);

    const kept = {
      admins: await User.countDocuments({ role: "admin" }),
      branches: await (await import("../models/Branch")).Branch.countDocuments(),
      products: await (await import("../models/Product")).Product.countDocuments(),
    };
    console.log("\nKept:");
    console.log(`   admin accounts: ${kept.admins}`);
    console.log(`   branches: ${kept.branches}`);
    console.log(`   products: ${kept.products}`);
    console.log("   (categories, modifiers, settings & loyalty config preserved)\n");
    console.log("Fresh start complete. Bill numbers will restart at 1.");
    process.exit(0);
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
};

reset();
