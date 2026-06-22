import mongoose from "mongoose";

// Atomic sequence generator (e.g. per-branch bill numbers).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model("Counter", counterSchema);

/** Atomically increment and return the next number for a given key. */
export async function nextSeq(key: string): Promise<number> {
  const c = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return c.seq;
}
