"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePrinterConfig = exports.getPrinterConfig = exports.getBranchBySlug = exports.getBranches = void 0;
const Branch_1 = require("../models/Branch");
const getBranches = async (req, res) => {
    try {
        const branches = await Branch_1.Branch.find({ isActive: true }).select("-__v");
        res.status(200).json(branches);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getBranches = getBranches;
const getBranchBySlug = async (req, res) => {
    try {
        const branch = await Branch_1.Branch.findOne({ slug: req.params.slug });
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.status(200).json(branch);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getBranchBySlug = getBranchBySlug;
// ---- Printer config (POS settings) ----
function canManageBranch(req, branchId) {
    const u = req.user;
    if (u?.role === "admin")
        return true;
    return u?.role === "vendor" && String(u.branch) === String(branchId);
}
const getPrinterConfig = async (req, res) => {
    try {
        const branchId = String(req.params.branchId);
        if (!canManageBranch(req, branchId))
            return res.status(403).json({ message: "Not authorized for this branch" });
        const branch = await Branch_1.Branch.findById(branchId).select("name address contactNumber printerConfig");
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        res.status(200).json(branch);
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.getPrinterConfig = getPrinterConfig;
const updatePrinterConfig = async (req, res) => {
    try {
        const branchId = String(req.params.branchId);
        if (!canManageBranch(req, branchId))
            return res.status(403).json({ message: "Not authorized for this branch" });
        const branch = await Branch_1.Branch.findById(branchId);
        if (!branch)
            return res.status(404).json({ message: "Branch not found" });
        const fields = ["enabled", "name", "connectionType", "paperWidthMM", "charsPerLine", "deviceName", "header", "footer"];
        const cfg = branch.printerConfig || {};
        for (const f of fields)
            if (req.body[f] !== undefined)
                cfg[f] = req.body[f];
        branch.printerConfig = cfg;
        await branch.save();
        res.status(200).json(branch.get("printerConfig"));
    }
    catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
exports.updatePrinterConfig = updatePrinterConfig;
