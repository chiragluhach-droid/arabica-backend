import { Request, Response } from "express";
import { Branch } from "../models/Branch";

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = await Branch.find({ isActive: true }).select("-__v");
    res.status(200).json(branches);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getBranchBySlug = async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findOne({ slug: req.params.slug });
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    res.status(200).json(branch);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ---- Printer config (POS settings) ----

function canManageBranch(req: Request, branchId: string): boolean {
  const u = (req as any).user;
  if (u?.role === "admin") return true;
  return u?.role === "vendor" && String(u.branch) === String(branchId);
}

export const getPrinterConfig = async (req: Request, res: Response) => {
  try {
    const branchId = String(req.params.branchId);
    if (!canManageBranch(req, branchId)) return res.status(403).json({ message: "Not authorized for this branch" });
    const branch = await Branch.findById(branchId).select("name address contactNumber printerConfig");
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.status(200).json(branch);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updatePrinterConfig = async (req: Request, res: Response) => {
  try {
    const branchId = String(req.params.branchId);
    if (!canManageBranch(req, branchId)) return res.status(403).json({ message: "Not authorized for this branch" });
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    const fields = ["enabled", "name", "connectionType", "paperWidthMM", "charsPerLine", "deviceName", "header", "footer"];
    const cfg: any = (branch as any).printerConfig || {};
    for (const f of fields) if (req.body[f] !== undefined) cfg[f] = req.body[f];
    (branch as any).printerConfig = cfg;
    await branch.save();
    res.status(200).json(branch.get("printerConfig"));
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
