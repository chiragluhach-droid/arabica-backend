"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("../config/db");
const User_1 = require("../models/User");
dotenv_1.default.config();
// One-off: reconcile DB indexes with the current schema (e.g. make the unique
// phone index sparse so staff accounts without a phone don't collide).
(async () => {
    await (0, db_1.connectDB)();
    console.log("Syncing User indexes to match schema...");
    await User_1.User.syncIndexes();
    // Clean up obvious test artifacts created during development.
    const res = await User_1.User.deleteMany({ username: { $regex: /^(tmp_|dbg|dbgx_)/ } });
    console.log(`Removed ${res.deletedCount} test partner account(s).`);
    const idx = await User_1.User.collection.indexes();
    console.log("\n=== USER INDEXES (after sync) ===");
    idx.forEach((i) => console.log(i.name, "unique=", !!i.unique, "sparse=", !!i.sparse));
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
