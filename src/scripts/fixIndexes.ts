import dotenv from "dotenv";
import { connectDB } from "../config/db";
import { User } from "../models/User";
dotenv.config();

// One-off: reconcile DB indexes with the current schema (e.g. make the unique
// phone index sparse so staff accounts without a phone don't collide).
(async () => {
  await connectDB();
  console.log("Syncing User indexes to match schema...");
  await User.syncIndexes();

  // Clean up obvious test artifacts created during development.
  const res = await User.deleteMany({ username: { $regex: /^(tmp_|dbg|dbgx_)/ } });
  console.log(`Removed ${res.deletedCount} test partner account(s).`);

  const idx = await User.collection.indexes();
  console.log("\n=== USER INDEXES (after sync) ===");
  idx.forEach((i: any) => console.log(i.name, "unique=", !!i.unique, "sparse=", !!i.sparse));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
