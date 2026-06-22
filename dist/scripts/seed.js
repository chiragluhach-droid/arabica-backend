"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const Branch_1 = require("../models/Branch");
const Category_1 = require("../models/Category");
const Modifier_1 = require("../models/Modifier");
const Product_1 = require("../models/Product");
const Order_1 = require("../models/Order");
const Coupon_1 = require("../models/Coupon");
const WalletTransaction_1 = require("../models/WalletTransaction");
const Notification_1 = require("../models/Notification");
const InventoryItem_1 = require("../models/InventoryItem");
const StockMovement_1 = require("../models/StockMovement");
const User_1 = require("../models/User");
const db_1 = require("../config/db");
const password_1 = require("../utils/password");
// --- Management credentials (change after first login) ---
const ADMIN_EMAIL = "admin@arabicacoffee.in";
const ADMIN_PASSWORD = "Admin@123";
// Per-branch vendor passwords (vendor logs in by selecting the branch + this password)
const BRANCH_PASSWORDS = {
    "sector-37": "Faridabad@123",
    "sector-7a": "Faridabad@123",
    "ballabhgarh": "Faridabad@123",
    "sector-10": "Faridabad@123",
    "subharti-university": "Meerut@123",
};
dotenv_1.default.config();
const seedDB = async () => {
    try {
        await (0, db_1.connectDB)();
        // Reconcile indexes with the current schema (keeps unique fields sparse so
        // staff accounts without a phone don't collide).
        await User_1.User.syncIndexes();
        console.log("Clearing all data for a fresh launch (no customers, no partners)...");
        await Promise.all([
            Branch_1.Branch.deleteMany(),
            Category_1.Category.deleteMany(),
            Modifier_1.Modifier.deleteMany(),
            Product_1.Product.deleteMany(),
            Order_1.Order.deleteMany(),
            Coupon_1.Coupon.deleteMany(),
            WalletTransaction_1.WalletTransaction.deleteMany(),
            Notification_1.Notification.deleteMany(),
            InventoryItem_1.InventoryItem.deleteMany(),
            StockMovement_1.StockMovement.deleteMany(),
            // Wipe ALL accounts (customers, vendors-as-users, partners) — management is reseeded below.
            User_1.User.deleteMany({}),
        ]);
        console.log("Creating admin account...");
        await User_1.User.create({
            name: "Administrator",
            email: ADMIN_EMAIL,
            password: (0, password_1.hashPassword)(ADMIN_PASSWORD),
            role: "admin",
        });
        console.log("Seeding Branches (upsert by slug — preserves IDs for existing staff)...");
        const standardDeliveryCharges = [
            { maxDistanceKM: 3, charge: 0 },
            { maxDistanceKM: 6, charge: 30 },
            { maxDistanceKM: 10, charge: 60 },
        ];
        const branchData = [
            {
                name: "Arabica Sector 37",
                slug: "sector-37",
                address: "Huda Market Sector 37, Faridabad",
                location: { lat: 28.4722, lng: 77.3159 },
                contactNumber: "9876543210",
                deliveryRadiusKM: 10,
                deliveryCharges: standardDeliveryCharges,
                openingHours: { open: "09:00", close: "23:00" },
                managerName: "Rahul Sharma",
                city: "Faridabad",
                image: "/images/ARABFBD.png",
                mapUrl: "https://maps.google.com/?q=Huda+Market+Sector+37+Faridabad",
                facilities: ["WiFi", "Workspace", "Parking"],
                coords: { top: "33%", left: "44%" }
            },
            {
                name: "Arabica Sector 7A",
                slug: "sector-7a",
                address: "Huda Market Sector 7A, Faridabad",
                location: { lat: 28.3846, lng: 77.3228 },
                contactNumber: "9876543211",
                deliveryRadiusKM: 10,
                deliveryCharges: standardDeliveryCharges,
                openingHours: { open: "09:00", close: "23:00" },
                managerName: "Priya Mehta",
                city: "Faridabad",
                image: "/images/image.png",
                mapUrl: "https://maps.google.com/?q=Huda+Market+Sector+7A+Faridabad",
                facilities: ["WiFi", "Workspace", "Outdoor Seating", "Parking"],
                coords: { top: "34%", left: "45%" }
            },
            {
                name: "Arabica Ballabhgarh",
                slug: "ballabhgarh",
                address: "Ballabhgarh Huda Market Sector 3, Faridabad",
                location: { lat: 28.3393, lng: 77.3297 },
                contactNumber: "9876543212",
                deliveryRadiusKM: 10,
                deliveryCharges: standardDeliveryCharges,
                openingHours: { open: "09:00", close: "23:00" },
                managerName: "Aman Gupta",
                city: "Faridabad",
                image: "/images/image.png",
                mapUrl: "https://maps.google.com/?q=Ballabhgarh+Huda+Market+Sector+3+Faridabad",
                facilities: ["WiFi", "Parking"],
                coords: { top: "35%", left: "45%" }
            },
            {
                name: "Arabica Sector 10",
                slug: "sector-10",
                address: "Huda Market Sector 10, Faridabad",
                location: { lat: 28.3752, lng: 77.3115 },
                contactNumber: "9876543213",
                deliveryRadiusKM: 10,
                deliveryCharges: standardDeliveryCharges,
                openingHours: { open: "09:00", close: "23:00" },
                managerName: "Neha Verma",
                city: "Faridabad",
                image: "/images/image.png",
                mapUrl: "https://maps.google.com/?q=Huda+Market+Sector+10+Faridabad",
                facilities: ["WiFi", "Workspace", "Parking"],
                coords: { top: "33%", left: "43%" }
            },
            {
                name: "Arabica Subharti University",
                slug: "subharti-university",
                address: "Opposite Subharti University, Meerut",
                location: { lat: 29.0224, lng: 77.6710 },
                contactNumber: "9876543214",
                deliveryRadiusKM: 10,
                deliveryCharges: standardDeliveryCharges,
                openingHours: { open: "09:00", close: "23:00" },
                managerName: "Vikram Singh",
                city: "Meerut",
                image: "/images/image.png",
                mapUrl: "https://maps.google.com/?q=Subharti+University+Meerut",
                facilities: ["WiFi", "Workspace", "Outdoor Seating", "Kids Corner", "Parking"],
                coords: { top: "29%", left: "46%" }
            },
        ];
        const branches = await Promise.all(branchData.map((b) => Branch_1.Branch.findOneAndUpdate({ slug: b.slug }, { ...b, vendorPassword: (0, password_1.hashPassword)(BRANCH_PASSWORDS[b.slug] || "Vendor@123") }, { upsert: true, new: true, setDefaultsOnInsert: true })));
        // Same menu is available at every branch
        const branchIds = branches.map((b) => b._id);
        console.log("Seeding Categories...");
        const categories = await Category_1.Category.insertMany([
            { name: "Hot Coffee", slug: "hot-coffee", order: 1 },
            { name: "Cold Coffee", slug: "cold-coffee", order: 2 },
        ]);
        const cat = {
            hot: categories[0]._id,
            cold: categories[1]._id,
        };
        console.log("Seeding Modifiers...");
        const modifiers = await Modifier_1.Modifier.insertMany([
            {
                name: "Size",
                type: "single",
                isRequired: true,
                options: [
                    { name: "Regular", priceAdjustment: 0, isDefault: true },
                    { name: "Large", priceAdjustment: 40, isDefault: false },
                ],
            },
            {
                name: "Milk",
                type: "single",
                isRequired: true,
                options: [
                    { name: "Whole Milk", priceAdjustment: 0, isDefault: true },
                    { name: "Skimmed Milk", priceAdjustment: 0, isDefault: false },
                    { name: "Oat Milk", priceAdjustment: 60, isDefault: false },
                    { name: "Almond Milk", priceAdjustment: 60, isDefault: false },
                ],
            },
            {
                name: "Extra Shot",
                type: "single",
                isRequired: false,
                options: [
                    { name: "None", priceAdjustment: 0, isDefault: true },
                    { name: "1 Extra Shot", priceAdjustment: 50, isDefault: false },
                    { name: "2 Extra Shots", priceAdjustment: 90, isDefault: false },
                ],
            },
            {
                name: "Sugar Level",
                type: "single",
                isRequired: false,
                options: [
                    { name: "Normal", priceAdjustment: 0, isDefault: true },
                    { name: "Less Sugar", priceAdjustment: 0, isDefault: false },
                    { name: "No Sugar", priceAdjustment: 0, isDefault: false },
                ],
            },
        ]);
        const mod = {
            size: modifiers[0]._id,
            milk: modifiers[1]._id,
            shot: modifiers[2]._id,
            sugar: modifiers[3]._id,
        };
        const coffeeMods = [mod.size, mod.milk, mod.shot, mod.sugar];
        const blackCoffeeMods = [mod.size, mod.shot, mod.sugar];
        console.log("Seeding Products...");
        const productData = [
            // ---------- Hot Coffee ----------
            {
                name: "Espresso",
                description: "A bold, concentrated single shot of our signature Arabica blend.",
                basePrice: 130,
                image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&q=80&w=800",
                category: cat.hot,
                modifiers: blackCoffeeMods,
            },
            {
                name: "Classic Cappuccino",
                description: "Rich espresso topped with deeply frothed, velvety milk foam.",
                basePrice: 190,
                image: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=800",
                category: cat.hot,
                modifiers: coffeeMods,
            },
            {
                name: "Cafe Latte",
                description: "Smooth espresso combined with steamed milk and a light layer of foam.",
                basePrice: 210,
                image: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&q=80&w=800",
                category: cat.hot,
                modifiers: coffeeMods,
            },
            {
                name: "Flat White",
                description: "Double ristretto shots with thin, silky micro-foamed milk.",
                basePrice: 220,
                image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&q=80&w=800",
                category: cat.hot,
                modifiers: coffeeMods,
            },
            {
                name: "Cafe Mocha",
                description: "Espresso, steamed milk and rich Belgian chocolate, topped with cream.",
                basePrice: 240,
                image: "https://images.unsplash.com/photo-1578374173705-969cbe6f2d6b?auto=format&fit=crop&q=80&w=800",
                category: cat.hot,
                modifiers: coffeeMods,
            },
            {
                name: "Hot Americano",
                description: "Espresso shots lengthened with hot water for a clean, smooth cup.",
                basePrice: 160,
                image: "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&q=80&w=800",
                category: cat.hot,
                modifiers: blackCoffeeMods,
            },
            // ---------- Cold Coffee ----------
            {
                name: "Iced Americano",
                description: "Espresso shots topped with cold water and ice. Crisp and refreshing.",
                basePrice: 170,
                image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=800",
                category: cat.cold,
                modifiers: blackCoffeeMods,
            },
            {
                name: "Iced Caramel Macchiato",
                description: "Espresso, milk, vanilla syrup and caramel drizzle poured over ice.",
                basePrice: 250,
                image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800",
                category: cat.cold,
                modifiers: coffeeMods,
            },
            {
                name: "Cold Brew",
                description: "Steeped for 18 hours for a naturally sweet, ultra-smooth cold coffee.",
                basePrice: 230,
                image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800",
                category: cat.cold,
                modifiers: blackCoffeeMods,
            },
            {
                name: "Classic Frappe",
                description: "Blended iced coffee with milk and a generous swirl of whipped cream.",
                basePrice: 270,
                image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&q=80&w=800",
                category: cat.cold,
                modifiers: coffeeMods,
            },
            {
                name: "Iced Latte",
                description: "Chilled espresso and milk over ice — simple, smooth and refreshing.",
                basePrice: 220,
                image: "https://images.unsplash.com/photo-1517959105821-eaf2591984ca?auto=format&fit=crop&q=80&w=800",
                category: cat.cold,
                modifiers: coffeeMods,
            },
        ];
        // Every product is available at every branch (same menu chain-wide)
        await Product_1.Product.insertMany(productData.map((p) => ({ ...p, branchAvailability: branchIds })));
        console.log("Seeding Inventory (raw materials per branch)...");
        // Realistic mix incl. a couple of low/out items so the screens show every state.
        const inventoryTemplate = [
            { name: "Arabica Coffee Beans", category: "Beans", unit: "kg", currentStock: 14, lowStockThreshold: 5, costPerUnit: 850 },
            { name: "Whole Milk", category: "Dairy", unit: "L", currentStock: 22, lowStockThreshold: 10, costPerUnit: 60 },
            { name: "Oat Milk", category: "Dairy", unit: "L", currentStock: 5, lowStockThreshold: 6, costPerUnit: 180 }, // low
            { name: "Almond Milk", category: "Dairy", unit: "L", currentStock: 8, lowStockThreshold: 4, costPerUnit: 200 },
            { name: "Sugar", category: "Other", unit: "kg", currentStock: 9, lowStockThreshold: 3, costPerUnit: 45 },
            { name: "Chocolate Syrup", category: "Syrups", unit: "L", currentStock: 2, lowStockThreshold: 3, costPerUnit: 320 }, // low
            { name: "Vanilla Syrup", category: "Syrups", unit: "L", currentStock: 6, lowStockThreshold: 2, costPerUnit: 300 },
            { name: "Caramel Syrup", category: "Syrups", unit: "L", currentStock: 0, lowStockThreshold: 2, costPerUnit: 300 }, // out
            { name: "Paper Cups (Medium)", category: "Packaging", unit: "pcs", currentStock: 340, lowStockThreshold: 100, costPerUnit: 3 },
            { name: "Paper Cups (Large)", category: "Packaging", unit: "pcs", currentStock: 80, lowStockThreshold: 100, costPerUnit: 4 }, // low
            { name: "Cup Lids", category: "Packaging", unit: "pcs", currentStock: 520, lowStockThreshold: 150, costPerUnit: 2 },
            { name: "Croissants", category: "Bakery", unit: "pcs", currentStock: 16, lowStockThreshold: 10, costPerUnit: 35 },
            { name: "Cookies", category: "Bakery", unit: "pcs", currentStock: 42, lowStockThreshold: 15, costPerUnit: 25 },
        ];
        const inventoryDocs = branches.flatMap((b) => inventoryTemplate.map((t) => ({ ...t, branch: b._id })));
        const createdItems = await InventoryItem_1.InventoryItem.insertMany(inventoryDocs);
        // Seed an opening-stock movement per item so the audit ledger isn't empty.
        await StockMovement_1.StockMovement.insertMany(createdItems
            .filter((i) => i.currentStock > 0)
            .map((i) => ({ item: i._id, branch: i.branch, type: "restock", quantityChange: i.currentStock, balanceAfter: i.currentStock, note: "Opening stock" })));
        console.log(`\nDatabase seeded successfully! ${branches.length} branches, ${categories.length} categories, ${productData.length} products, ${createdItems.length} inventory items.`);
        console.log("\n========== MANAGEMENT CREDENTIALS (login at /management) ==========");
        console.log(`ADMIN   →  email: ${ADMIN_EMAIL}   password: ${ADMIN_PASSWORD}`);
        console.log("VENDORS →  (select branch on /management, then enter password)");
        branches.forEach((b) => {
            console.log(`   ${b.name}  [${b.slug}]  password: ${BRANCH_PASSWORDS[b.slug]}`);
        });
        console.log("DELIVERY PARTNERS → none (add them yourself from Admin → Partners)");
        console.log("===================================================================\n");
        process.exit(0);
    }
    catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
};
seedDB();
