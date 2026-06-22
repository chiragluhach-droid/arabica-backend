"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
exports.nextSeq = nextSeq;
const mongoose_1 = __importDefault(require("mongoose"));
// Atomic sequence generator (e.g. per-branch bill numbers).
const counterSchema = new mongoose_1.default.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
exports.Counter = mongoose_1.default.model("Counter", counterSchema);
/** Atomically increment and return the next number for a given key. */
async function nextSeq(key) {
    const c = await exports.Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
    return c.seq;
}
