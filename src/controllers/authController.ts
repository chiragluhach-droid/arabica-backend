import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Branch } from "../models/Branch";
import { getSettings } from "../models/Settings";
import { verifyPassword, hashPassword } from "../utils/password";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Simplified login flow (Phone only, no OTP verification for now)
export const loginWithPhone = async (req: Request, res: Response) => {
  try {
    const { phone, name, address } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Customer login is fully separate from management — always a customer account.
    let user = await User.findOne({ phone, role: "customer" });
    if (!user) {
      user = await User.create({
        phone,
        name,
        addresses: address ? [{ type: "Home", fullAddress: address }] : [],
        role: "customer",
      });
    } else {
      // Keep profile up to date on subsequent logins
      if (name && user.name !== name) user.name = name;
      if (address && !user.addresses.some((a) => a.fullAddress === address)) {
        user.addresses.push({ type: "Home", fullAddress: address } as any);
      }
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token, user });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// --- Management logins (fully separate from customers) ---

// Admin: email + password
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: String(email).toLowerCase().trim(), role: "admin" }).select("+password");
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user._id, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
    const safe = user.toObject();
    delete (safe as any).password;
    res.status(200).json({ token, user: safe });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Vendor: select a branch + that branch's password
export const loginVendor = async (req: Request, res: Response) => {
  try {
    const { branchId, password } = req.body;
    if (!branchId || !password) {
      return res.status(400).json({ message: "Branch and password are required" });
    }
    const branch = await Branch.findById(branchId).select("+vendorPassword");
    if (!branch || !verifyPassword(password, branch.vendorPassword)) {
      return res.status(401).json({ message: "Invalid branch password" });
    }
    if (branch.isActive === false) {
      return res.status(403).json({ message: "This branch is inactive" });
    }

    const token = jwt.sign(
      { userId: branch._id, role: "vendor", branch: branch._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    // Shape a "user" object the frontend expects for a vendor session.
    const user = {
      _id: branch._id,
      role: "vendor",
      name: branch.name,
      branch: { _id: branch._id, name: branch.name, slug: branch.slug },
    };
    res.status(200).json({ token, user });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Delivery partner: partner ID (username) + password
export const partnerLogin = async (req: Request, res: Response) => {
  try {
    const { partnerId, password } = req.body;
    if (!partnerId || !password) {
      return res.status(400).json({ message: "Partner ID and password are required" });
    }
    const settings = await getSettings();
    if (!settings.deliveryEnabled) {
      return res.status(403).json({ message: "Delivery is currently disabled by the admin." });
    }
    const user = await User.findOne({ username: String(partnerId).toLowerCase().trim(), role: "delivery" })
      .select("+password")
      .populate("branch", "name slug");
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Invalid partner ID or password" });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: "This account is disabled" });
    }

    const branchId = (user.branch as any)?._id || user.branch;
    const token = jwt.sign({ userId: user._id, role: "delivery", branch: branchId }, JWT_SECRET, { expiresIn: "7d" });
    const safe = user.toObject();
    delete (safe as any).password;
    res.status(200).json({ token, user: safe });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Admin updates their own email / password
export const updateAdminAccount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { email, password, name } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== "admin") return res.status(404).json({ message: "Admin not found" });

    if (email && email.toLowerCase().trim() !== user.email) {
      const taken = await User.findOne({ email: email.toLowerCase().trim() });
      if (taken) return res.status(409).json({ message: "That email is already in use" });
      user.email = email.toLowerCase().trim();
    }
    if (name) user.name = name;
    if (password) user.password = hashPassword(password);
    await user.save();

    const safe = user.toObject();
    delete (safe as any).password;
    res.status(200).json(safe);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    // user is attached by authMiddleware
    const userId = (req as any).user.userId;

    const user = await User.findById(userId).select("-__v").populate("branch", "name slug");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { name, phone, address } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new phone is already taken by another user
    if (phone && phone !== user.phone) {
      const existing = await User.findOne({ phone });
      if (existing) {
        return res.status(400).json({ message: "Phone number is already in use by another account" });
      }
      user.phone = phone;
    }

    if (name) user.name = name;

    // Handle single address update for MVP
    if (address) {
      if (user.addresses.length > 0) {
        user.addresses[0].fullAddress = address;
      } else {
        user.addresses.push({ type: "Home", fullAddress: address } as any);
      }
    }

    await user.save();

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------- Map-based saved addresses -----------------
// Addresses must carry a { lat, lng } location captured from the map picker so
// delivery partners can navigate precisely.

export const addAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { type, fullAddress, location } = req.body;

    if (!fullAddress || !location || location.lat == null || location.lng == null) {
      return res.status(400).json({ message: "A map location (lat/lng) and address are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.push({
      type: type || "Home",
      fullAddress,
      location: { lat: location.lat, lng: location.lng },
    } as any);
    await user.save();

    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { addressId } = req.params;
    const { type, fullAddress, location } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const addr = (user.addresses as any).id(addressId);
    if (!addr) return res.status(404).json({ message: "Address not found" });

    if (type) addr.type = type;
    if (fullAddress) addr.fullAddress = fullAddress;
    if (location && location.lat != null && location.lng != null) {
      addr.location = { lat: location.lat, lng: location.lng };
    }
    await user.save();

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { addressId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const addr = (user.addresses as any).id(addressId);
    if (!addr) return res.status(404).json({ message: "Address not found" });
    addr.deleteOne();
    await user.save();

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
